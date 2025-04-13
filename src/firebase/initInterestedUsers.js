import { doc, collection, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * Initialize the interestedUsers subcollection in the settings document if it doesn't exist
 */
export const initInterestedUsersCollection = async () => {
  try {
    console.log('Checking interestedUsers collection...');
    
    // First, ensure the settings document exists
    const settingsRef = doc(db, 'settings', 'settings');
    
    // Check if the interestedUsers subcollection exists by trying to get documents
    const usersCollection = collection(settingsRef, 'interestedUsers');
    const querySnapshot = await getDocs(usersCollection);
    
    console.log(`Found ${querySnapshot.size} interested users`);
    
    return true;
  } catch (error) {
    console.error('Error initializing interestedUsers collection:', error);
    return false;
  }
};

/**
 * Add a new interested user to the database
 * @param {string} email - The email of the interested user
 */
export const addInterestedUser = async (email) => {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    const settingsRef = doc(db, 'settings', 'settings');
    const userRef = doc(collection(settingsRef, 'interestedUsers'));
    
    await setDoc(userRef, {
      email,
      timestamp: serverTimestamp()
    });
    
    console.log('Successfully added interested user:', email);
    return true;
  } catch (error) {
    console.error('Error adding interested user:', error);
    throw error;
  }
}; 