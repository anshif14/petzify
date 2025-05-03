// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAaA28KLEYpi3iSZXssGpmOMYRLXUZiOfk",
  authDomain: "petzify-49ed4.firebaseapp.com",
  projectId: "petzify-49ed4",
  storageBucket: "petzify-49ed4.firebasestorage.app",
  messagingSenderId: "307689110041",
  appId: "1:307689110041:web:a5beb925b28d1c27ecc888",
  measurementId: "G-WR0RGET4LQ"
};

// Initialize Firebase app with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw new Error("Firebase initialization failed. Please check your configuration.");
}

// Initialize Firestore with error handling
let db;
try {
  db = getFirestore(app);
  console.log("Firestore initialized successfully");
  
  // Use emulator in development environment if configured
  if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log("Connected to Firestore emulator");
  }
} catch (error) {
  console.error("Error initializing Firestore:", error);
  throw new Error("Firestore initialization failed");
}

// Initialize Firebase Storage
const storage = getStorage(app);

// Initialize Firebase Authentication
const auth = getAuth(app);

export { app, db, storage, auth }; 