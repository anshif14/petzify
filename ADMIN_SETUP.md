ADMI# Petzify Admin Panel Setup

This document provides instructions on how to set up and use the admin panel for the Petzify website.

## Setup Instructions

### 1. Set up Firebase

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com/)
2. Enable Firestore database in your project
3. Create a `.env` file at the root of your project based on the `.env.example` template
4. Fill in your Firebase project details in the `.env` file:

```
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. Set up Admin Credentials in Firestore

1. In the Firebase console, go to Firestore Database
2. Create a collection called `admin`
3. Add a document with the following fields:
   - `name`: "Anshif" (string)
   - `username`: "anshifanu0" (string)
   - `password`: "Anshif@123" (string)
   - `role`: "super_admin" (string)

Your Firestore structure should look like this:
```
admin (collection)
  └── [auto-generated ID] (document)
        ├── name: "Anshif"
        ├── username: "anshifanu0"
        ├── password: "Anshif@123"
        └── role: "super_admin"
```

### 3. Contact Information in Firestore

The application will automatically create a `contact_info` collection with default contact information. The structure will look like this:

```
contact_info (collection)
  └── main (document)
        ├── email: "petzify.business@gmail.com"
        ├── phone: "+91 8129008634"
        ├── address: "Kochi"
        ├── state: "Kerala"
        ├── country: "India"
        └── lastUpdated: "[timestamp]"
```

### 4. Messages in Firestore

When users submit the contact form, a new document will be created in the `messages` collection. The structure will look like this:

```
messages (collection)
  └── [auto-generated ID] (document)
        ├── name: "Visitor Name"
        ├── email: "visitor@example.com"
        ├── subject: "Message Subject"
        ├── message: "The content of the message..."
        ├── createdAt: "[timestamp]"
        └── status: "unread" or "read"
```

### 5. Configure Firestore Security Rules

1. In the Firebase console, navigate to Firestore Database > Rules
2. Update the security rules to allow read access to the admin collection:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin collection security rules
    match /admin/{adminId} {
      // Allow read access to admin collection
      allow read: if true;
      // Allow admin to update their own document
      allow update: if true;
      // Prevent creation and deletion
      allow create, delete: if false;
    }
    
    // Contact info collection - allow read by anyone, write by admin
    match /contact_info/{docId} {
      allow read: if true;
      allow write: if true;  // In production, restrict this to admins only
    }
    
    // Messages collection - allow users to create messages, admins to read
    match /messages/{messageId} {
      // Anyone can create a message
      allow create: if true;
      // Only allow read/update/delete by admins (in production, restrict this)
      allow read, update, delete: if true;
    }
    
    // Default deny other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Using the Admin Panel

### Accessing the Admin Panel

1. Navigate to `/admin` after your base URL (e.g., `https://yourdomain.com/#/admin`)
2. Enter your credentials:
   - Username: anshifanu0
   - Password: Anshif@123
3. After successful login, you will be redirected to the admin dashboard

### Admin Dashboard Features

The admin dashboard provides the following features:

1. **Website Statistics**: View visitor stats, active users, and service bookings
2. **Recent Activities**: See recent user activities on the website
3. **Quick Actions**: Access common administrative tasks
4. **Contact Information Management**: Update contact information displayed on the website
5. **Messages Management**: View, respond to, and delete messages submitted through the contact form
6. **Admin Profile Management**: Update admin name and password

### Managing Contact Information

1. Log in to the admin panel
2. Click on "Contact Information" in the sidebar
3. Update any of the fields:
   - Email Address
   - Phone Number
   - Address
   - State/Province
   - Country
4. Click the "Update Contact Information" button to save changes
5. The changes will immediately be reflected on the Contact page of the website

### Managing Contact Messages

1. Log in to the admin panel
2. Click on "Messages" in the sidebar
3. You'll see a list of all messages, with unread messages highlighted
4. Click on a message to view its full content
5. When you view a message, it will automatically be marked as read
6. You can:
   - Reply to the message via email by clicking the "Reply via Email" button
   - Delete the message by clicking the "Delete" button
   - Refresh the list to see new messages by clicking the "Refresh" button

### Managing Admin Profile

1. Log in to the admin panel
2. Click on "Admin Profile" in the sidebar
3. You can:
   - Update your display name
   - Change your password by:
     - Checking the "Change Password" checkbox
     - Entering your current password
     - Entering a new password (minimum 6 characters)
     - Confirming your new password
4. Click the "Update Profile" button to save changes
5. Your display name will be immediately updated in the admin panel header

### Security Considerations

- The admin credentials are stored in Firestore, which provides a secure way to store and retrieve data
- Admin routes are protected using the `AdminRoute` component, which checks for authentication
- The AdminRoute component verifies the admin's existence in the database on each protected route access
- Admin authentication state is stored in localStorage for convenience, but in a production environment, consider using more secure methods like JWT tokens with server-side validation
- For enhanced security, consider implementing rate limiting on login attempts and session timeouts

## Customizing the Admin Panel

You can extend the admin panel by:

1. Adding more sections to the dashboard in `src/pages/AdminDashboard.jsx`
2. Creating additional admin pages and adding them to the routes in `src/App.js`
3. Implementing additional features like user management, content editing, etc.

## Troubleshooting

If you encounter issues with the admin panel:

1. Check browser console for errors
2. Verify Firebase configuration in your `.env` file
3. Ensure the admin document exists in Firestore with the correct fields
4. Clear localStorage if you're experiencing persistent login issues
5. For Firebase connectivity issues:
   - Verify your API key and project settings
   - Check if your IP is allowlisted in Firebase security rules

## Firebase Errors and Solutions

### 400 Bad Request Errors

If you see errors like `Failed to load resource: the server responded with a status of 400 ()` or 
`WebChannelConnection RPC 'Listen' stream transport errored: jd`:

1. Check that your Firebase credentials in the `.env` file are correct
2. Ensure your Firebase project has Firestore enabled
3. Make sure your Firebase security rules allow read access to the collections you're trying to access

### Authentication Errors

If you can log in but encounter authentication errors:

1. Verify that the admin document exists in Firestore with the exact fields mentioned above
2. Check that the username and password match exactly (including case sensitivity)
3. Ensure that your security rules allow read access to the admin collection 