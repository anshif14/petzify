import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { app } from '../firebase/config';

const DebugRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated } = useUser();
  const [dbConnected, setDbConnected] = useState(null);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const checkFirestore = async () => {
      try {
        // Try to connect to Firestore and check if tailtalks collection exists
        const db = getFirestore(app);
        const testQuery = query(collection(db, 'tailtalks'), limit(1));
        await getDocs(testQuery);
        setDbConnected(true);
        
        // List collections
        const collectionsData = [
          { name: 'tailtalks', status: null },
          { name: 'direct_questions', status: null },
          { name: 'users', status: null }
        ];
        
        // Check each collection
        for (let i = 0; i < collectionsData.length; i++) {
          try {
            const q = query(collection(db, collectionsData[i].name), limit(1));
            const snapshot = await getDocs(q);
            collectionsData[i].status = 'ok';
            collectionsData[i].count = snapshot.size > 0 ? 'has docs' : 'empty';
          } catch (err) {
            collectionsData[i].status = 'error';
            collectionsData[i].error = err.message;
          }
        }
        
        setAvailableCollections(collectionsData);
      } catch (err) {
        setDbConnected(false);
        setError(err.message);
        console.error('Firestore connection error:', err);
      }
    };
    
    checkFirestore();
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>
      
      <div className="mb-8 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Route Information</h2>
        <div className="space-y-2">
          <p><strong>Current Path:</strong> {location.pathname}</p>
          <p><strong>Search:</strong> {location.search || 'none'}</p>
          <p><strong>Hash:</strong> {location.hash || 'none'}</p>
          <p><strong>State:</strong> {location.state ? JSON.stringify(location.state) : 'none'}</p>
        </div>
      </div>
      
      <div className="mb-8 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-2">User Information</h2>
        <div className="space-y-2">
          <p><strong>Authenticated:</strong> {isAuthenticated() ? 'Yes' : 'No'}</p>
          <p><strong>Current User:</strong> {currentUser ? 'Present' : 'Not found'}</p>
          {currentUser && (
            <div className="pl-4 border-l-2 border-primary">
              <p><strong>User ID:</strong> {currentUser.uid || 'Not available'}</p>
              <p><strong>Email:</strong> {currentUser.email || 'Not available'}</p>
              <p><strong>Display Name:</strong> {currentUser.displayName || 'Not available'}</p>
              <p><strong>Photo URL:</strong> {currentUser.photoURL ? 'Available' : 'Not available'}</p>
              <p><strong>Email Verified:</strong> {currentUser.emailVerified ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-8 bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Database Connection</h2>
        <div className="space-y-2">
          <p><strong>Firestore Connected:</strong> 
            {dbConnected === null ? 'Checking...' : 
             dbConnected ? 'Yes' : 'No - Error: ' + error}
          </p>
          
          {availableCollections.length > 0 && (
            <div>
              <p><strong>Collections:</strong></p>
              <ul className="pl-4 list-disc">
                {availableCollections.map((col, index) => (
                  <li key={index}>
                    {col.name}: {col.status === 'ok' ? 
                      <span className="text-green-600">{col.count}</span> : 
                      <span className="text-red-600">Error: {col.error}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Navigation Tests</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleNavigation('/')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Home
          </button>
          <button 
            onClick={() => handleNavigation('/tailtalk')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            TailTalks
          </button>
          <button 
            onClick={() => handleNavigation('/tailtalk/myposts')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            My Posts
          </button>
          <button 
            onClick={() => handleNavigation('/login')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Login
          </button>
          <button 
            onClick={() => handleNavigation('/profile')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Profile
          </button>
        </div>
      </div>
      
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-8">
        <p className="text-yellow-700">
          <strong>Troubleshooting Tip:</strong> If you're having issues with routes, ensure that:
        </p>
        <ul className="list-disc pl-5 text-yellow-700">
          <li>The component is properly imported in App.jsx</li>
          <li>The route path matches exactly in App.jsx</li>
          <li>Navigation uses the exact route path</li>
          <li>User authentication state is correct for protected routes</li>
          <li>React Router is properly configured</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugRoute; 