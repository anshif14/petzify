import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { addInterestedUser, initInterestedUsersCollection } from '../../firebase/initInterestedUsers';

const CountdownTimer = ({ onLaunchComplete, isLandingPage = false }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [launchDate, setLaunchDate] = useState(null);
  const [isLaunched, setIsLaunched] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch the launch date from Firebase
  useEffect(() => {
    const fetchLaunchDate = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'settings');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const deploymentDate = data.website_deployment;
          
          console.log('Fetched deployment date:', deploymentDate);
          
          // Handle different possible date formats from Firebase
          let parsedDate;
          if (typeof deploymentDate === 'string') {
            parsedDate = new Date(deploymentDate);
          } else if (deploymentDate && deploymentDate.toDate) {
            // Handle Firestore Timestamp objects
            parsedDate = deploymentDate.toDate();
          } else if (deploymentDate && typeof deploymentDate === 'object' && deploymentDate.seconds) {
            // Handle Firestore timestamp-like objects
            parsedDate = new Date(deploymentDate.seconds * 1000);
          } else {
            // Fallback to a default date
            console.error('Invalid deployment date format:', deploymentDate);
            parsedDate = new Date('2025-04-27T12:00:00');
          }
          
          console.log('Parsed date:', parsedDate);
          setLaunchDate(parsedDate);
          
          // Check if the launch date has passed
          const now = new Date();
          if (now >= parsedDate) {
            console.log('Launch date has already passed');
            setIsLaunched(true);
            setTimeLeft({
              days: 0,
              hours: 0,
              minutes: 0,
              seconds: 0
            });
            
            // Notify parent component through callback
            if (onLaunchComplete) {
              onLaunchComplete(true);
            }
          }
        } else {
          console.error('No launch date found in settings');
          // Fallback to a default date
          setLaunchDate(new Date('2025-04-27T12:00:00'));
        }
      } catch (error) {
        console.error('Error fetching launch date:', error);
        // Fallback to a default date
        setLaunchDate(new Date('2025-04-27T12:00:00'));
      }
    };

    fetchLaunchDate();
    
    // Initialize the interested users collection
    initInterestedUsersCollection()
      .then(() => console.log('Interested users collection initialized'))
      .catch(error => console.error('Error initializing interested users collection:', error));
  }, [onLaunchComplete]);

  // Update the countdown timer
  const calculateTimeLeft = useCallback(() => {
    if (!launchDate) return;
    
    const now = new Date();
    const difference = launchDate.getTime() - now.getTime();
    
    if (difference <= 0) {
      // We've reached or passed the launch date
      setIsLaunched(true);
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      });
      
      // Notify parent component through callback
      if (onLaunchComplete) {
        onLaunchComplete(true);
      }
      
      return;
    }
    
    // Calculate the time left
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    setTimeLeft({ days, hours, minutes, seconds });
  }, [launchDate, onLaunchComplete]);

  // Set up interval to update countdown
  useEffect(() => {
    if (!launchDate) return;
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Clean up interval
    return () => clearInterval(timer);
  }, [launchDate, calculateTimeLeft]);

  // Trigger animation when countdown reaches zero
  useEffect(() => {
    if (isLaunched && !isAnimating) {
      setIsAnimating(true);
      // Animation logic here if needed
    }
  }, [isLaunched, isAnimating]);

  // Handle interest form submission
  const handleSubmitInterest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Simple validation
      if (!email || !email.includes('@') || !email.includes('.')) {
        throw new Error('Please enter a valid email address');
      }
      
      // Add to Firebase collection using our helper function
      await addInterestedUser(email);
      
      setSubmitSuccess(true);
      setEmail('');
      
      // Close modal after a delay
      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting interest:', error);
      setSubmitError(error.message || 'Failed to submit your interest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format the launch date for display
  const formatLaunchDate = () => {
    if (!launchDate || !(launchDate instanceof Date) || isNaN(launchDate.getTime())) {
      return 'Loading launch date...';
    }
    
    return launchDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render countdown timer
  const renderCountdownUnit = (value, unit) => (
    <div className="flex flex-col items-center px-4 sm:px-6">
      <div className={`bg-white rounded-lg shadow-lg p-4 mb-2 w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center text-3xl sm:text-5xl font-bold text-primary-dark transform transition-transform duration-300 hover:scale-110 ${isLandingPage ? 'sm:w-28 sm:h-28' : ''}`}>
        {value}
      </div>
      <span className="text-sm sm:text-base font-medium uppercase text-gray-600">{unit}</span>
    </div>
  );

  // For use on landing page, we'll use a modified layout
  if (isLandingPage) {
    return (
      <div className="text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-primary mb-8 animate-fadeIn">
          We're Launching Soon!
        </h2>
        
        <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto mb-6 animate-fadeIn">
          Get ready for a revolutionary pet care experience. Our platform is coming to you on:
        </p>
        
        <p className="text-2xl sm:text-3xl font-semibold text-primary-dark mb-12 animate-fadeIn">
          {formatLaunchDate()}
        </p>
        
        <div className="max-w-4xl mx-auto mb-12 animate-fadeIn">
          <div className="flex justify-center space-x-4 sm:space-x-8">
            {renderCountdownUnit(timeLeft.days, 'Days')}
            {renderCountdownUnit(timeLeft.hours, 'Hours')}
            {renderCountdownUnit(timeLeft.minutes, 'Minutes')}
            {renderCountdownUnit(timeLeft.seconds, 'Seconds')}
          </div>
        </div>
        
        {!isLaunched && (
          <div className="mt-12">
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-primary hover:bg-primary-dark text-white text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-pulse"
              style={{ animationDuration: '3s' }}
            >
              Get Notified
            </button>
            <p className="text-gray-600 mt-4">
              Be among the first to know when we launch!
            </p>
          </div>
        )}
        
        {/* Modal for Email Collection */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl transform transition-all">
              <h3 className="text-2xl font-bold text-primary mb-4">Stay Updated</h3>
              
              {submitSuccess ? (
                <div className="text-center py-4">
                  <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <p className="text-gray-700 text-lg">Thank you for your interest!</p>
                  <p className="text-gray-600">We'll notify you when we launch.</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-6">
                    Enter your email to get notified when we launch. Be the first to experience our platform!
                  </p>
                  
                  {submitError && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
                      {submitError}
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmitInterest}>
                    <div className="mb-4">
                      <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular implementation for use on the home page
  return (
    <section className="py-16 bg-gradient-to-br from-secondary-light to-secondary-light/50 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute w-64 h-64 rounded-full bg-primary opacity-5 -top-20 -left-20"></div>
        <div className="absolute w-96 h-96 rounded-full bg-primary opacity-5 -bottom-40 -right-20"></div>
        <div className="absolute w-20 h-20 rounded-full bg-secondary opacity-10 bottom-20 left-1/4 animate-pulse"></div>
        <div className="absolute w-16 h-16 rounded-full bg-primary opacity-10 top-20 right-1/3 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4 animate-fadeIn">
            We're Launching Soon!
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto animate-fadeIn">
            Get ready for a revolutionary pet care experience. Our platform is coming to you on:
          </p>
          <p className="text-2xl font-semibold text-primary-dark mt-2 animate-fadeIn">
            {formatLaunchDate()}
          </p>
        </div>
        
        {!isLaunched ? (
          <div className={`max-w-4xl mx-auto ${isLaunched ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
            <div className="flex justify-center space-x-2 sm:space-x-4">
              {renderCountdownUnit(timeLeft.days, 'Days')}
              {renderCountdownUnit(timeLeft.hours, 'Hours')}
              {renderCountdownUnit(timeLeft.minutes, 'Minutes')}
              {renderCountdownUnit(timeLeft.seconds, 'Seconds')}
            </div>
            
            <div className="mt-12 text-center">
              <button
                onClick={() => setShowModal(true)}
                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                Show Interest
              </button>
              <p className="text-gray-600 mt-3">
                Be among the first to know when we launch!
              </p>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Modal for Email Collection */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl transform transition-all">
            <h3 className="text-2xl font-bold text-primary mb-4">Stay Updated</h3>
            
            {submitSuccess ? (
              <div className="text-center py-4">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p className="text-gray-700 text-lg">Thank you for your interest!</p>
                <p className="text-gray-600">We'll notify you when we launch.</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Enter your email to get notified when we launch. Be the first to experience our platform!
                </p>
                
                {submitError && (
                  <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
                    {submitError}
                  </div>
                )}
                
                <form onSubmit={handleSubmitInterest}>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default CountdownTimer; 