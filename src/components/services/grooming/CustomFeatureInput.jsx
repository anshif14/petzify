import React, { useState } from 'react';

const CustomFeatureInput = ({ initialFeatures = [], onChange }) => {
  const [features, setFeatures] = useState(initialFeatures);
  const [newFeature, setNewFeature] = useState('');
  const [error, setError] = useState('');

  const handleAddFeature = () => {
    // Trim the input to remove whitespace
    const trimmedFeature = newFeature.trim();
    
    // Validate input
    if (!trimmedFeature) {
      setError('Please enter a feature.');
      return;
    }
    
    // Check for duplicates
    if (features.some(feature => feature.toLowerCase() === trimmedFeature.toLowerCase())) {
      setError('This feature has already been added.');
      return;
    }
    
    // Add the new feature
    const updatedFeatures = [...features, trimmedFeature];
    setFeatures(updatedFeatures);
    setNewFeature('');
    setError('');
    
    // Notify parent component
    if (onChange) {
      onChange(updatedFeatures);
    }
  };

  const handleRemoveFeature = (index) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    setFeatures(updatedFeatures);
    
    // Notify parent component
    if (onChange) {
      onChange(updatedFeatures);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFeature();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="features" className="block text-sm font-medium text-gray-700 mb-1">
          Facility Features
        </label>
        <p className="text-sm text-gray-500 mb-2">
          Add features that your grooming center offers (e.g., Air conditioning, Waiting area, etc.)
        </p>
        
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="text"
              id="features"
              value={newFeature}
              onChange={(e) => {
                setNewFeature(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter a feature"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <button
            type="button"
            onClick={handleAddFeature}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Add
          </button>
        </div>
      </div>
      
      {/* Display added features */}
      {features.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Added Features:</h4>
          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center bg-white px-3 py-1 rounded-full border border-gray-300"
              >
                <span className="text-sm">{feature}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomFeatureInput; 