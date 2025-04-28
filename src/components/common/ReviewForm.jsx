import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app } from '../../firebase/config';
import StarRating from './StarRating';

const ReviewForm = ({ 
  initialRating = 0, 
  onSubmit, 
  loading = false, 
  bookingId = null,
  centerName = '' 
}) => {
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const handleReviewChange = (e) => {
    setReviewText(e.target.value);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.match('image.*')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should not exceed 5MB');
        return;
      }
      
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadStatus('idle');
      setUploadProgress(0);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;
    
    try {
      setUploadStatus('uploading');
      const storage = getStorage(app);
      const storageRef = ref(storage, `reviews/${bookingId}/${selectedImage.name}`);
      
      const uploadTask = uploadBytesResumable(storageRef, selectedImage);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          // Progress function
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          // Error function
          (error) => {
            console.error("Upload error:", error);
            setUploadStatus('error');
            reject(error);
          },
          // Complete function
          async () => {
            try {
              // Get the download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploadStatus('success');
              resolve(downloadURL);
            } catch (error) {
              console.error("Error getting download URL:", error);
              setUploadStatus('error');
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error("Error in upload setup:", error);
      setUploadStatus('error');
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    
    try {
      let imageUrl = null;
      
      // Upload image if one is selected
      if (selectedImage) {
        imageUrl = await uploadImage();
      }
      
      // If image upload failed but was attempted
      if (selectedImage && !imageUrl && uploadStatus === 'error') {
        alert('Image upload failed. Please try again or submit without an image.');
        return;
      }
      
      // Call the onSubmit function with the review data
      onSubmit({
        rating,
        reviewText,
        imageUrl
      });
      
    } catch (error) {
      console.error("Error submitting review:", error);
      alert('An error occurred while submitting your review');
    }
  };

  return (
    <div className="bg-white rounded-md p-4">
      <h3 className="text-lg font-medium text-gray-800 mb-3">
        Review your experience at {centerName}
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
            placeholder="Share your experience with this boarding center..."
            value={reviewText}
            onChange={handleReviewChange}
            disabled={loading}
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Photos
          </label>
          
          {imagePreview ? (
            <div className="relative mt-2 inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-32 h-32 object-cover rounded-md border border-gray-300" 
              />
              <button
                type="button"
                onClick={removeSelectedImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                disabled={loading}
              >
                ×
              </button>
              
              {uploadStatus === 'uploading' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                  <div className="text-white text-xs">{Math.round(uploadProgress)}%</div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="image-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                  >
                    <span>Upload an image</span>
                    <input
                      id="image-upload"
                      name="image-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={loading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-5">
          <button
            type="submit"
            disabled={loading || uploadStatus === 'uploading'}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading || uploadStatus === 'uploading'
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

ReviewForm.propTypes = {
  initialRating: PropTypes.number,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  bookingId: PropTypes.string,
  centerName: PropTypes.string
};

export default ReviewForm; 