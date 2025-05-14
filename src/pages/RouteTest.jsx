import React from 'react';
import { useNavigate } from 'react-router-dom';

const RouteTest = () => {
  const navigate = useNavigate();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Route Testing Page</h1>
      <p className="mb-4">This page is for testing navigation and routes.</p>
      
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Navigation Links:</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            className="px-4 py-2 bg-primary text-white rounded"
            onClick={() => navigate('/tailtalk')}
          >
            Go to TailTalks
          </button>
          
          <button 
            className="px-4 py-2 bg-primary text-white rounded"
            onClick={() => navigate('/tailtalk/myposts')}
          >
            Go to My Posts
          </button>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-medium mb-2">Current Path:</h2>
        <p className="p-2 bg-gray-100 rounded">{window.location.pathname}</p>
      </div>
    </div>
  );
};

export default RouteTest; 