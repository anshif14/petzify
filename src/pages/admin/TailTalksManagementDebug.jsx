import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

const TailTalksManagementDebug = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isAuthenticated } = useUser();

  useEffect(() => {
    console.log('TailTalksManagementDebug mounted');
    console.log('Current user:', currentUser);
    console.log('Is admin function exists:', typeof isAdmin === 'function');
    console.log('Is admin result:', isAdmin ? isAdmin() : 'isAdmin is not a function');
    console.log('Is authenticated function exists:', typeof isAuthenticated === 'function');
    console.log('Is authenticated result:', isAuthenticated ? isAuthenticated() : 'isAuthenticated is not a function');
  }, [currentUser, isAdmin, isAuthenticated]);

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-4">TailTalks Management Debug</h1>
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="text-lg font-semibold mb-2">Authentication Status:</h2>
        <p>Current User: {currentUser ? 'Logged In' : 'Not Logged In'}</p>
        <p>Is Admin: {isAdmin && isAdmin() ? 'Yes' : 'No'}</p>
        <p>Is Authenticated: {isAuthenticated && isAuthenticated() ? 'Yes' : 'No'}</p>
      </div>
      <div className="flex space-x-4">
        <button 
          onClick={() => navigate('/admin/dashboard')} 
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Go to Admin Dashboard
        </button>
        <button 
          onClick={() => navigate('/admin/tailtalk')} 
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Go to TailTalks Admin
        </button>
      </div>
    </div>
  );
};

export default TailTalksManagementDebug; 