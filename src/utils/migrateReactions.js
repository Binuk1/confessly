import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, realtimeDb } from '../firebase';

// Migration script to move reactions from Firestore to Realtime Database
export const migrateReactionsToRealtimeDB = async () => {
  try {
    console.log('Starting reaction migration...');
    
    // Get all confessions with reactions
    const confessionsRef = collection(db, 'confessions');
    const snapshot = await getDocs(confessionsRef);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const confession = docSnapshot.data();
      const confessionId = docSnapshot.id;
      
      if (confession.reactions && Object.keys(confession.reactions).length > 0) {
        // Migrate reactions to Realtime Database
        const reactionsRef = ref(realtimeDb, `reactions/${confessionId}`);
        
        // Transform Firestore reactions format to Realtime DB format
        const realtimeReactions = {};
        Object.keys(confession.reactions).forEach(emoji => {
          const count = confession.reactions[emoji];
          realtimeReactions[emoji] = {};
          
          // Create placeholder entries for each reaction count
          // In a real migration, you'd want to preserve actual user IDs
          for (let i = 0; i < count; i++) {
            const placeholderId = `migrated_${confessionId}_${emoji}_${i}`;
            realtimeReactions[emoji][placeholderId] = {
              timestamp: Date.now(),
              userId: placeholderId,
              migrated: true
            };
          }
        });
        
        await set(reactionsRef, realtimeReactions);
        migratedCount++;
        console.log(`Migrated reactions for confession ${confessionId}`);
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Migration complete! Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
    return { migratedCount, skippedCount };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Optional: Clear reactions from Firestore after migration
export const clearFirestoreReactions = async () => {
  try {
    console.log('Clearing reactions from Firestore...');
    
    const confessionsRef = collection(db, 'confessions');
    const snapshot = await getDocs(confessionsRef);
    
    let clearedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const confession = docSnapshot.data();
      
      if (confession.reactions && Object.keys(confession.reactions).length > 0) {
        const confessionRef = doc(db, 'confessions', docSnapshot.id);
        await updateDoc(confessionRef, {
          reactions: {}
        });
        clearedCount++;
      }
    }
    
    console.log(`Cleared reactions from ${clearedCount} confessions`);
    return clearedCount;
    
  } catch (error) {
    console.error('Failed to clear Firestore reactions:', error);
    throw error;
  }
};

// Run migration (call this function when ready to migrate)
export const runMigration = async () => {
  try {
    console.log('Starting full reaction migration...');
    
    // Step 1: Migrate to Realtime Database
    const migrationResult = await migrateReactionsToRealtimeDB();
    
    // Step 2: Optionally clear Firestore reactions (uncomment when ready)
    // const clearedCount = await clearFirestoreReactions();
    
    console.log('Migration completed successfully!');
    return migrationResult;
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};
