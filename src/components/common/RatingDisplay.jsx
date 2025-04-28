import React from 'react';
import PropTypes from 'prop-types';

const RatingDisplay = ({ rating, reviewCount, showCount = true, size = 'medium' }) => {
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-md',
    large: 'text-lg'
  };
  
  const getSizeClass = () => {
    return sizeClasses[size] || sizeClasses.medium;
  };
  
  // Convert to number and round to nearest half
  const roundedRating = Math.round(Number(rating) * 2) / 2;
  
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(roundedRating);
    const halfStar = roundedRating % 1 !== 0;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={`full-${i}`} className="text-yellow-400">★</span>
      );
    }
    
    // Add half star if needed
    if (halfStar) {
      stars.push(
        <span key="half" className="text-yellow-400 relative">
          <span className="absolute">★</span>
          <span className="text-gray-300 relative" style={{ clipPath: 'inset(0 0 0 50%)' }}>★</span>
        </span>
      );
    }
    
    // Add empty stars
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">★</span>
      );
    }
    
    return stars;
  };
  
  return (
    <div className="flex items-center">
      <div className={`flex ${getSizeClass()}`}>
        {renderStars()}
      </div>
      {showCount && (
        <span className="ml-1 text-sm text-gray-600">
          {roundedRating.toFixed(1)} {reviewCount !== undefined && `(${reviewCount})`}
        </span>
      )}
    </div>
  );
};

RatingDisplay.propTypes = {
  rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  reviewCount: PropTypes.number,
  showCount: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

export default RatingDisplay; 