import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/common/LoadingScreen';

const NotFound = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to home page after 3 seconds
    const redirectTimeout = setTimeout(() => {
      navigate('/');
    }, 3000);
    
    // Clean up the timeout if the component unmounts
    return () => clearTimeout(redirectTimeout);
  }, [navigate]);
  
  return <LoadingScreen message="Finding your way..." />;
};

export default NotFound; 