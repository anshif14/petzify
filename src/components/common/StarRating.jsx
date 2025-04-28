import React, { useState } from 'react';
import PropTypes from 'prop-types';

const StarRating = ({ initialRating = 0, maxRating = 5, size = 'medium', onRatingChange, disabled = false }) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl'
  };

  const handleRatingClick = (newRating) => {
    if (disabled) return;
    setRating(newRating);
    if (onRatingChange) {
      onRatingChange(newRating);
    }
  };

  const getSizeClass = () => {
    return sizeClasses[size] || sizeClasses.medium;
  };

  return (
    <div className="flex items-center">
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={index}
            type="button"
            className={`${getSizeClass()} focus:outline-none ${
              disabled ? 'cursor-default' : 'cursor-pointer'
            } px-1`}
            onClick={() => handleRatingClick(starValue)}
            onMouseEnter={() => !disabled && setHoverRating(starValue)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            disabled={disabled}
            aria-label={`Rate ${starValue} of ${maxRating} stars`}
          >
            <span className={`${
              (hoverRating || rating) >= starValue
                ? 'text-yellow-400'
                : 'text-gray-300'
            }`}>
              ★
            </span>
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm text-gray-600">
          {rating} {rating === 1 ? 'star' : 'stars'}
        </span>
      )}
    </div>
  );
};

StarRating.propTypes = {
  initialRating: PropTypes.number,
  maxRating: PropTypes.number,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  onRatingChange: PropTypes.func,
  disabled: PropTypes.bool
};

export default StarRating; 