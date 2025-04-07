import React from 'react';

const PageLoader = ({ message = "Loading...", size = "medium" }) => {
  // Size variants for the spinner
  const sizeClasses = {
    small: {
      container: "py-4",
      spinner: "w-8 h-8 border-2",
      text: "text-sm"
    },
    medium: {
      container: "py-8",
      spinner: "w-16 h-16 border-3",
      text: "text-base"
    },
    large: {
      container: "py-12",
      spinner: "w-24 h-24 border-4",
      text: "text-xl"
    }
  };
  
  const classes = sizeClasses[size] || sizeClasses.medium;
  
  return (
    <div className={`flex flex-col items-center justify-center ${classes.container}`}>
      <div className="mb-4">
        <div className={`${classes.spinner} border-primary border-t-transparent rounded-full animate-spin`}></div>
      </div>
      
      {message && (
        <p className={`text-gray-600 ${classes.text} text-center`}>{message}</p>
      )}
    </div>
  );
};

export default PageLoader; 