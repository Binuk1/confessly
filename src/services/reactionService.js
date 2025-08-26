import { ref, set, get, onValue, off, push, remove } from 'firebase/database';
import { realtimeDb } from '../firebase';

// Get anonymous user ID
function getUserId() {
  let id = localStorage.getItem('anonUserId');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonUserId', id);
  }
  return id;
}

// Subscribe to real-time reactions for a confession
export const subscribeToReactions = (confessionId, callback) => {
  const reactionsRef = ref(realtimeDb, `reactions/${confessionId}`);
  
  const unsubscribe = onValue(reactionsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Transform the data from Realtime DB format to the expected format
      const reactions = {};
      Object.keys(data).forEach(emoji => {
        const users = data[emoji];
        if (users && typeof users === 'object') {
          reactions[emoji] = Object.keys(users).length;
        }
      });
      callback(reactions);
    } else {
      callback({});
    }
  }, (error) => {
    console.error('Error listening to reactions:', error);
    callback({});
  });

  return () => {
    off(reactionsRef);
    unsubscribe();
  };
};

// Subscribe to real-time reactions for the last 24 hours only
export const subscribeToReactionsLast24h = (confessionId, callback) => {
  const reactionsRef = ref(realtimeDb, `reactions/${confessionId}`);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const unsubscribe = onValue(reactionsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const reactions = {};
      Object.keys(data).forEach(emoji => {
        const users = data[emoji];
        if (users && typeof users === 'object') {
          let count = 0;
          Object.values(users).forEach(rec => {
            const ts = typeof rec?.timestamp === 'number' ? rec.timestamp : 0;
            if (ts >= cutoff) count += 1;
          });
          reactions[emoji] = count;
        }
      });
      callback(reactions);
    } else {
      callback({});
    }
  }, (error) => {
    console.error('Error listening to reactions (24h):', error);
    callback({});
  });

  return () => {
    off(reactionsRef);
    unsubscribe();
  };
};

// Toggle a reaction (add or remove)
export const toggleReaction = async (confessionId, emoji) => {
  const userId = getUserId();
  const userReactionRef = ref(realtimeDb, `reactions/${confessionId}/${emoji}/${userId}`);
  
  try {
    // Check if user already reacted with this emoji
    const snapshot = await get(userReactionRef);
    
    if (snapshot.exists()) {
      // Remove reaction
      await remove(userReactionRef);
      return { hasReacted: false, count: -1 };
    } else {
      // Add reaction
      await set(userReactionRef, {
        timestamp: Date.now(),
        userId: userId
      });
      return { hasReacted: true, count: 1 };
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    throw error;
  }
};

// Remove user's previous reaction if they have one
export const removePreviousReaction = async (confessionId, currentEmoji) => {
  const userId = getUserId();
  const reactionsRef = ref(realtimeDb, `reactions/${confessionId}`);
  
  try {
    const snapshot = await get(reactionsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const promises = [];
      
      Object.keys(data).forEach(emoji => {
        if (emoji !== currentEmoji && data[emoji] && data[emoji][userId]) {
          promises.push(remove(ref(realtimeDb, `reactions/${confessionId}/${emoji}/${userId}`)));
        }
      });
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }
  } catch (error) {
    console.error('Error removing previous reaction:', error);
    throw error;
  }
};

// Get user's current reaction for a confession
export const getUserReaction = async (confessionId) => {
  const userId = getUserId();
  const reactionsRef = ref(realtimeDb, `reactions/${confessionId}`);
  
  try {
    const snapshot = await get(reactionsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const [emoji, users] of Object.entries(data)) {
        if (users && users[userId]) {
          return emoji;
        }
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
  const reactionsRef = ref(realtimeDb, `reactions/${confessionId}`);
  
  try {
    const snapshot = await get(reactionsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const counts = {};
      Object.keys(data).forEach(emoji => {
        const users = data[emoji];
        if (users && typeof users === 'object') {
          counts[emoji] = Object.keys(users).length;
        }
      });
      return counts;
    }
    return {};
  } catch (error) {
    console.error('Error getting reaction counts:', error);
    return {};
  }
};

// Sync reactions from Realtime DB to Firestore (for backup/analytics)
export const syncReactionsToFirestore = async (confessionId) => {
  try {
    const counts = await getReactionCounts(confessionId);
    // This would update the Firestore document with the current reaction counts
    // You can implement this if you want to keep Firestore as a backup
    return counts;
  } catch (error) {
    console.error('Error syncing reactions to Firestore:', error);
    throw error;
  }
};
