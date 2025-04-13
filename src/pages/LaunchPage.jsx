import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CountdownTimer from '../components/home/CountdownTimer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const LaunchPage = () => {
  const [hasLaunched, setHasLaunched] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCheckingDate, setIsCheckingDate] = useState(true);
  const navigate = useNavigate();

  // Enter website when button is clicked or countdown completes
  const enterWebsite = useCallback(() => {
    setIsAnimating(true);
    // Add exit animation with upward transition
    setTimeout(() => {
      navigate('/home');
    }, 1000); // Wait for the animation to complete
  }, [navigate]);

  // For development - immediately navigate to home page
  useEffect(() => {
    // Skip countdown and immediately enter website for development
    navigate('/home');
    
    // Comment out the code below during development
    /*
    const checkLaunchDate = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'settings');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const deploymentDate = data.website_deployment;
          
          // Parse the deployment date
          let launchDate;
          if (typeof deploymentDate === 'string') {
            launchDate = new Date(deploymentDate);
          } else if (deploymentDate && deploymentDate.toDate) {
            launchDate = deploymentDate.toDate();
          } else if (deploymentDate && typeof deploymentDate === 'object' && deploymentDate.seconds) {
            launchDate = new Date(deploymentDate.seconds * 1000);
          } else {
            // Default date if parsing fails
            launchDate = new Date('2025-04-27T12:00:00');
          }
          
          // Check if the launch date has passed
          const now = new Date();
          if (now >= launchDate) {
            // Launch date has passed, redirect to main site
            console.log('Launch date has passed, redirecting to main site');
            enterWebsite();
          } else {
            // Launch date hasn't passed yet, show countdown
            setIsCheckingDate(false);
          }
        } else {
          // No settings found, show countdown
          setIsCheckingDate(false);
        }
      } catch (error) {
        console.error('Error checking launch date:', error);
        // On error, show countdown
        setIsCheckingDate(false);
      }
    };
    
    checkLaunchDate();
    */
  }, [navigate, enterWebsite]);

  // This function will be passed to the CountdownTimer component
  // to let the parent component know when launch has occurred
  const handleLaunchComplete = (launched) => {
    if (launched) {
      // Immediately start the transition animation
      enterWebsite();
    }
  };

  // Show loading state while checking date
  if (isCheckingDate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-secondary-light to-white">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <p className="text-primary text-lg font-medium mt-4">Loading</p>
      </div>
    );
  }

  // The original countdown timer UI is preserved below but won't be rendered during development
  // because we're immediately navigating to the home page
  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-secondary-light to-white 
      transition-all duration-1000 ease-in-out ${isAnimating ? 'opacity-0 -translate-y-full' : 'opacity-100'}`}
    >
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-primary/5 -top-20 -left-20"></div>
        <div className="absolute w-64 h-64 rounded-full bg-primary/10 top-1/4 right-10 animate-pulse"></div>
        <div className="absolute w-40 h-40 rounded-full bg-secondary/10 bottom-20 left-20"></div>
        
        {/* Floating Paw Prints */}
        <div className="absolute w-12 h-12 opacity-20 top-1/3 left-1/3 animate-bounce" style={{ animationDuration: '8s' }}>
          <svg viewBox="0 0 512 512" fill="currentColor" className="text-primary">
            <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5.3-86.2 32.6-96.8S212.2 50 226.5 92.9zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z"/>
          </svg>
        </div>
        <div className="absolute w-16 h-16 opacity-10 top-2/3 right-1/4 animate-bounce" style={{ animationDuration: '12s', animationDelay: '2s' }}>
          <svg viewBox="0 0 512 512" fill="currentColor" className="text-primary-dark">
            <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5.3-86.2 32.6-96.8S212.2 50 226.5 92.9zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z"/>
          </svg>
        </div>
      </div>
      
      {/* Logo */}
      <div className="mb-12 z-10">
        <img 
          src="/petzify-logo.png" 
          alt="Petzify Logo" 
          className="w-40 h-40 object-contain animate-fadeIn"
        />
      </div>
      
      {/* Countdown Timer Component */}
      {/* Commented out for development */}
      {/* 
      <div className="w-full max-w-5xl z-10">
        <CountdownTimer 
          onLaunchComplete={handleLaunchComplete} 
          isLandingPage={true}
        />
      </div>
      */}
      
      {/* Added for development - "Enter Website" button */}
      <button
        onClick={enterWebsite}
        className="px-8 py-3 bg-primary text-white rounded-lg font-semibold shadow-lg hover:bg-primary-dark transition-colors z-10"
      >
        Enter Website
      </button>
    </div>
  );
};

export default LaunchPage; 