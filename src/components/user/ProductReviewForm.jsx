import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';
import StarRating from '../common/StarRating';
import { useAlert } from '../../context/AlertContext';
import { useUser } from '../../context/UserContext';

const ProductReviewForm = ({ product, orderId, userId, userEmail, userName, onSuccess, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [userInfo, setUserInfo] = useState({
    userId: userId || null,
    userEmail: userEmail || null,
    userName: userName || 'Anonymous'
  });
  const { showSuccess, showError } = useAlert();
  const { currentUser } = useUser();
  
  // Get user info from context when component mounts
  useEffect(() => {
    console.log("Current user from context:", currentUser);
    
    if (currentUser) {
      setUserInfo({
        userId: currentUser.id || userId,
        userEmail: currentUser.email || userEmail,
        userName: currentUser.name || userName || 'Anonymous'
      });
    }
    
    // Also get user from localStorage as fallback
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log("User from localStorage:", user);
        
        setUserInfo(prev => ({
          userId: prev.userId || user.id,
          userEmail: prev.userEmail || user.email,
          userName: prev.userName !== 'Anonymous' ? prev.userName : (user.name || 'Anonymous')
        }));
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
    }
  }, [currentUser, userId, userEmail, userName]);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const handleReviewChange = (e) => {
    setReviewText(e.target.value);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 3 images
    if (files.length + images.length > 3) {
      showError('You can only upload up to 3 images per review.', 'Error');
      return;
    }
    
    // Validate each file
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB max
      
      if (!isImage) {
        showError(`${file.name} is not a valid image file.`, 'Error');
      }
      
      if (!isValidSize) {
        showError(`${file.name} exceeds the 5MB size limit.`, 'Error');
      }
      
      return isImage && isValidSize;
    });
    
    if (validFiles.length === 0) return;
    
    // Add files to state
    setImages(prevImages => [...prevImages, ...validFiles]);
    
    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prevUrls => [...prevUrls, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = (index) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
    setImagePreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (images.length === 0) return [];
    
    setUploadStatus('uploading');
    const storage = getStorage(app);
    const imageUrls = [];
    
    try {
      for (const file of images) {
        const timestamp = new Date().getTime();
        const fileName = `product_reviews/${product.id}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        imageUrls.push(downloadUrl);
      }
      
      setUploadStatus('success');
      return imageUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      setUploadStatus('error');
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      showError('Please select a rating.', 'Missing Information');
      return;
    }
    
    try {
      setLoading(true);
      
      // Upload images first (if any)
      const imageUrls = await uploadImages();
      
      // Add review to Firestore
      const db = getFirestore(app);
      
      console.log("Saving review with user data:", userInfo);
      
      const reviewData = {
        productId: product.id,
        productName: product.name,
        orderId,
        rating,
        review: reviewText,
        images: imageUrls,
        createdAt: serverTimestamp(),
        userId: userInfo.userId,
        userEmail: userInfo.userEmail,
        userName: userInfo.userName
      };
      
      // Add review to productReviews collection only - don't update the order
      await addDoc(collection(db, 'productReviews'), reviewData);
      
      showSuccess('Thank you for your review!', 'Review Submitted');
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      showError('Failed to submit your review. Please try again.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-md p-4 shadow-sm">
      <h3 className="text-lg font-medium text-gray-800 mb-3">
        Review {product.name}
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rating*
          </label>
          <StarRating
            initialRating={rating}
            onRatingChange={handleRatingChange}
            disabled={loading}
          />
          {rating === 0 && (
            <p className="text-xs text-red-500 mt-1">Please select a rating</p>
          )}
        </div>
        
        <div className="mb-4">
          <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700 mb-1">
            Your Review
          </label>
          <textarea
            id="reviewText"
            name="reviewText"
            rows="4"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            placeholder="Share your experience with this product..."
            value={reviewText}
            onChange={handleReviewChange}
            disabled={loading}
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add Photos (Optional)
          </label>
          <div className="mt-1 flex items-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={loading || images.length >= 3}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-white
                hover:file:bg-primary-dark"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            You can upload up to 3 images (Max 5MB each)
          </p>
          
          {/* Image Previews */}
          {imagePreviewUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 object-cover rounded border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || rating === 0}
            className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading
                ? 'bg-primary-light cursor-not-allowed'
                : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

ProductReviewForm.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    index: PropTypes.number
  }).isRequired,
  orderId: PropTypes.string.isRequired,
  userId: PropTypes.string,
  userEmail: PropTypes.string,
  userName: PropTypes.string,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func
};

export default ProductReviewForm; 