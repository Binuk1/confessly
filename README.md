rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for confessions
    match /confessions/{confessionId} {
      allow read, write: if true;
      match /replies/{replyId} {
        allow read, write: if true;
      }
    }
    // Allow all authenticated users to read any user document,
    // Allow users to write to their own document,
    // Allow authenticated users to update the friendRequests field of other users' documents
    match /users/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth != null && (
    request.auth.uid == userId ||
    (
      request.resource.data.keys().hasOnly(['friendRequests']) &&
      request.resource.data.friendRequests is list
    )
  );
  allow create, delete: if request.auth != null && request.auth.uid == userId;
   }
  }
}