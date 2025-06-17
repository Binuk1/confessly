import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function getUserId() {
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
};
