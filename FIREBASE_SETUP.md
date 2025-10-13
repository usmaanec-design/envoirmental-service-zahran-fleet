# Firebase Setup Guide for Zahran Fleet Management

## 🔥 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `zahran-fleet-management`
4. Enable Google Analytics (optional)
5. Click "Create project"

## 🔧 Step 2: Setup Firebase Configuration

1. In Firebase Console, click on ⚙️ Settings → Project settings
2. Scroll down to "Your apps" section
3. Click on "Web" icon (</>) to add a web app
4. Register app name: `zahran-fleet-web`
5. Copy the configuration object

## 📝 Step 3: Update Configuration

Replace the values in `firebase/config.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "zahran-fleet-management.firebaseapp.com",
  projectId: "zahran-fleet-management", 
  storageBucket: "zahran-fleet-management.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 🔐 Step 4: Setup Authentication

1. In Firebase Console → Authentication
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

## 🗄️ Step 5: Setup Firestore Database

1. In Firebase Console → Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select location (closest to your users)
5. Click "Done"

## 🔒 Step 6: Setup Security Rules

Replace Firestore rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Vehicles: users can only access their own
    match /vehicles/{vehicleId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Drivers: users can only access their own  
    match /drivers/{driverId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Incidents: users can only access their own
    match /incidents/{incidentId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Admin can access everything
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 🚀 Step 7: Run the Application

1. Update Firebase config in `firebase/config.ts`
2. Run: `npm run dev`
3. Test login/signup functionality
4. Data will now be stored in Firebase!

## 📊 Step 8: Optional Features

### Enable Offline Support:
```typescript
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Enable offline
await disableNetwork(db);

// Enable online  
await enableNetwork(db);
```

### Real-time Updates:
```typescript
import { onSnapshot } from 'firebase/firestore';

// Listen to vehicle changes
onSnapshot(collection(db, 'vehicles'), (snapshot) => {
  // Update UI automatically
});
```

## 🔍 Troubleshooting

### Common Issues:

1. **Authentication Error**: Check if Email/Password is enabled
2. **Permission Denied**: Verify Firestore security rules
3. **Network Error**: Check internet connection and Firebase config
4. **Build Error**: Ensure all Firebase packages are installed

### Debug Commands:
```bash
# Check Firebase connectivity
npm run dev

# View browser console for errors
F12 → Console tab
```

## 📈 Production Deployment

1. Update Firestore rules to production mode
2. Enable Firebase Hosting:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   npm run build
   firebase deploy
   ```

Your Fleet Management app is now powered by Firebase! 🎉