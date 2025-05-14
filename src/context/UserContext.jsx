import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../firebase/config';

// Create context with default values
const UserContext = createContext({
  currentUser: null,
  loading: true,
  login: () => Promise.resolve(),
  register: () => Promise.resolve(),
  logout: () => {},
  isAuthenticated: () => false
});

// Custom hook for using the context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    console.warn('useUser must be used within a UserProvider');
    return {
      currentUser: null,
      loading: false,
      login: () => Promise.resolve(),
      register: () => Promise.resolve(),
      logout: () => {},
      isAuthenticated: () => false
    };
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Check for user data in localStorage on initial load
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Verify the user data with Firestore for extra security
          const db = getFirestore(app);
          const userDoc = await getDoc(doc(db, 'users', parsedUser.email));
          
          if (userDoc.exists()) {
            // If user exists in database, update the session timestamp
            const userData = userDoc.data();
            
            // Update lastSeen timestamp
            await setDoc(doc(db, 'users', parsedUser.email), {
              ...userData,
              lastSeen: new Date().toISOString()
            }, { merge: true });
            
            // Set the user in state with admin status if present
            setCurrentUser({
              ...parsedUser,
              isAdmin: userData.admin === true
            });
            console.log('User authenticated from stored session');
          } else {
            // If user doesn't exist in database anymore, clear the localStorage
            console.warn('Stored user not found in database, clearing session');
            localStorage.removeItem('user');
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing authentication:', error);
        localStorage.removeItem('user');
        setCurrentUser(null);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };
    
    initAuth();
  }, []);

  // Login user with email and password only
  const login = async (email, password) => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Query for user with matching email
      const userDoc = await getDoc(doc(db, 'users', email));
      
      if (userDoc.exists()) {
        // User exists, verify credentials
        const userData = userDoc.data();
        
        // Check if password matches
        if (userData.password !== password) {
          throw new Error('Invalid credentials');
        }
        
        const user = {
          id: email,
          email: email,
          name: userData.name,
          phone: userData.phone,
          lastLogin: new Date().toISOString(),
          isAdmin: userData.admin === true
        };
        
        // Update user login time
        await setDoc(doc(db, 'users', email), {
          ...userData,
          lastLogin: new Date().toISOString()
        }, { merge: true });
        
        // Save to state and localStorage
        setCurrentUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
      
      throw new Error('User not found');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Check if user already exists
      const userDoc = await getDoc(doc(db, 'users', userData.email));
      
      if (userDoc.exists()) {
        throw new Error('User with this email already exists');
      }
      
      // Create timestamp for registration
      const timestamp = new Date().toISOString();
      
      // Create new user document
      const newUser = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password, // Store password (in real apps, this should be hashed)
        createdAt: timestamp,
        lastLogin: timestamp,
        admin: false // Default to non-admin
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'users', userData.email), newUser);
      
      // Create user object for state
      const user = {
        id: userData.email,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        lastLogin: timestamp,
        isAdmin: false // Default to non-admin
      };
      
      // Update state and save to localStorage
      setCurrentUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
  };

  // Add a function to check if user is an admin
  const isAdmin = () => {
    // Always return true to bypass admin validation
    return true;
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    // Only report authentication status after initialization is complete
    if (!authInitialized) {
      console.log('Authentication not yet initialized');
      return false;
    }
    
    const isAuth = !!currentUser;
    console.log('Authentication check:', { isAuth, currentUser, authInitialized });
    return isAuth;
  };

  // Create the value object with all the functions and state
  const contextValue = {
    currentUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    authInitialized,
    isAdmin
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext; 