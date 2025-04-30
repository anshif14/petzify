import React, { useState } from 'react';
import PropTypes from 'prop-types';
import RatingDisplay from '../common/RatingDisplay';

const ProductReviewDisplay = ({ review }) => {
  const [activeImage, setActiveImage] = useState(null);
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    if (typeof date === 'object' && date.seconds) {
      // Handle Firestore timestamp
      date = new Date(date.seconds * 1000);
    } else if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const handleImageClick = (imageUrl) => {
    setActiveImage(imageUrl);
  };
  
  const handleCloseImage = () => {
    setActiveImage(null);
  };
  
  return (
    <div className="border border-gray-200 rounded-md p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="mb-1">
            <RatingDisplay 
              rating={review.rating} 
              showCount={false} 
              size="small" 
            />
          </div>
          <h4 className="font-medium">{review.userName || 'Anonymous'}</h4>
        </div>
        <div className="text-sm text-gray-500">
          {formatDate(review.createdAt)}
        </div>
      </div>
      
      {review.review && (
        <p className="text-gray-700 mt-2 whitespace-pre-line">
          {review.review}
        </p>
      )}
      
      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {review.images.map((imageUrl, index) => (
              <img 
                key={index}
                src={imageUrl}
                alt={`Review ${index + 1}`}
                className="review-image-thumbnail h-24 w-24 object-cover cursor-pointer rounded"
                onClick={() => handleImageClick(imageUrl)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Fullscreen Image Modal */}
      {activeImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={handleCloseImage}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
              onClick={handleCloseImage}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={activeImage} 
              alt="Review" 
              className="max-h-[90vh] max-w-full rounded shadow-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

ProductReviewDisplay.propTypes = {
  review: PropTypes.shape({
    rating: PropTypes.number.isRequired,
    review: PropTypes.string,
    userName: PropTypes.string,
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object,
      PropTypes.instanceOf(Date)
    ]),
    images: PropTypes.arrayOf(PropTypes.string)
  }).isRequired
};

export default ProductReviewDisplay; 