const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin with explicit configuration
let db;

try {
  admin.initializeApp();
  db = admin.firestore();
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization error', error);
  throw error; // Re-throw to fail fast during initialization
}

// Set Firestore settings to handle timeout issues
const firestoreSettings = { timestampsInSnapshots: true };
if (process.env.FUNCTIONS_EMULATOR) {
  firestoreSettings.host = 'localhost:8080';
  firestoreSettings.ssl = false;
}

db.settings(firestoreSettings);

// Callable function to log IP for new confessions
exports.logConfessionIp = functions.https.onCall(async (data, context) => {
  const { confessionId } = data;
  
  // Get IP address from various possible sources
  const ip = context.rawRequest.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             context.rawRequest.ip || 
             context.rawRequest.connection?.remoteAddress ||
             'unknown';

  if (!confessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Confession ID is required');
  }

  try {
    // Use a batch write for atomic operations
    const batch = db.batch();
    
    // Update confession with IP
    const confessionRef = db.collection('confessions').doc(confessionId);
    batch.update(confessionRef, {
      ipAddress: ip,
      ipLoggedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add to IP logs collection
    const ipLogRef = db.collection('ipLogs').doc();
    batch.set(ipLogRef, {
      ip,
      type: 'confession',
      confessionId: confessionId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: context.rawRequest.headers['user-agent'] || 'unknown'
    });

    await batch.commit();
    
    console.log(`Successfully logged IP for confession ${confessionId}`);
    return { success: true, ip };
  } catch (error) {
    console.error('Error logging confession IP:', error);
    // Return success anyway - don't fail the confession creation
    return { success: false, error: error.message };
  }
});

// Callable function to log IP for replies
exports.logReplyIp = functions.https.onCall(async (data, context) => {
  const { confessionId, replyId } = data;
  
  // Get IP address from various possible sources
  const ip = context.rawRequest.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             context.rawRequest.ip || 
             context.rawRequest.connection?.remoteAddress ||
             'unknown';

  if (!confessionId || !replyId) {
    throw new functions.https.HttpsError('invalid-argument', 'Confession ID and Reply ID are required');
  }

  try {
    // Use a batch write for atomic operations
    const batch = db.batch();
    
    // Update reply with IP (using the correct subcollection path)
    const replyRef = db.collection('confessions')
      .doc(confessionId)
      .collection('replies')
      .doc(replyId);
    
    batch.update(replyRef, {
      ipAddress: ip,
      ipLoggedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add to IP logs collection
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
    
    console.log(`Successfully logged IP for reply ${replyId} on confession ${confessionId}`);
    return { success: true, ip };
  } catch (error) {
    console.error('Error logging reply IP:', error);
    // Return success anyway - don't fail the reply creation
    return { success: false, error: error.message };
  }
});