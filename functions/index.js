const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();

// Create a CORS middleware instance
const corsHandler = cors({ origin: true });

// Get Gemini API key from Firebase config
const GEMINI_API_KEY = functions.config().gemini?.api_key || '';

if (!GEMINI_API_KEY) {
  console.warn('⚠️ WARNING: No GEMINI_API_KEY found in Firebase config');
} else {
  console.log('✅ Gemini API key loaded successfully');
}

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

/**
 * Fallback moderation using regex patterns
 * More lenient pattern matching without word boundaries
 */
function fallbackModeration(text) {
  // Comprehensive profanity list with case-insensitive matching
  // Using looser matching to catch variations and typos
  const profanityPatterns = [
    /f+u+c+k+/i,
    /s+h+i+t+/i,
    /b+i+t+c+h+/i,
    /a+s+s+h+o+l+e+/i,
    /c+u+n+t+/i,
    /d+i+c+k+/i,
    /p+u+s+s+y+/i,
    /w+h+o+r+e+/i,
    /s+l+u+t+/i,
    /d+a+m+n+/i,
    /h+e+l+l+/i,
    /b+a+s+t+a+r+d+/i,
    /n+i+g+g+/i,  // Catches n-word variants
    /f+a+g+/i,    // Homophobic slur
    /r+e+t+a+r+d+/i,
    /k+i+l+l+\s+(you|yourself|myself)/i,  // Violent threats
    /d+i+e+\s+(you|yourself|bitch)/i
  ];
  
  // Check against all patterns
  const hasViolation = profanityPatterns.some(pattern => pattern.test(text));
  
  if (hasViolation) {
    console.log('🚫 Fallback moderation: Content flagged as NSFW');
    return {
      isNSFW: true,
      issues: [{
        type: 'explicit_content',
        severity: 'high',
        text: 'Content contains explicit or inappropriate language'
      }],
      categories: {},
      isClean: false,
      usedFallback: true
    };
  }
  
  console.log('✅ Fallback moderation: Content appears clean');
  return {
    isNSFW: false,
    issues: [],
    categories: {},
    isClean: true,
    usedFallback: true
  };
}

// ===== Content Moderation Functions =====

/**
 * Moderate content using Gemini AI
 * AI-powered NSFW detection with intelligent understanding
 */
exports.moderateContent = functions.https.onCall(async (data, context) => {
  const { text, contentType = 'confession' } = data;
  
  // Input validation
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      isNSFW: false,
      issues: [],
      categories: {},
      isClean: true
    };
  }

  // Check for API key
  if (!GEMINI_API_KEY) {
    console.error('❌ CRITICAL: GEMINI_API_KEY not configured!');
    console.error('Please set it with: firebase functions:config:set gemini.api_key="YOUR_KEY"');
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Content moderation service is not configured. Please contact support.'
    );
  }

  try {
    // Enhanced AI prompt - let AI use its full knowledge
    const prompt = `You are an expert content moderator with deep understanding of language, context, and internet culture.

Analyze if this text is NSFW (Not Safe For Work). Use your full knowledge to detect:
- Profanity in ANY form (including leetspeak like "f4ck", intentional misspellings like "fuk", character substitutions)
- Slurs and hate speech (including coded versions with numbers/symbols like "n1gger")
- Sexual or explicit content
- Violence or threats
- Harassment or bullying
- Any attempt to bypass filters (spacing, symbols, creative spelling)

Be thorough - catch obvious attempts to hide inappropriate language with numbers, symbols, or creative spelling.

Text to analyze: "${text}"

You MUST respond with ONLY valid JSON in exactly this format (no extra text, no markdown):
{"isNSFW": true, "reason": "detected profanity: f-word variant"}

OR

{"isNSFW": false, "reason": "content appears appropriate"}`;
    
    // Try multiple models in order of preference
    const modelsToTry = [
      'gemini-2.0-flash-exp',      // Latest experimental
      'gemini-1.5-flash-002',       // Stable with version
      'gemini-1.5-flash-001',       // Older stable
      'gemini-1.5-flash',           // Auto-updated alias
      'gemini-2.0-flash-thinking-exp-01-21', // Another experimental
      'gemini-pro'                  // Legacy fallback
    ];
    
    let lastError = null;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`🤖 Trying model: ${modelName}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 100
            }
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          lastError = `Model ${modelName} returned ${response.status}: ${errorBody}`;
          console.warn(`⚠️ ${lastError}`);
          continue; // Try next model
        }

        const result = await response.json();
        const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log(`✅ Successfully used model: ${modelName}`);
        console.log('🤖 Raw AI response:', responseText);
        
        // Parse the response with robust error handling
        try {
          // Clean up the response aggressively
          let cleaned = responseText.trim();
          
          // Remove any markdown
          cleaned = cleaned.replace(/```json/gi, '');
          cleaned = cleaned.replace(/```/g, '');
          cleaned = cleaned.trim();
          
          // Extract JSON if there's extra text
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleaned = jsonMatch[0];
          }
          
          console.log('🧹 Cleaned response:', cleaned);
          
          const moderationResult = JSON.parse(cleaned);
          
          // Validate response structure
          if (typeof moderationResult.isNSFW !== 'boolean') {
            throw new Error(`Invalid AI response: isNSFW is ${typeof moderationResult.isNSFW}, expected boolean`);
          }
          
          console.log(`✅ AI Decision: ${moderationResult.isNSFW ? '🚫 NSFW' : '✅ Clean'}`);
          console.log(`   Reason: ${moderationResult.reason}`);
          console.log(`   Model used: ${modelName}`);
          
          // Return standardized response
          return {
            isNSFW: Boolean(moderationResult.isNSFW),
            issues: moderationResult.isNSFW ? [{
              type: 'explicit_content',
              severity: 'high',
              text: moderationResult.reason || 'Content flagged as NSFW by AI'
            }] : [],
            categories: {},
            isClean: !moderationResult.isNSFW,
            aiPowered: true,
            modelUsed: modelName
          };
          
        } catch (parseError) {
          console.error(`❌ Failed to parse response from ${modelName}:`, parseError.message);
          console.error('📝 Response was:', responseText);
          lastError = `Parse error with ${modelName}: ${parseError.message}`;
          continue; // Try next model
        }
      } catch (modelError) {
        lastError = `Error with ${modelName}: ${modelError.message}`;
        console.warn(`⚠️ ${lastError}`);
        continue; // Try next model
      }
    }
    
    // If we get here, all models failed
    console.error('❌ All models failed. Last error:', lastError);
    throw new Error(`All Gemini models failed. Last error: ${lastError}`);

  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    
    // Check if it's an API key issue
    if (error.message?.includes('API_KEY') || error.message?.includes('apiKey') || error.message?.includes('403')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Invalid API key. Please check Gemini API configuration.'
      );
    }
    
    // For other errors, rethrow
    throw new functions.https.HttpsError(
      'internal',
      `Content moderation service error: ${error.message}`
    );
  }
});

/**
 * Update moderation status for a confession (Callable function with CORS)
 */
exports.updateConfessionModeration = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    cors(req, res, () => {
      res.status(200).send();
    });
    return;
  }

  return cors(req, res, async () => {
    try {
      const { confessionId, isNSFW, issues } = req.body;
      
      if (!confessionId) {
        return res.status(400).json({
          error: {
            code: 'invalid-argument',
            message: 'Missing required confessionId'
          }
        });
      }

      const confessionRef = db.collection('confessions').doc(confessionId);
      await confessionRef.update({
        'moderation.isNSFW': isNSFW || false,
        'moderation.issues': issues || [],
        'moderation.updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating confession moderation:', error);
      return res.status(500).json({
        error: {
          code: 'internal',
          message: 'Failed to update confession moderation',
          details: error.message
        }
      });
    }
  });
});

/**
 * Update moderation status for a reply (HTTP endpoint)
 */
exports.updateReplyModeration = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { confessionId, replyId, isNSFW, issues } = req.body;
    
    if (!confessionId || !replyId) {
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        success: false,
        error: {
          code: 'invalid-argument',
          message: 'Missing required confessionId or replyId'
        }
      });
      return;
    }

    const replyRef = db.collection('confessions').doc(confessionId).collection('replies').doc(replyId);
    await replyRef.update({
      'moderation.isNSFW': isNSFW || false,
      'moderation.issues': issues || [],
      'moderation.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Updated moderation for reply ${replyId} in confession ${confessionId}`);

    // Send success response
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      success: true,
      data: {
        replyId,
        confessionId,
        isNSFW: isNSFW || false,
        issues: issues || []
      }
    });
  } catch (error) {
    console.error('❌ Error updating reply moderation:', error);

    // Send error response
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to update reply moderation',
        details: error.message
      }
    });
  }
});

/**
 * Update reply count for a confession (HTTP endpoint)
 */
exports.updateReplyCount = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { confessionId, increment = true } = req.body;
    
    if (!confessionId) {
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        success: false,
        error: {
          code: 'invalid-argument',
          message: 'Missing required confessionId'
        }
      });
      return;
    }

    const confessionRef = db.collection('confessions').doc(confessionId);
    await confessionRef.update({
      'stats.replyCount': admin.firestore.FieldValue.increment(increment ? 1 : -1),
      'stats.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Updated reply count for confession ${confessionId}`);

    // Send success response
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      success: true,
      data: {
        confessionId,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error updating reply count:', error);

    // Send error response
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to update reply count',
        details: error.message
      }
    });
  }
});

/**
 * Delete a confession and all its replies
 */
exports.deleteConfession = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated and has staff role
  if (!context.auth || !context.auth.token.staff) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only staff members can delete content'
    );
  }

  const { confessionId } = data;
  if (!confessionId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Confession ID is required'
    );
  }

  try {
    const batch = db.batch();
    const confessionRef = db.collection('confessions').doc(confessionId);
    
    // Delete all replies first
    const repliesSnapshot = await confessionRef.collection('replies').get();
    repliesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Then delete the confession
    batch.delete(confessionRef);
    
    await batch.commit();
    
    // Log the deletion
    await db.collection('moderationLogs').add({
      action: 'delete_confession',
      targetId: confessionId,
      staffId: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: getIPAddress(context)
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting confession:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete confession',
      error.message
    );
  }
});

/**
 * Delete a single reply
 */
exports.deleteReply = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated and has staff role
  if (!context.auth || !context.auth.token.staff) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only staff members can delete content'
    );
  }

  const { confessionId, replyId } = data;
  if (!confessionId || !replyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Both confession ID and reply ID are required'
    );
  }

  try {
    const replyRef = db.collection('confessions')
      .doc(confessionId)
      .collection('replies')
      .doc(replyId);

    await replyRef.delete();
    
    // Log the deletion
    await db.collection('moderationLogs').add({
      action: 'delete_reply',
      targetId: replyId,
      confessionId: confessionId,
      staffId: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: getIPAddress(context)
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting reply:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete reply',
      error.message
    );
  }
});

// ===== IP Ban Functions =====

/**
 * Checks if an IP is banned from entire site
 */
exports.checkSiteBan = functions.https.onCall(async (data, context) => {
  const ip = getIPAddress(context);
  console.log('🔍 Checking site-wide ban for IP:', ip);
  
  const banCheck = await checkIPBan(ip, 'site');
  
  console.log('🔍 Site ban result:', {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAtRaw: banCheck.expiresAt,
    expiresAtFormatted: formatExpiresAt(banCheck.expiresAt),
    banType: banCheck.banType
  });
  
  return {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAt: formatExpiresAt(banCheck.expiresAt),
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
  
  console.log('🔍 Confession ban result:', {
    isBanned: banCheck.isBanned,
    expiresAtFormatted: formatExpiresAt(banCheck.expiresAt)
  });
  
  return {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAt: formatExpiresAt(banCheck.expiresAt),
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
  
  console.log('🔍 Reply ban result:', {
    isBanned: banCheck.isBanned,
    expiresAtFormatted: formatExpiresAt(banCheck.expiresAt)
  });
  
  return {
    isBanned: banCheck.isBanned,
    reason: banCheck.reason,
    expiresAt: formatExpiresAt(banCheck.expiresAt),
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
/**
 * Update reaction for a confession
 */
exports.updateReaction = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { confessionId, emoji, userId } = req.body;
    
    if (!confessionId || !emoji || !userId) {
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        success: false,
        error: {
          code: 'invalid-argument',
          message: 'Missing required fields: confessionId, emoji, or userId'
        }
      });
      return;
    }

    const confessionRef = db.collection('confessions').doc(confessionId);
    
    // Run in a transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      const confessionDoc = await transaction.get(confessionRef);
      
      if (!confessionDoc.exists) {
        throw new Error('Confession not found');
      }
      
      const confessionData = confessionDoc.data();
      const reactions = confessionData.reactions || {};
      const userReactions = {};
      
      // Find and remove any existing reaction from this user
      Object.entries(reactions).forEach(([emojiKey, users]) => {
        if (Array.isArray(users)) {
          const filteredUsers = users.filter(user => user.userId !== userId);
          if (filteredUsers.length > 0) {
            userReactions[emojiKey] = filteredUsers;
          }
        }
      });
      
      // Add the new reaction if it's not the same as the existing one
      if (!reactions[emoji] || !reactions[emoji].some(r => r.userId === userId)) {
        if (!userReactions[emoji]) {
          userReactions[emoji] = [];
        }
        userReactions[emoji].push({
          userId,
          timestamp: new Date().toISOString() // Use client-side timestamp for array elements
        });
      }
      
      // Update the confession with the new reactions
      transaction.update(confessionRef, {
        reactions: userReactions,
        'stats.updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Send success response
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      success: true,
      data: {
        confessionId,
        emoji,
        userId
      }
    });
    
  } catch (error) {
    console.error('Error updating reaction:', error);
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      success: false,
      error: {
        code: 'internal',
        message: error.message || 'An error occurred while updating the reaction'
      }
    });
  }
});

/**
 * Submit a content report
 */
exports.submitReport = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { 
      contentId, 
      contentType, 
      contentText, 
      reason, 
      otherReason, 
      userAgent, 
      reportedFrom,
      confessionId
    } = req.body;
    
    // Validate required fields
    if (!contentId || !contentType || !reason) {
      res.set('Access-Control-Allow-Origin', '*');
      res.status(400).json({
        success: false,
        error: {
          code: 'invalid-argument',
          message: 'Missing required fields: contentId, contentType, or reason'
        }
      });
      return;
    }

    // Create the report document
    const reportData = {
      contentId,
      contentType,
      contentText: contentText ? contentText.substring(0, 200) : '',
      reason,
      status: 'pending',
      priority: reason === 'threat' ? 'high' : 'normal',
      reportedAt: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: userAgent || '',
      reportedFrom: reportedFrom || '',
      ipAddress: req.ip || null
    };

    // Add optional fields if they exist
    if (otherReason) reportData.otherReason = otherReason;
    if (confessionId) {
      reportData.confessionId = confessionId;
      reportData.parentId = confessionId;
    }

    // Add the report to the reports collection
    await admin.firestore().collection('reports').add(reportData);

    // Update the report count on the content
    let contentRef;
    if (contentType === 'confession') {
      contentRef = admin.firestore().collection('confessions').doc(contentId);
    } else if (contentType === 'reply' && confessionId) {
      contentRef = admin.firestore().collection(`confessions/${confessionId}/replies`).doc(contentId);
    } else {
      throw new Error('Invalid content type or missing confessionId for reply');
    }

    await contentRef.update({
      reportCount: admin.firestore.FieldValue.increment(1),
      'stats.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    // Send success response
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      success: true,
      data: {
        contentId,
        contentType,
        reportId: contentId + '-' + Date.now()
      }
    });
    
  } catch (error) {
    console.error('Error submitting report:', error);
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      success: false,
      error: {
        code: 'internal',
        message: error.message || 'An error occurred while submitting the report'
      }
    });
  }
});

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