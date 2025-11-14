import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Get anonymous user ID
function getUserId() {
  let id = localStorage.getItem('anonUserId');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonUserId', id);
  }
  return id;
}

// Internal helper: transform Firestore reactions object (emoji -> array of userIds) to counts
const transformReactionsToCounts = (reactionsObj) => {
  const counts = {};
  if (!reactionsObj) return counts;
  Object.keys(reactionsObj).forEach((emoji) => {
    const users = reactionsObj[emoji];
    if (Array.isArray(users)) counts[emoji] = users.length;
    else if (typeof users === 'object') counts[emoji] = Object.keys(users).length;
    else counts[emoji] = 0;
  });
  return counts;
};

// Subscribe to reactions using Firestore onSnapshot
export const subscribeToReactions = (confessionId, callback) => {
  const ref = doc(db, 'confessions', confessionId);
  const unsub = onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) return callback({});
    const data = snapshot.data();
    const reactions = transformReactionsToCounts(data.reactions);
    callback(reactions);
  }, (error) => {
    console.error('Error listening to reactions (firestore):', error);
    callback({});
  });

  return unsub;
};

// Subscribe to reactions but only count those in last 24h by using stored timestamps if available
export const subscribeToReactionsLast24h = (confessionId, callback) => {
  const ref = doc(db, 'confessions', confessionId);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const unsub = onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) return callback({});
    const data = snapshot.data();
    const reactionsObj = data.reactions || {};

    const counts = {};
    Object.keys(reactionsObj).forEach((emoji) => {
      const users = reactionsObj[emoji];
      if (Array.isArray(users)) {
        // If stored as array of {userId,timestamp} objects
        counts[emoji] = users.filter(u => (u && (u.timestamp || 0) >= cutoff)).length;
      } else if (typeof users === 'object') {
        // If stored as map of userId -> { timestamp }
        counts[emoji] = Object.values(users).filter(u => (u && (u.timestamp || 0) >= cutoff)).length;
      } else {
        counts[emoji] = 0;
      }
    });

    callback(counts);
  }, (error) => {
    console.error('Error listening to reactions last24h (firestore):', error);
    callback({});
  });

  return unsub;
};

// Toggle reaction using Cloud Function
export const toggleReaction = async (confessionId, emoji) => {
  const userId = getUserId();
  
  try {
    // Get current reaction state before making any changes
    const currentReaction = await getUserReaction(confessionId);
    const isRemoving = currentReaction === emoji;
    
    // Call the Cloud Function to handle the reaction
    const response = await fetch('https://us-central1-confey-72ff8.cloudfunctions.net/updateReaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        confessionId,
        emoji,
        userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update reaction');
    }
    
    // Return a consistent response format
    return { 
      hasReacted: !isRemoving, 
      countDelta: isRemoving ? -1 : 1 
    };
  } catch (error) {
    console.error('Error toggling reaction:', error);
    throw error;
  }
};

// Remove user's previous reaction if they have one
export const removePreviousReaction = async (confessionId, currentEmoji) => {
  // This is now handled by the Cloud Function
  // The Cloud Function will remove any existing reactions when adding a new one
  return Promise.resolve();
};

// Get user's current reaction for a confession
export const getUserReaction = async (confessionId) => {
  const userId = getUserId();
  const confessionRef = doc(db, 'confessions', confessionId);

  try {
    const snap = await getDoc(confessionRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const reactions = data.reactions || {};

    // Find the emoji that has this user's ID
    for (const [emoji, users] of Object.entries(reactions)) {
      if (Array.isArray(users) && users.some(u => u && u.userId === userId)) {
        return emoji;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user reaction:', error);
    return null;
  }
};

// Get reaction counts for a confession
export const getReactionCounts = async (confessionId) => {
  const confessionRef = doc(db, 'confessions', confessionId);
  try {
    const snap = await getDoc(confessionRef);
    if (!snap.exists()) return {};
    const reactions = snap.data().reactions || {};
    return transformReactionsToCounts(reactions);
  } catch (error) {
    console.error('Error getting reaction counts (firestore):', error);
    return {};
  }
};

// Sync is trivial now (Firestore is the source of truth)
export const syncReactionsToFirestore = async (confessionId) => {
  return getReactionCounts(confessionId);
};
