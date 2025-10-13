# 🔥 Firebase Authentication Setup

## Current Error Fix:
```
Firebase: Error (auth/api-key-not-valid-please-pass-a-valid-api-key)
```

## Solution Steps:

### 1. Enable Authentication in Firebase Console

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/
   - Select your project: `zahran-projects-report`

2. **Navigate to Authentication:**
   - Click on "Authentication" in left sidebar
   - Click "Get started"

3. **Enable Email/Password Sign-in:**
   - Go to "Sign-in method" tab
   - Click on "Email/Password"
   - Toggle "Enable" 
   - Click "Save"

### 2. Setup Firestore Database

1. **Create Firestore Database:**
   - Click on "Firestore Database" in sidebar
   - Click "Create database"
   - Choose "Start in test mode" (for development)
   - Select location (choose closest to your region)
   - Click "Done"

### 3. Update Security Rules (Important!)

Replace the default Firestore rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (TEST MODE ONLY)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Note: This is for development only. Update rules for production!**

### 4. Test the Application

After completing above steps:

1. **Restart your app:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Test Authentication:**
   - Go to http://localhost:3000
   - Try creating a new account
   - Should work without API key error

### 5. Verify in Firebase Console

Check these sections in Firebase Console:

- **Authentication → Users**: New users should appear here
- **Firestore Database → Data**: Collections (users, vehicles, etc.) should be created

---

## ✅ Expected Result:

- ✅ No API key errors
- ✅ User registration works
- ✅ Data saves to Firebase Firestore
- ✅ Real-time updates enabled

## 🚨 If Still Getting Errors:

1. **Double-check Firebase config** in `firebase/config.ts`
2. **Verify project ID** matches your Firebase project
3. **Ensure Authentication is enabled** in Firebase Console
4. **Check browser console** for detailed error messages

---

**After completing these steps, your app will be fully connected to Firebase!** 🎉