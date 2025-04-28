import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, getFirestore, orderBy, limit, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import StarRating from '../common/StarRating';
import { FiTrash2, FiAlertCircle, FiMessageCircle, FiCalendar, FiUser, FiSearch, FiFilter, FiHome, FiMessageSquare } from 'react-icons/fi';

const ReviewsAdminManager = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    minRating: 0,
    maxRating: 5,
    centerName: '',
    showFlagged: false
  });
  const [centers, setCenters] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchReviews();
    fetchBoardingCenters();
  }, []);

  const fetchBoardingCenters = async () => {
    try {
      const db = getFirestore();
      const centerQuery = query(
        collection(db, 'petBoardingCenters'),
        where('status', '==', 'approved')
      );
      
      const snapshot = await getDocs(centerQuery);
      const centersList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().centerName || 'Unknown Center',
        ...doc.data()
      }));
      
      setCenters(centersList);
    } catch (err) {
      console.error('Error fetching boarding centers:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const db = getFirestore();
      
      // Query for boardingRatings collection
      const ratingsQuery = query(
        collection(db, 'boardingRatings'),
        orderBy('ratedAt', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(ratingsQuery);
      const reviewsList = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reviewsList.push({
          id: doc.id,
          ...data,
          ratedAt: data.ratedAt?.toDate?.() || new Date(),
          flagged: data.flagged || false
        });
      });
      
      setReviews(reviewsList);
      console.log(`Loaded ${reviewsList.length} reviews`);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setShowReviewDetails(true);
  };

  const closeReviewDetails = () => {
    setShowReviewDetails(false);
    setSelectedReview(null);
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteReview = async (reviewId) => {
    // Set the review to delete for confirmation
    setConfirmDelete(reviewId);
  };

  const confirmDeleteReview = async () => {
    if (!confirmDelete) return;
    
    try {
      setDeleteLoading(true);
      const db = getFirestore();
      
      // First check if the review exists
      const reviewRef = doc(db, 'boardingRatings', confirmDelete);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) {
        toast.error('Review not found');
        setDeleteLoading(false);
        setConfirmDelete(null);
        return;
      }
      
      // Get the review data to also update the booking
      const reviewData = reviewDoc.data();
      
      // Delete the review
      await deleteDoc(reviewRef);
      
      // Also update the booking if we have a bookingId
      if (reviewData.bookingId) {
        const bookingRef = doc(db, 'petBoardingBookings', reviewData.bookingId);
        const bookingDoc = await getDoc(bookingRef);
        
        if (bookingDoc.exists()) {
          // Update the booking to remove rating info
          await updateDoc(bookingRef, {
            rating: null,
            review: null,
            reviewImageUrl: null,
            ratedAt: null
          });
        }
      }
      
      // Update local state
      setReviews(prevReviews => 
        prevReviews.filter(review => review.id !== confirmDelete)
      );
      
      // If the deleted review was the selected one, close the details panel
      if (selectedReview && selectedReview.id === confirmDelete) {
        closeReviewDetails();
      }
      
      toast.success('Review deleted successfully');
    } catch (err) {
      console.error('Error deleting review:', err);
      toast.error('Failed to delete review');
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  // Generate a short preview of the comment
  const getCommentPreview = (comment, maxLength = 100) => {
    if (!comment) return 'No comment provided';
    return comment.length > maxLength 
      ? `${comment.substring(0, maxLength)}...` 
      : comment;
  };

  // Filter reviews based on current filter options
  const filteredReviews = reviews.filter(review => {
    // Filter by rating range
    if (review.rating < filterOptions.minRating || review.rating > filterOptions.maxRating) {
      return false;
    }
    
    // Filter by center name
    if (filterOptions.centerName && 
        !review.centerName?.toLowerCase().includes(filterOptions.centerName.toLowerCase())) {
      return false;
    }
    
    // Filter flagged reviews
    if (filterOptions.showFlagged && !review.flagged) {
      return false;
    }
    
    return true;
  });

  // Check if a review has a reply
  const hasReply = (review) => {
    return review.adminReply && review.adminReply.text;
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilterOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">All Boarding Center Reviews</h2>
        <button 
          onClick={fetchReviews}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Refresh Reviews
        </button>
      </div>
      
      {/* Filters */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-2">
          <FiFilter className="mr-2 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-700">Filter Reviews</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Rating
            </label>
            <select
              name="minRating"
              value={filterOptions.minRating}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="0">Any</option>
              <option value="1">1 Star</option>
              <option value="2">2 Stars</option>
              <option value="3">3 Stars</option>
              <option value="4">4 Stars</option>
              <option value="5">5 Stars</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Rating
            </label>
            <select
              name="maxRating"
              value={filterOptions.maxRating}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Boarding Center
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiHome className="text-gray-400" />
              </div>
              <input
                type="text"
                name="centerName"
                value={filterOptions.centerName}
                onChange={handleFilterChange}
                placeholder="Filter by center name"
                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              />
            </div>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="showFlagged"
                checked={filterOptions.showFlagged}
                onChange={handleFilterChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="ml-2">Show Flagged Only</span>
            </label>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex items-center">
            <FiAlertCircle className="text-red-400 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiMessageCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Reviews Found</h3>
          <p className="mt-1 text-gray-500">
            {reviews.length > 0 
              ? 'No reviews match your current filters. Try adjusting your search criteria.'
              : 'There are no customer reviews for any boarding centers yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="mb-4 text-sm text-gray-500">
            Showing {filteredReviews.length} of {reviews.length} total reviews
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReviews.map((review) => (
                <tr key={review.id} className={`hover:bg-gray-50 ${review.flagged ? 'bg-yellow-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <FiUser className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{review.userName || 'Anonymous'}</div>
                        <div className="text-sm text-gray-500">{review.userEmail || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{review.centerName || 'Unknown Center'}</div>
                    <div className="text-xs text-gray-500 truncate">ID: {review.centerId || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StarRating initialRating={review.rating} disabled={true} size="small" />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{getCommentPreview(review.comment)}</p>
                    {review.imageUrl && (
                      <div className="mt-1 flex">
                        <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden">
                          <img src={review.imageUrl} alt="Review" className="h-full w-full object-cover" />
                        </div>
                      </div>
                    )}
                    {hasReply(review) && (
                      <div className="mt-1">
                        <span className="text-xs font-medium text-green-600 flex items-center">
                          <FiMessageSquare className="mr-1" />
                          Replied by center
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <FiCalendar className="mr-2 text-gray-400" />
                      {formatDate(review.ratedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleViewReview(review)}
                      className="text-primary hover:text-primary-dark mr-3"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Review Details Modal */}
      {showReviewDetails && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-gray-900">Review Details</h3>
              <button
                onClick={closeReviewDetails}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedReview.userName || 'Anonymous'}</h4>
                  <p className="text-sm text-gray-500">{selectedReview.userEmail || 'No email'}</p>
                </div>
                <div className="text-right">
                  <StarRating initialRating={selectedReview.rating} disabled={true} />
                  <p className="text-sm text-gray-500">{formatDate(selectedReview.ratedAt)}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-md mb-4 p-4">
                <h5 className="font-medium text-gray-900 mb-1">Boarding Center</h5>
                <p className="text-gray-800">{selectedReview.centerName || 'Unknown Center'}</p>
                <p className="text-xs text-gray-500">ID: {selectedReview.centerId || 'N/A'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex items-center mb-2">
                  <FiMessageCircle className="text-gray-500 mr-2" />
                  <h5 className="font-medium text-gray-900">Review Comment</h5>
                </div>
                <p className="text-gray-700 whitespace-pre-line">
                  {selectedReview.comment || 'No comment provided'}
                </p>
              </div>
              
              {/* Admin Reply Section */}
              {selectedReview.adminReply && selectedReview.adminReply.text && (
                <div className="bg-green-50 p-4 rounded-md mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FiMessageSquare className="text-green-600 mr-2" />
                      <h5 className="font-medium text-gray-900">Center's Response</h5>
                    </div>
                    <p className="text-xs text-gray-500">
                      {selectedReview.adminReply.repliedAt ? 
                        formatDate(selectedReview.adminReply.repliedAt instanceof Date ? 
                          selectedReview.adminReply.repliedAt : 
                          selectedReview.adminReply.repliedAt.toDate()) : 'Date unknown'}
                    </p>
                  </div>
                  <div className="bg-white rounded p-3 mb-1">
                    <p className="text-gray-700 whitespace-pre-line">{selectedReview.adminReply.text}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Replied by: {selectedReview.adminReply.adminName || 'Boarding Center Admin'}
                  </p>
                </div>
              )}
              
              {selectedReview.imageUrl && (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Attached Image</h5>
                  <div className="rounded-md overflow-hidden">
                    <img 
                      src={selectedReview.imageUrl} 
                      alt="Review" 
                      className="w-full max-h-64 object-contain" 
                    />
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-center mb-2">
                  <FiUser className="text-blue-500 mr-2" />
                  <h5 className="font-medium text-gray-900">Booking Details</h5>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-500">Pet Name</p>
                    <p className="font-medium">{selectedReview.petName || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pet Type</p>
                    <p className="font-medium">{selectedReview.petType || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Booking ID</p>
                    <p className="font-medium text-xs">{selectedReview.bookingId || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Booking Date</p>
                    <p className="font-medium">
                      {selectedReview.bookingDate ? formatDate(selectedReview.bookingDate) : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => handleDeleteReview(selectedReview.id)}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <FiTrash2 className="mr-2" />
                  Delete Review
                </button>
                
                <button
                  onClick={closeReviewDetails}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="text-center">
              <FiAlertCircle className="mx-auto h-14 w-14 text-red-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Confirm Deletion</h3>
              <p className="mt-2 text-gray-500">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={cancelDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteReview}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                >
                  {deleteLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsAdminManager; 