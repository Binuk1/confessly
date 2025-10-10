import { doc, getDoc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';
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

// Toggle reaction: Firestore stores reactions on confession document under `reactions` as emoji -> array of user objects
export const toggleReaction = async (confessionId, emoji) => {
  const userId = getUserId();
  const confessionRef = doc(db, 'confessions', confessionId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(confessionRef);
      if (!snap.exists()) {
        // Create doc fallback
        tx.set(confessionRef, { reactions: { [emoji]: [{ userId, timestamp: Date.now() }] } }, { merge: true });
        return { hasReacted: true, countDelta: 1 };
      }

      const data = snap.data();
      const reactions = data.reactions || {};

      // Find if user already reacted with this emoji
      const usersForEmoji = reactions[emoji] || [];
      let has = false;
      if (Array.isArray(usersForEmoji)) {
        has = usersForEmoji.some(u => u && u.userId === userId);
      } else if (typeof usersForEmoji === 'object') {
        has = Boolean(usersForEmoji[userId]);
      }

      if (has) {
        // Remove user's entry from this emoji
        if (Array.isArray(usersForEmoji)) {
          const newArr = usersForEmoji.filter(u => !(u && u.userId === userId));
          tx.update(confessionRef, { [`reactions.${emoji}`]: newArr });
        } else {
          const updated = { ...usersForEmoji };
          delete updated[userId];
          tx.update(confessionRef, { [`reactions.${emoji}`]: updated });
        }
        return { hasReacted: false, countDelta: -1 };
      } else {
        // Add user's entry
        const entry = { userId, timestamp: Date.now() };
        if (Array.isArray(usersForEmoji)) {
          const newArr = [...usersForEmoji, entry];
          tx.update(confessionRef, { [`reactions.${emoji}`]: newArr });
        } else {
          const updated = { ...(usersForEmoji || {}) };
          updated[userId] = entry;
          tx.update(confessionRef, { [`reactions.${emoji}`]: updated });
        }

        // Also remove user's entry from any other emoji they may have reacted to
        Object.keys(reactions).forEach((otherEmoji) => {
          if (otherEmoji === emoji) return;
          const arr = reactions[otherEmoji];
          if (Array.isArray(arr)) {
            if (arr.some(u => u && u.userId === userId)) {
              const filtered = arr.filter(u => !(u && u.userId === userId));
              tx.update(confessionRef, { [`reactions.${otherEmoji}`]: filtered });
            }
          } else if (typeof arr === 'object' && arr[userId]) {
            const updated = { ...arr };
            delete updated[userId];
            tx.update(confessionRef, { [`reactions.${otherEmoji}`]: updated });
          }
        });

        return { hasReacted: true, countDelta: 1 };
      }
    });

    return { hasReacted: result.hasReacted, count: result.countDelta };
  } catch (error) {
    console.error('Error toggling reaction (firestore):', error);
    throw error;
  }
};

// Remove user's previous reaction if they have one
export const removePreviousReaction = async (confessionId, currentEmoji) => {
  const userId = getUserId();
  const confessionRef = doc(db, 'confessions', confessionId);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(confessionRef);
      if (!snap.exists()) return;
      const reactions = snap.data().reactions || {};

      const updates = {};
      Object.keys(reactions).forEach((emoji) => {
        if (emoji === currentEmoji) return;
        const arr = reactions[emoji];
        if (Array.isArray(arr)) {
          if (arr.some(u => u && u.userId === userId)) {
            updates[`reactions.${emoji}`] = arr.filter(u => !(u && u.userId === userId));
          }
        } else if (typeof arr === 'object' && arr[userId]) {
          const copy = { ...arr };
          delete copy[userId];
          updates[`reactions.${emoji}`] = copy;
        }
      });

      if (Object.keys(updates).length > 0) tx.update(confessionRef, updates);
    });
  } catch (error) {
    console.error('Error removing previous reaction (firestore):', error);
    throw error;
  }
};

// Get user's current reaction for a confession
export const getUserReaction = async (confessionId) => {
  const userId = getUserId();
  const confessionRef = doc(db, 'confessions', confessionId);

  try {
    const snap = await getDoc(confessionRef);
    if (!snap.exists()) return null;
    const reactions = snap.data().reactions || {};
    for (const [emoji, users] of Object.entries(reactions)) {
      if (Array.isArray(users)) {
        if (users.some(u => u && u.userId === userId)) return emoji;
      } else if (typeof users === 'object' && users[userId]) {
        return emoji;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user reaction (firestore):', error);
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
