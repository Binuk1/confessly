const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// ===== Helper Functions =====

/**
 * Extracts and normalizes IP address from request
 */
function getIPAddress(context) {
  let ip = context.rawRequest.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           context.rawRequest.headers['x-real-ip'] ||
           context.rawRequest.ip ||
           context.rawRequest.connection?.remoteAddress ||
           'unknown';
  
  // Remove IPv4-mapped IPv6 prefix
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  return ip.toLowerCase();
}

/**
 * Checks if an IP is currently banned for a specific action
 */
async function checkIPBan(ip, actionType) {
  if (!ip || ip === 'unknown') {
    return { isBanned: false };
  }

  try {
    const now = new Date();
    
    // Query for active bans
    const banQuery = await db.collection('bannedIPs')
      .where('ip', '==', ip)
      .where('isActive', '==', true)
      .where('expiresAt', '>', now)
      .get();

    if (banQuery.empty) {
      return { isBanned: false };
    }

    // Check if any ban applies to this action type
    for (const doc of banQuery.docs) {
      const ban = doc.data();
      
      // For site-wide bans, they apply to everything
      if (ban.banType === 'site') {
        console.log(`🚫 SITE BAN: IP ${ip} blocked from entire site`);
        return {
          isBanned: true,
          reason: ban.reason || 'Violation of community guidelines',
          expiresAt: ban.expiresAt,
          banType: ban.banType
        };
      }
      
      // For specific bans, check if they match the action
      if (ban.banType === 'both' || ban.banType === actionType) {
        console.log(`🚫 ACTION BAN: IP ${ip} blocked from ${actionType}`);
        return {
          isBanned: true,
          reason: ban.reason || 'Violation of community guidelines',
          expiresAt: ban.expiresAt,
          banType: ban.banType
        };
      }
    }

    return { isBanned: false };
  } catch (error) {
    console.error('❌ Error checking IP ban:', error);
    return { isBanned: false };
  }
}

/**
 * Format Firestore timestamp for frontend - FIXED VERSION
 * Returns ISO string that can be easily parsed by frontend
 */
function formatExpiresAt(expiresAt) {
  if (!expiresAt) return null;
  
  try {
    let date;
    
    if (expiresAt.toDate && typeof expiresAt.toDate === 'function') {
      // Firestore Timestamp object
      date = expiresAt.toDate();
    } else if (expiresAt instanceof Date) {
      // Already a Date object
      date = expiresAt;
    } else if (expiresAt._seconds) {
      // Firestore Timestamp internal format
      date = new Date(expiresAt._seconds * 1000);
    } else if (typeof expiresAt === 'string' || typeof expiresAt === 'number') {
      // String or number timestamp
      date = new Date(expiresAt);
    } else {
      console.log('Unknown expiresAt format:', typeof expiresAt, expiresAt);
      return null;
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.log('Invalid date:', date);
      return null;
    }
    
    // Return ISO string for consistent frontend parsing
    return date.toISOString();
    
  } catch (error) {
    console.error('Error formatting expiresAt:', error, expiresAt);
    return null;
  }
}

// ===== Cloud Functions =====

/**
 * Checks if an IP is banned from entire site
 */
exports.checkSiteBan = functions.https.onCall(async (data, context) => {
  const ip = getIPAddress(context);
  console.log('🔍 Checking site-wide ban for IP:', ip);
  
  const banCheck = await checkIPBan(ip, 'site');
  
  // Debug log to see what we're returning
  console.log('📝 Site ban result:', {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAtRaw: banCheck.expiresAt,
    expiresAtFormatted: formatExpiresAt(banCheck.expiresAt),
    banType: banCheck.banType
  });
  
  return {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAt: formatExpiresAt(banCheck.expiresAt), // Now returns ISO string
    banType: banCheck.banType,
    ip: ip
  };
});

/**
 * Checks if an IP is banned before allowing confession creation
 */
exports.checkConfessionBan = functions.https.onCall(async (data, context) => {
  const ip = getIPAddress(context);
  console.log('🔍 Checking confession ban for IP:', ip);
  
  const banCheck = await checkIPBan(ip, 'confess');
  
  console.log('📝 Confession ban result:', {
    isBanned: banCheck.isBanned,
    expiresAtFormatted: formatExpiresAt(banCheck.expiresAt)
  });
  
  return {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAt: formatExpiresAt(banCheck.expiresAt), // Now returns ISO string
    banType: banCheck.banType,
    ip: ip
  };
});

/**
 * Checks if an IP is banned before allowing reply creation
 */
exports.checkReplyBan = functions.https.onCall(async (data, context) => {
  const ip = getIPAddress(context);
  console.log('🔍 Checking reply ban for IP:', ip);
  
  const banCheck = await checkIPBan(ip, 'reply');
  
  console.log('📝 Reply ban result:', {
    isBanned: banCheck.isBanned,
    expiresAtFormatted: formatExpiresAt(banCheck.expiresAt)
  });
  
  return {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAt: formatExpiresAt(banCheck.expiresAt), // Now returns ISO string
    banType: banCheck.banType,
    ip: ip
  };
});

/**
 * Logs IP address when a confession is created
 */
exports.logConfessionIp = functions.https.onCall(async (data, context) => {
  const { confessionId } = data;
  const ip = getIPAddress(context);

  if (!confessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Confession ID is required');
  }
  
  try {
    const batch = db.batch();
    const confessionRef = db.collection('confessions').doc(confessionId);
    batch.update(confessionRef, {
      ipAddress: ip,
      ipLoggedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const ipLogRef = db.collection('ipLogs').doc();
    batch.set(ipLogRef, {
      ip,
      type: 'confession',
      confessionId: confessionId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: context.rawRequest.headers['user-agent'] || 'unknown'
    });
    
    await batch.commit();
    console.log('✅ Logged confession IP:', ip);
    return { success: true, ip };
  } catch (error) {
    console.error('❌ Error logging confession IP:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Logs IP address when a reply is created
 */
exports.logReplyIp = functions.https.onCall(async (data, context) => {
  const { confessionId, replyId } = data;
  const ip = getIPAddress(context);

  if (!confessionId || !replyId) {
    throw new functions.https.HttpsError('invalid-argument', 'Confession ID and Reply ID are required');
  }
  
  try {
    const batch = db.batch();
    const replyRef = db.collection('confessions').doc(confessionId).collection('replies').doc(replyId);
    batch.update(replyRef, {
      ipAddress: ip,
      ipLoggedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const ipLogRef = db.collection('ipLogs').doc();
    batch.set(ipLogRef, {
      ip,
      type: 'reply',
      confessionId: confessionId,
      replyId: replyId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: context.rawRequest.headers['user-agent'] || 'unknown'
    });
    
    await batch.commit();
    console.log('✅ Logged reply IP:', ip);
    return { success: true, ip };
  } catch (error) {
    console.error('❌ Error logging reply IP:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Cleanup expired bans (run daily via Cloud Scheduler)
 */
exports.cleanupExpiredBans = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = new Date();
    try {
      const expiredBans = await db.collection('bannedIPs')
        .where('expiresAt', '<=', now)
        .where('isActive', '==', true)
        .get();
      
      const batch = db.batch();
      expiredBans.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          expiredAutomatically: true
        });
      });
      
      await batch.commit();
      console.log(`✅ Cleaned up ${expiredBans.size} expired bans`);
      return null;
    } catch (error) {
      console.error('❌ Error cleaning up expired bans:', error);
      return null;
    }
  });