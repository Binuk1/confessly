import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

export const submitConfession = async (content) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    const confessionRef = collection(db, 'confessions');
    
    const confessionData = {
      content: content,
      createdAt: serverTimestamp(),
      likes: 0,
      reports: 0,
      isApproved: true, // Set to false if you need moderation
      ...(user && { userId: user.uid })
    };

    const docRef = await addDoc(confessionRef, confessionData);
    console.log('Confession created with ID: ', docRef.id);
    return { success: true, id: docRef.id };
    
  } catch (error) {
    console.error('Error adding confession: ', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};
