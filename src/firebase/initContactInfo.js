import { db } from './config';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

// Initialize contact info in Firestore
export async function initializeContactInfo() {
  try {
    // Check if contact info document already exists
    const contactInfoRef = doc(db, 'contact_info', 'main');
    const docSnap = await getDoc(contactInfoRef);
    
    if (!docSnap.exists()) {
      // If it doesn't exist, create it with default values
      const defaultContactInfo = {
        email: "petzify.business@gmail.com",
        phone: "+91 94976 72523",
        address: "Kochi",
        state: "Kerala",
        country: "India",
        lastUpdated: new Date().toISOString()
      };
      
      await setDoc(contactInfoRef, defaultContactInfo);
      console.log("Contact info initialized successfully");
      return defaultContactInfo;
    } else {
      console.log("Contact info already exists, no need to initialize");
      return docSnap.data();
    }
  } catch (error) {
    console.error("Error initializing contact info:", error);
    throw error;
  }
} 