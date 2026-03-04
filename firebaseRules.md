Plik ma na celu przekazanie agentom jakie obecnie rule są ustawione w firebase.

# Storage

rules_version = '2';

service firebase.storage {
match /b/{bucket}/o {
match /avatars/{userId}/{filename} {
allow read, write: if request.auth != null
&& request.auth.uid == userId
&& filename.matches('^avatar(\\.\\w+)?$');
}

    match /meals/{userId}/{filename} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /myMeals/{userId}/{filename} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /feedbacks/{feedbackId}/{filename} {
      allow write: if request.auth != null;
      allow read: if request.auth != null && request.auth.token.admin == true;
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }

}
}

# Friestore database

rules_version = '2';

service cloud.firestore {
match /databases/{database}/documents {

    match /usernames/{username} {
      allow get: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }

    match /users/{userId} {
      allow create: if request.auth != null && request.auth.uid == userId;
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/history/{mealId} {
      allow create, read, update, delete: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/meals/{mealId} {
      allow create, read, update, delete: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/myMeals/{mealId} {
      allow create, read, update, delete: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/chat_threads/{threadId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;

      match /messages/{messageId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /feedbacks/{feedbackId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && request.auth.token.admin == true;
    }

    match /users/{userId}/streak/{docId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
      allow create, update: if request.auth != null
                            && request.auth.uid == userId
                            && isValidStreak();

      function isValidStreak() {
        return request.resource.data.keys().hasOnly(['current','lastDate']) &&
               request.resource.data.current is int &&
               request.resource.data.current >= 0 &&
               (
                 request.resource.data.lastDate == null ||
                 (request.resource.data.lastDate is string &&
                  request.resource.data.lastDate.matches('^\\d{4}-\\d{2}-\\d{2}$'))
               );
      }
    }

    match /users/{userId}/notifications/{notifId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId}/prefs/{docId} {
      allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
    }

}
}
