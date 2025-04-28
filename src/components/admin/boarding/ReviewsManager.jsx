import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, getFirestore, orderBy, limit, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import StarRating from '../../common/StarRating';
import { FiTrash2, FiAlertCircle, FiMessageCircle, FiCalendar, FiUser, FiSend, FiMessageSquare } from 'react-icons/fi';

const ReviewsManager = ({ adminData, boardingCenters }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [adminData, boardingCenters]);

  const fetchReviews = async () => {
    if (!adminData || !boardingCenters || boardingCenters.length === 0) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const db = getFirestore();
      const centerIds = boardingCenters.map(center => center.id);
      
      // Query for boardingRatings collection with centerId in our centers list
      const ratingsQuery = query(
        collection(db, 'boardingRatings'),
        where('centerId', 'in', centerIds),
        orderBy('ratedAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(ratingsQuery);
      const reviewsList = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reviewsList.push({
          id: doc.id,
          ...data,
          ratedAt: data.ratedAt?.toDate?.() || new Date(),
          // Map centerId to centerName
          centerName: boardingCenters.find(c => c.id === data.centerId)?.centerName || data.centerName || 'Unknown Center'
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
    setReplyText(review.adminReply?.text || '');
    setShowReviewDetails(true);
  };

  const closeReviewDetails = () => {
    setShowReviewDetails(false);
    setSelectedReview(null);
    setReplyText('');
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

  // For boarding admins, they can't delete reviews
  const handleReportInappropriate = (reviewId) => {
    toast.info('Review reported to administrators for review. Thank you!');
  };

  // Generate a short preview of the comment
  const getCommentPreview = (comment, maxLength = 100) => {
    if (!comment) return 'No comment provided';
    return comment.length > maxLength 
      ? `${comment.substring(0, maxLength)}...` 
      : comment;
  };

  // Handle replying to a review
  const handleReplySubmit = async () => {
    if (!selectedReview || !replyText.trim()) return;
    
    try {
      setReplying(true);
      const db = getFirestore();
      const reviewRef = doc(db, 'boardingRatings', selectedReview.id);
      
      // Get the current center name
      const centerName = boardingCenters.find(c => c.id === selectedReview.centerId)?.centerName || 'Boarding Center';
      
      // Update the review with the admin reply
      await updateDoc(reviewRef, {
        adminReply: {
          text: replyText.trim(),
          adminName: adminData.name || adminData.username || 'Boarding Admin',
          centerName: centerName,
          repliedAt: serverTimestamp()
        }
      });
      
      // Update the local state
      const updatedReview = {
        ...selectedReview,
        adminReply: {
          text: replyText.trim(),
          adminName: adminData.name || adminData.username || 'Boarding Admin',
          centerName: centerName,
          repliedAt: new Date()
        }
      };
      
      setSelectedReview(updatedReview);
      
      // Update the reviews list
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === selectedReview.id ? updatedReview : review
        )
      );
      
      toast.success('Your reply has been posted successfully');
    } catch (err) {
      console.error('Error replying to review:', err);
      toast.error('Failed to post reply. Please try again.');
    } finally {
      setReplying(false);
    }
  };

  const handleReplyChange = (e) => {
    setReplyText(e.target.value);
  };

  // Check if a review has a reply
  const hasReply = (review) => {
    return review.adminReply && review.adminReply.text;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Customer Reviews</h2>
        <button 
          onClick={fetchReviews}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Refresh Reviews
        </button>
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
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiMessageCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Reviews Found</h3>
          <p className="mt-1 text-gray-500">There are no customer reviews for your boarding center yet.</p>
        </div>
      ) : (
        <div>
          {/* Tile Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Review Header */}
                <div className="border-b border-gray-100 bg-gray-50 p-4 flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <FiUser className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{review.userName || 'Anonymous'}</h3>
                      <StarRating initialRating={review.rating} disabled={true} size="small" />
                    </div>
                  </div>
                  <div className="flex items-center">
                    {hasReply(review) ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Replied
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Needs Reply
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Review Content */}
                <div className="p-4 flex-grow">
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 line-clamp-3">{getCommentPreview(review.comment, 150)}</p>
                  </div>
                  
                  {/* Pet and Booking Info */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {review.petName && (
                      <div className="bg-blue-50 rounded-full px-3 py-1 text-xs text-blue-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {review.petName}
                      </div>
                    )}
                    {review.petType && (
                      <div className="bg-purple-50 rounded-full px-3 py-1 text-xs text-purple-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {review.petType}
                      </div>
                    )}
                  </div>
                  
                  {/* Review Image */}
                  {review.imageUrl && (
                    <div className="mb-3">
                      <div className="h-20 w-full rounded bg-gray-100 overflow-hidden">
                        <img src={review.imageUrl} alt="Review" className="h-full w-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Review Footer */}
                <div className="bg-gray-50 p-3 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-xs text-gray-500 flex items-center">
                    <FiCalendar className="mr-1 text-gray-400" />
                    {formatDate(review.ratedAt)}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleViewReview(review)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary-dark"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button 
                      onClick={() => handleReportInappropriate(review.id)}
                      className="inline-flex items-center px-3 py-1 border border-yellow-300 text-xs font-medium rounded text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                    >
                      <FiAlertCircle className="mr-1 h-3 w-3" />
                      Report
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Review Details Modal */}
      {showReviewDetails && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-4">
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
            
            <div className="mt-4 space-y-6">
              {/* Customer Info & Rating */}
              <div className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <FiUser className="mr-2 text-primary" />
                    {selectedReview.userName || 'Anonymous'}
                  </h4>
                  <p className="text-sm text-gray-500">{selectedReview.userEmail || 'No email'}</p>
                </div>
                <div className="text-right">
                  <StarRating initialRating={selectedReview.rating} disabled={true} />
                  <p className="text-sm text-gray-500 flex items-center justify-end mt-1">
                    <FiCalendar className="mr-1" />
                    {formatDate(selectedReview.ratedAt)}
                  </p>
                </div>
              </div>
              
              {/* Review Comment */}
              <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-3">
                  <FiMessageCircle className="text-primary mr-2" />
                  <h5 className="font-medium text-gray-900">Customer Review</h5>
                </div>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">
                    {selectedReview.comment || 'No comment provided'}
                  </p>
                </div>
              </div>
              
              {/* Review Image */}
              {selectedReview.imageUrl && (
                <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Attached Image
                  </h5>
                  <div className="rounded-md overflow-hidden border border-gray-200">
                    <img 
                      src={selectedReview.imageUrl} 
                      alt="Review" 
                      className="w-full max-h-64 object-contain" 
                    />
                  </div>
                </div>
              )}
              
              {/* Booking Details */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center mb-3">
                  <FiUser className="text-blue-500 mr-2" />
                  <h5 className="font-medium text-gray-900">Booking Details</h5>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-2 rounded">
                    <p className="text-sm text-gray-500">Pet Name</p>
                    <p className="font-medium">{selectedReview.petName || 'Not specified'}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="text-sm text-gray-500">Pet Type</p>
                    <p className="font-medium">{selectedReview.petType || 'Not specified'}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="text-sm text-gray-500">Booking ID</p>
                    <p className="font-medium text-xs">{selectedReview.bookingId || 'Not available'}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="text-sm text-gray-500">Booking Date</p>
                    <p className="font-medium">
                      {selectedReview.bookingDate ? formatDate(selectedReview.bookingDate) : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Admin Reply Section */}
              <div className="bg-green-50 rounded-lg border border-green-100 overflow-hidden">
                <div className="bg-green-100 p-3 border-b border-green-200">
                  <div className="flex items-center">
                    <FiMessageSquare className="text-green-600 mr-2" />
                    <h5 className="font-medium text-gray-900">Your Response</h5>
                  </div>
                </div>
                
                <div className="p-4">
                  {selectedReview.adminReply && selectedReview.adminReply.text ? (
                    <div className="mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-700">Current Reply:</p>
                        <p className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded-full">
                          {selectedReview.adminReply.repliedAt ? formatDate(selectedReview.adminReply.repliedAt instanceof Date ? 
                            selectedReview.adminReply.repliedAt : 
                            selectedReview.adminReply.repliedAt.toDate()) : 'Just now'}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-gray-700 whitespace-pre-line">
                          {selectedReview.adminReply.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            You haven't responded to this review yet. Adding a thoughtful response shows customers you value their feedback.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <label htmlFor="replyText" className="block text-sm font-medium text-gray-700 mb-2">
                      {selectedReview.adminReply && selectedReview.adminReply.text ? 'Edit your reply:' : 'Add a reply:'}
                    </label>
                    <textarea
                      id="replyText"
                      rows="4"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                      placeholder="Thank the customer for their feedback, address their concerns, or provide additional context..."
                      value={replyText}
                      onChange={handleReplyChange}
                    ></textarea>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={handleReplySubmit}
                      disabled={replying || !replyText.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replying ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FiSend className="mr-2" />
                          {selectedReview.adminReply && selectedReview.adminReply.text ? 'Update Reply' : 'Post Reply'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <button
                  onClick={() => handleReportInappropriate(selectedReview.id)}
                  className="inline-flex items-center px-4 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <FiAlertCircle className="mr-2" />
                  Report Inappropriate
                </button>
                
                <button
                  onClick={closeReviewDetails}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsManager; 