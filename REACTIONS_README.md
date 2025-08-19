# Real-time Reactions System

## Overview

The reaction system has been upgraded to use **Firebase Realtime Database** for real-time updates, providing instant reaction updates across all connected users.

## Features

✅ **Real-time Updates**: Reactions update instantly for all users  
✅ **Optimistic UI**: Immediate visual feedback when reacting  
✅ **User-specific Reactions**: Each user can only have one reaction per confession  
✅ **Automatic Cleanup**: Previous reactions are automatically removed when adding a new one  
✅ **Error Handling**: Graceful fallback and error recovery  

## Architecture

### Data Structure

**Firebase Realtime Database:**
```
reactions/
  {confessionId}/
    ❤️/
      {userId1}/
        timestamp: 1234567890
        userId: "anon_abc123"
      {userId2}/
        timestamp: 1234567891
        userId: "anon_def456"
    😂/
      {userId3}/
        timestamp: 1234567892
        userId: "anon_ghi789"
```

**Firestore (Main confession data):**
```javascript
{
  id: "confession123",
  text: "My confession...",
  createdAt: timestamp,
  // reactions field is now optional (can be cleared after migration)
  reactions: {} // Legacy field
}
```

## Setup Instructions

### 1. Firebase Configuration

Add the Realtime Database URL to your environment variables:

```env
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

If not provided, it will default to: `https://{projectId}-default-rtdb.firebaseio.com`

### 2. Enable Realtime Database

1. Go to Firebase Console
2. Select your project
3. Go to "Realtime Database" in the left sidebar
4. Click "Create Database"
5. Choose a location
6. Start in test mode (for development)

### 3. Security Rules

Update your Realtime Database security rules:

```json
{
  "rules": {
    "reactions": {
      "$confessionId": {
        "$emoji": {
          "$userId": {
            ".read": true,
            ".write": "auth != null || $userId.matches(/^anon_/)",
            ".validate": "newData.hasChildren(['timestamp', 'userId'])"
          }
        }
      }
    }
  }
}
```

### 4. Migration (Optional)

If you have existing reactions in Firestore, you can migrate them:

```javascript
import { runMigration } from './src/utils/migrateReactions';

// Run in browser console or admin panel
runMigration().then(result => {
  console.log('Migration completed:', result);
});
```

## Usage

### Components

The system is automatically integrated into:
- `ConfessionItem.jsx` - Individual confession reactions
- `ConfessionList.jsx` - List view with real-time updates
- `TrendingConfessions.jsx` - Trending view with real-time updates

### API Functions

```javascript
import { 
  subscribeToReactions, 
  toggleReaction, 
  removePreviousReaction,
  getUserReaction,
  getReactionCounts 
} from './src/services/reactionService';

// Subscribe to real-time reactions
const unsubscribe = subscribeToReactions(confessionId, (reactions) => {
  console.log('Reactions updated:', reactions);
});

// Toggle a reaction
await toggleReaction(confessionId, '❤️');

// Get user's current reaction
const userReaction = await getUserReaction(confessionId);

// Get reaction counts
const counts = await getReactionCounts(confessionId);
```

## Testing

Use the `ReactionTest` component to verify real-time functionality:

```javascript
import ReactionTest from './src/components/ReactionTest';

// Add to any page for testing
<ReactionTest confessionId="your-confession-id" />
```

## Performance Benefits

- **Faster Updates**: Realtime Database provides sub-second updates
- **Reduced Firestore Reads**: Reactions don't count against Firestore quotas
- **Better Scalability**: Realtime Database is optimized for frequent small updates
- **Lower Latency**: Direct WebSocket connection for real-time data

## Troubleshooting

### Common Issues

1. **Reactions not updating**: Check Realtime Database rules and connection
2. **Migration errors**: Ensure Realtime Database is enabled
3. **Permission denied**: Verify security rules allow anonymous users

### Debug Mode

Enable debug logging in the browser console:

```javascript
// Add to your app initialization
localStorage.setItem('debug_reactions', 'true');
```

## Migration Notes

- Existing Firestore reactions are preserved during migration
- New reactions go directly to Realtime Database
- You can optionally clear Firestore reactions after migration
- The system works with both old and new reaction formats

## Future Enhancements

- [ ] Reaction analytics and insights
- [ ] Custom reaction sets per confession
- [ ] Reaction notifications
- [ ] Reaction history tracking
- [ ] Bulk reaction operations
