import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function getUserId() {
  let id = localStorage.getItem('anonUserId');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonUserId', id);
  }
  return id;
}

export const handleReactionToggle = async (confessionId, emojiKey) => {
  const userId = getUserId();
  const ref = doc(db, 'confessions', confessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data().reactions || {};
  const users = data[emojiKey] || [];
  const has = users.includes(userId);
  const newArr = has ? users.filter(u => u !== userId) : [...users, userId];

  await updateDoc(ref, {
    [`reactions.${emojiKey}`]: newArr,
  });

  return { hasReacted: !has, count: newArr.length };
};

export const addReply = async (confessionId, text, gifUrl = null) => {
  await addDoc(collection(db, 'confessions', confessionId, 'replies'), {
    text: text.trim(),
    gifUrl,
    createdAt: serverTimestamp()
  });
};

export const subscribeToReplies = (confessionId, callback) => {
  const q = query(
    collection(db, 'confessions', confessionId, 'replies'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const replies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(replies);
  });
};

export const getUserReaction = (reactions, userId) => {
  if (!reactions || !userId) return null;
  for (const [emoji, users] of Object.entries(reactions)) {
    if (users.includes(userId)) return emoji;
  }
  return null;
};

export const getReactionCount = (reactions, emoji) => {
  return reactions?.[emoji]?.length || 0;
};