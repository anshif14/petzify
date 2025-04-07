import React from 'react';
import { Link } from 'react-router-dom';

const AppDownloadComing = ({ storeType = 'both' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-light to-white py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary p-6 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Petzify Mobile App</h1>
            <p className="text-lg">Coming to app stores soon!</p>
          </div>
          
          {/* Content */}
          <div className="p-8">
            {/* App Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-32 h-32 bg-primary-light rounded-3xl shadow-md flex items-center justify-center">
                <span className="text-6xl">🐾</span>
              </div>
            </div>
            
            {/* Message */}
            <div className="text-center mb-10">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                {storeType === 'ios' ? 'iOS App Coming Soon!' : 
                 storeType === 'android' ? 'Android App Coming Soon!' : 
                 'Mobile Apps Coming Soon!'}
              </h2>
              <p className="text-gray-600 mb-6">
                We're putting the finishing touches on our mobile app to bring you the best pet care experience on the go. Stay tuned for the launch!
              </p>
              
              {/* Animated Loading */}
              <div className="flex justify-center space-x-2 mb-8">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
            
            {/* Store Badges */}
            <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6">
              {(storeType === 'ios' || storeType === 'both') && (
                <div className="h-16 bg-black rounded-lg px-4 py-3 flex items-center space-x-2 opacity-75">
                  <div className="text-white text-3xl">
                    <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="1.5" fill="none">
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 2.122 2.12v.001L18.5 5.5v13.003a2 2 0 0 1-1.6 1.96l-.2.037h-10a2 2 0 0 1-1.995-1.85l-.005-.15v-13a2 2 0 0 1 1.85-1.995l.15-.005 1.5.001a2.12 2.12 0 0 1 2.122-2.12h.001L10.5 1.5z" stroke="white" fill="none"/>
                      <path d="M12.5 15.5v4" stroke="white"/>
                      <path d="M14.5 17.5h-4" stroke="white"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-white text-xs">Download on the</div>
                    <div className="text-white font-semibold text-xl">App Store</div>
                  </div>
                </div>
              )}
              
              {(storeType === 'android' || storeType === 'both') && (
                <div className="h-16 bg-black rounded-lg px-4 py-3 flex items-center space-x-2 opacity-75">
                  <div className="text-white text-3xl">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                      <path d="M17.523 15.343l2.969-5.143a.598.598 0 00-.219-.82.603.603 0 00-.821.218l-3.003 5.2-6.193.002-3.003-5.202a.6.6 0 00-.821-.218.598.598 0 00-.219.82l2.969 5.143-2.968 5.144c-.122.21-.049.482.161.604a.604.604 0 00.83-.162l3.009-5.21h6.215l3.009 5.21a.604.604 0 00.83.162c.21-.122.283-.393.161-.604l-2.967-5.144z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-white text-xs">GET IT ON</div>
                    <div className="text-white font-semibold text-xl">Google Play</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Notification Signup */}
            <div className="mt-12 text-center">
              <p className="text-gray-700 mb-4">Want to be notified when our app launches?</p>
              <div className="flex flex-col sm:flex-row justify-center max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="px-4 py-3 border border-gray-300 rounded-l-md sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-primary mb-2 sm:mb-0"
                />
                <button className="bg-primary text-white px-6 py-3 rounded-r-md sm:rounded-l-none hover:bg-primary-dark transition-colors">
                  Notify Me
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">We'll only use your email to notify you about our app launch.</p>
            </div>
            
            {/* Back button */}
            <div className="mt-8 text-center">
              <Link 
                to="/services" 
                className="text-primary hover:text-primary-dark underline transition-colors"
              >
                &larr; Back to Services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadComing; 