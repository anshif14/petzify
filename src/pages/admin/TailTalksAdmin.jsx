import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc, 
  updateDoc, deleteDoc, serverTimestamp, where, addDoc, increment 
} from 'firebase/firestore';
import { app } from '../../firebase/config';
import { useUser } from '../../context/UserContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FaTrash, FaComment, FaFlag, FaCheck, FaEdit, FaPaperPlane, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
// Import Petzify logo for admin comments
import petzifyLogo from '../../assets/images/Petzify Logo-05 (3).png';

const TailTalksAdmin = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [commentsVisible, setCommentsVisible] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showCommentDeleteConfirm, setShowCommentDeleteConfirm] = useState({ postId: null, commentId: null });

  useEffect(() => {
    // No admin validation
    fetchPosts();
  }, [activeFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const postsRef = collection(db, 'tailtalks');
      
      let q;
      if (activeFilter === 'all') {
        q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
      } else if (activeFilter === 'questions') {
        q = query(postsRef, where('isQuestion', '==', true), orderBy('createdAt', 'desc'), limit(20));
      } else if (activeFilter === 'flagged') {
        q = query(postsRef, where('isFlagged', '==', true), orderBy('createdAt', 'desc'), limit(20));
      }
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postsData = [];
      for (const doc of querySnapshot.docs) {
        const postData = {
          id: doc.id,
          ...doc.data()
        };
        
        // Fetch comments for each post
        const commentsRef = collection(db, 'tailtalks', doc.id, 'comments');
        const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
        const commentsSnapshot = await getDocs(commentsQuery);
        
        const comments = commentsSnapshot.docs.map(commentDoc => ({
          id: commentDoc.id,
          ...commentDoc.data()
        }));
        
        postData.comments = comments;
        postsData.push(postData);
      }

      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      await deleteDoc(doc(db, 'tailtalks', postId));
      
      // Remove from state
      setPosts(posts.filter(post => post.id !== postId));
      toast.success('Post deleted successfully');
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setLoading(false);
    }
  };

  const toggleComments = (postId) => {
    setCommentsVisible(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      // Convert Firestore timestamp to Date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      // Format date
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Unknown date';
    }
  };

  const handleAddComment = async (postId) => {
    if (!commentInputs[postId] || commentInputs[postId].trim() === '') {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setCommentSubmitting(true);
      const db = getFirestore(app);
      
      // Add new comment
      const commentData = {
        text: commentInputs[postId],
        authorId: currentUser?.id || 'admin',
        authorName: 'Petzify', // Use admin name
        authorPhotoURL: null, // We'll use the petzifyLogo directly in the UI
        createdAt: serverTimestamp(),
        isAdmin: true, // Mark as admin comment
        isVerified: true // Add verification status
      };
      
      const commentsRef = collection(db, 'tailtalks', postId, 'comments');
      const commentDocRef = await addDoc(commentsRef, commentData);
      
      // Update post's comment count
      const postRef = doc(db, 'tailtalks', postId);
      await updateDoc(postRef, {
        commentCount: increment(1),
        lastActivity: serverTimestamp()
      });
      
      // Update local state
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          // Add new comment to the post
          const newComment = {
            id: commentDocRef.id,
            ...commentData,
            createdAt: new Date() // Use current date for immediate display
          };
          
          return {
            ...post,
            commentCount: (post.commentCount || 0) + 1,
            comments: [newComment, ...(post.comments || [])]
          };
        }
        return post;
      });
      
      setPosts(updatedPosts);
      
      // Clear input
      setCommentInputs(prev => ({
        ...prev,
        [postId]: ''
      }));
      
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Delete the comment document
      await deleteDoc(doc(db, 'tailtalks', postId, 'comments', commentId));
      
      // Update post's comment count
      const postRef = doc(db, 'tailtalks', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1)
      });
      
      // Update local state
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            commentCount: Math.max(0, (post.commentCount || 1) - 1),
            comments: (post.comments || []).filter(comment => comment.id !== commentId)
          };
        }
        return post;
      });
      
      setPosts(updatedPosts);
      setShowCommentDeleteConfirm({ postId: null, commentId: null });
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentInputChange = (postId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: value
    }));
  };

  // Render post card with admin controls
  const renderPostCard = (post) => {
    const isCommentVisible = commentsVisible[post.id] || false;
    
    return (
      <div key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden mb-4 relative">
        {/* Admin Actions */}
        <div className="absolute top-2 right-2 flex space-x-2 z-10">
          <button 
            className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"
            onClick={() => setShowDeleteConfirm(post.id)}
          >
            <FaTrash size={16} />
          </button>
        </div>
        
        {/* Delete Confirmation Popup */}
        {showDeleteConfirm === post.id && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-20 p-4">
            <p className="font-medium mb-4 text-center">Are you sure you want to delete this post?</p>
            <div className="flex space-x-4">
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded-md"
                onClick={() => handleDeletePost(post.id)}
              >
                Delete
              </button>
              <button 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Post Header */}
        <div className="p-4">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
              {post.authorPhotoURL ? (
                <img src={post.authorPhotoURL} alt={post.authorName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-primary">
                  {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'A'}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start">
              <p className="font-medium text-sm">{post.authorName || 'Anonymous'}</p>
              <p className="text-xs text-gray-500 text-left">{formatDate(post.createdAt)}</p>
            </div>
          </div>

          {/* Post Content */}
          <div className="cursor-pointer" onClick={() => navigate(`/tailtalk/post/${post.id}`)}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-left">{post.title || 'Untitled Post'}</h3>
            </div>

            {post.content && (
              <p className="text-gray-700 mb-3 text-left">{post.content}</p>
            )}

            {/* Post Media */}
            {post.type === 'image' && post.imageUrl && (
              <div className="rounded-lg overflow-hidden mb-3">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full object-cover max-h-80"
                />
              </div>
            )}
          </div>

          {/* Post Stats */}
          <div className="flex justify-between items-center text-xs text-gray-500 py-2 border-t border-gray-100">
            <span>{post.likeCount || 0} likes</span>
            <div className="flex space-x-3">
              <span>{post.commentCount || 0} comments</span>
              <span>{post.shareCount || 0} shares</span>
            </div>
          </div>

          {/* Admin Action Buttons */}
          <div className="flex border-t border-gray-100 pt-2">
            <button
              className="flex-1 flex items-center justify-center py-1 text-gray-600 hover:bg-gray-50 rounded-md"
              onClick={() => toggleComments(post.id)}
            >
              <FaComment className="mr-2" />
              <span>{isCommentVisible ? 'Hide Comments' : 'View Comments'}</span>
            </button>
          </div>
        </div>

        {/* Comments Section - Toggle Visibility */}
        {isCommentVisible && (
          <div className="bg-gray-50 p-3 border-t border-gray-100">
            {/* Admin Comment Form */}
            <div className="mb-4 bg-white rounded-lg shadow-sm p-3">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                  <img src={petzifyLogo} alt="Petzify" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-center">
                  Comment as <span className="mx-1 font-semibold">Petzify</span>
                </div>
              </div>
              <div className="flex">
                <textarea
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                  placeholder="Write an official comment as Petzify..."
                  className="flex-grow border rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={2}
                />
                <button
                  onClick={() => handleAddComment(post.id)}
                  disabled={commentSubmitting}
                  className="bg-primary text-white rounded-r-lg px-4 flex items-center justify-center hover:bg-primary-dark transition-colors"
                >
                  {commentSubmitting ? <LoadingSpinner size="sm" /> : <FaPaperPlane />}
                </button>
              </div>
            </div>
            
            {/* Comments List */}
            {post.comments && post.comments.length > 0 ? (
              <div>
                {post.comments.map(comment => (
                  <div key={comment.id} className="flex items-start mb-3 relative group">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 overflow-hidden flex-shrink-0">
                      {comment.isAdmin ? (
                        // Petzify logo for admin comments
                        <img src={petzifyLogo} alt="Petzify" className="w-full h-full object-contain p-0.5" />
                      ) : comment.authorPhotoURL ? (
                        <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-gray-500 text-xs">
                          {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'A'}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow max-w-[90%]">
                      <div className={`rounded-2xl rounded-tl-none px-3 py-2 shadow-sm ${comment.isAdmin ? 'bg-blue-50' : 'bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-xs flex items-center">
                            {comment.authorName || 'Anonymous'}
                            {comment.isAdmin && (
                              <span className="ml-1 text-xs bg-primary text-white rounded-full px-2 py-0.5 flex items-center">
                                <FaCheckCircle className="mr-1" size={10} />
                                Verified Admin
                              </span>
                            )}
                          </p>
                          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-left text-gray-800 break-words">{comment.text || comment.content || 'No text'}</p>
                      </div>
                    </div>
                    
                    {/* Delete Comment Button */}
                    <button
                      className="p-1.5 bg-red-50 text-red-600 rounded-full absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setShowCommentDeleteConfirm({ postId: post.id, commentId: comment.id })}
                    >
                      <FaTimes size={12} />
                    </button>
                    
                    {/* Comment Delete Confirmation */}
                    {showCommentDeleteConfirm.postId === post.id && showCommentDeleteConfirm.commentId === comment.id && (
                      <div className="absolute right-0 top-0 bg-white shadow-md rounded-lg p-2 z-10">
                        <p className="text-xs mb-1">Delete this comment?</p>
                        <div className="flex space-x-2">
                          <button
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                            onClick={() => handleDeleteComment(post.id, comment.id)}
                          >
                            Delete
                          </button>
                          <button
                            className="text-xs bg-gray-200 px-2 py-1 rounded"
                            onClick={() => setShowCommentDeleteConfirm({ postId: null, commentId: null })}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-500">No comments yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10 mb-6">
        <h1 className="text-xl font-bold text-primary">Tail Talks Admin</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => fetchPosts()} 
            className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button 
            onClick={() => navigate('/admin/dashboard')} 
            className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Go to Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Filter Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeFilter === 'all' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveFilter('all')}
          >
            All Posts
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeFilter === 'questions' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveFilter('questions')}
          >
            Questions
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeFilter === 'flagged' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveFilter('flagged')}
          >
            Flagged
          </button>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <LoadingSpinner />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map(post => renderPostCard(post))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700 mb-2">No posts found</h2>
            <p className="text-gray-500 mb-4">There are no posts matching your current filter.</p>
            <button
              onClick={() => {
                setActiveFilter('all');
                fetchPosts();
              }}
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              View All Posts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TailTalksAdmin; 