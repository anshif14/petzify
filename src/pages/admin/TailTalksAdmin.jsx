import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [commentsVisible, setCommentsVisible] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showCommentDeleteConfirm, setShowCommentDeleteConfirm] = useState({ postId: null, commentId: null });
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [flaggedComments, setFlaggedComments] = useState([]);
  const [flagDetailsVisible, setFlagDetailsVisible] = useState(false);

  useEffect(() => {
    // Reset error state on component mount
    setError(null);
    // Fetch posts on mount
    fetchPosts();
    
    // Log debugging info
    console.log("TailTalksAdmin component mounted");
    console.log("Current path:", location.pathname);
    
  }, [activeFilter, location.pathname]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
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
      
      console.log("Fetching posts with filter:", activeFilter);
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("No posts found for filter:", activeFilter);
        setPosts([]);
        setLoading(false);
        return;
      }

      console.log("Found", querySnapshot.size, "posts");
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
      
      // Fetch flagged comments separately
      if (activeFilter === 'flagged') {
        const allFlaggedComments = [];
        for (const post of postsData) {
          const flaggedCommentsForPost = post.comments.filter(comment => comment.isFlagged);
          flaggedCommentsForPost.forEach(comment => allFlaggedComments.push({
            ...comment,
            postId: post.id,
            postTitle: post.title
          }));
        }
        setFlaggedComments(allFlaggedComments);
        console.log("Found", allFlaggedComments.length, "flagged comments");
      }
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load TailTalks data. Please try again.');
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

  const handleRemoveFlag = async (postId, commentId = null) => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      if (commentId) {
        // Remove flag from comment
        const commentRef = doc(db, 'tailtalks', postId, 'comments', commentId);
        await updateDoc(commentRef, {
          isFlagged: false,
          flagReason: null,
          flaggedBy: null,
          flaggedAt: null,
          resolvedBy: currentUser?.uid || 'admin',
          resolvedAt: serverTimestamp()
        });
        
        // Update state
        const updatedPosts = posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: post.comments.map(comment => {
                if (comment.id === commentId) {
                  return {
                    ...comment,
                    isFlagged: false,
                    flagReason: null
                  };
                }
                return comment;
              })
            };
          }
          return post;
        });
        
        setPosts(updatedPosts);
        setFlaggedComments(flaggedComments.filter(comment => !(comment.id === commentId && comment.postId === postId)));
        
        toast.success('Flag removed from comment');
      } else {
        // Remove flag from post
        const postRef = doc(db, 'tailtalks', postId);
        await updateDoc(postRef, {
          isFlagged: false,
          flagReason: null,
          flaggedBy: null,
          flaggedAt: null,
          resolvedBy: currentUser?.uid || 'admin',
          resolvedAt: serverTimestamp()
        });
        
        // Update state
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              isFlagged: false,
              flagReason: null
            };
          }
          return post;
        }));
        
        toast.success('Flag removed from post');
      }
      
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
      if (selectedComment?.id === commentId) {
        setSelectedComment(null);
      }
      setFlagDetailsVisible(false);
    } catch (error) {
      console.error('Error removing flag:', error);
      toast.error('Failed to remove flag');
    } finally {
      setLoading(false);
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
      
      // Update state
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            commentCount: Math.max(0, (post.commentCount || 1) - 1),
            comments: post.comments.filter(comment => comment.id !== commentId)
          };
        }
        return post;
      });
      
      setPosts(updatedPosts);
      setFlaggedComments(flaggedComments.filter(comment => !(comment.id === commentId && comment.postId === postId)));
      
      toast.success('Comment deleted successfully');
      setShowCommentDeleteConfirm({ postId: null, commentId: null });
      
      if (selectedComment?.id === commentId) {
        setSelectedComment(null);
        setFlagDetailsVisible(false);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
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

  const handleCommentInputChange = (postId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: value
    }));
  };

  const openFlagDetails = (item, type) => {
    if (type === 'post') {
      setSelectedPost(item);
      setSelectedComment(null);
    } else {
      setSelectedComment(item);
      setSelectedPost(posts.find(post => post.id === item.postId));
    }
    setFlagDetailsVisible(true);
  };

  const renderPostCard = (post) => {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <div className="p-4">
          <div className="flex justify-between">
            <h3 className="font-bold text-lg mb-2 text-left">{post.title}</h3>
            {post.isFlagged && (
              <button 
                onClick={() => openFlagDetails(post, 'post')}
                className="text-red-500 flex items-center text-sm"
              >
                <FaFlag className="mr-1" />
                Flagged
              </button>
            )}
          </div>
          
          <p className="text-gray-700 mb-4 text-left">{post.content}</p>
          
          {post.imageUrl && (
            <img src={post.imageUrl} alt={post.title} className="rounded-lg mb-4 max-h-60 object-cover" />
          )}
          
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <div>
              <span>By: {post.authorName || 'Anonymous'}</span>
              <span className="mx-2">•</span>
              <span>Posted: {formatDate(post.createdAt)}</span>
            </div>
            <div>
              {post.likeCount || 0} likes | {post.commentCount || 0} comments
            </div>
          </div>
          
          {/* Admin Actions */}
          <div className="flex justify-between mt-2 border-t pt-2">
            <div className="flex space-x-2">
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded flex items-center text-sm"
                onClick={() => toggleComments(post.id)}
              >
                <FaComment className="mr-1" />
                {commentsVisible[post.id] ? 'Hide Comments' : 'View Comments'}
              </button>
              
              {post.isFlagged && (
                <button
                  className="bg-green-500 text-white px-2 py-1 rounded flex items-center text-sm"
                  onClick={() => handleRemoveFlag(post.id)}
                >
                  <FaCheck className="mr-1" />
                  Ignore Flag
                </button>
              )}
            </div>
            
            <button
              className="bg-red-500 text-white px-2 py-1 rounded flex items-center text-sm"
              onClick={() => setShowDeleteConfirm(post.id)}
            >
              <FaTrash className="mr-1" />
              Delete Post
            </button>
          </div>
          
          {/* Delete Confirmation */}
          {showDeleteConfirm === post.id && (
            <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-red-600 font-medium mb-2">Are you sure you want to delete this post?</p>
              <div className="flex justify-end space-x-2">
                <button
                  className="bg-gray-200 px-3 py-1 rounded"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  onClick={() => handleDeletePost(post.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Comments Section */}
        {commentsVisible[post.id] && (
          <div className="bg-gray-50 p-4 border-t border-gray-100">
            <h4 className="font-medium mb-3">Comments</h4>
            
            {/* Add Comment Form */}
            <div className="flex mb-4">
              <input
                type="text"
                className="flex-grow border border-gray-300 rounded-l px-3 py-2"
                placeholder="Add an admin comment..."
                value={commentInputs[post.id] || ''}
                onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
              />
              <button
                className="bg-primary text-white px-4 py-2 rounded-r flex items-center"
                onClick={() => handleAddComment(post.id)}
                disabled={commentSubmitting}
              >
                {commentSubmitting ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <FaPaperPlane />
                )}
              </button>
            </div>
            
            {/* Comments List */}
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-3">
                {post.comments.map(comment => (
                  <div key={comment.id} className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mr-2 flex-shrink-0 flex items-center justify-center">
                      {comment.isVerified || comment.authorName === 'Petzify' ? (
                        <img src={petzifyLogo} alt="Petzify" className="w-full h-full object-contain p-0.5" />
                      ) : comment.authorPhotoURL ? (
                        <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-medium text-xs">
                          {comment.authorName?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className={`rounded-lg p-3 ${comment.isVerified ? 'bg-blue-50 border border-blue-100' : 'bg-gray-100'} ${comment.isFlagged ? 'border-red-300' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium text-sm">
                              {comment.authorName}
                            </span>
                            {comment.isVerified && (
                              <span className="text-primary ml-1">
                                <FaCheckCircle className="inline-block" size={12} />
                              </span>
                            )}
                            {comment.isFlagged && (
                              <button 
                                onClick={() => openFlagDetails(comment, 'comment')}
                                className="text-red-500 ml-2 flex items-center text-xs"
                              >
                                <FaFlag className="mr-1" />
                                Flagged
                              </button>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {comment.text || comment.content || 'No comment text'}
                        </p>
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex justify-end mt-1 space-x-2">
                        {comment.isFlagged && (
                          <button
                            className="text-green-500 text-xs flex items-center"
                            onClick={() => handleRemoveFlag(post.id, comment.id)}
                          >
                            <FaCheck className="mr-1" size={10} />
                            Ignore Flag
                          </button>
                        )}
                        <button
                          className="text-red-500 text-xs flex items-center"
                          onClick={() => setShowCommentDeleteConfirm({ postId: post.id, commentId: comment.id })}
                        >
                          <FaTrash className="mr-1" size={10} />
                          Delete
                        </button>
                      </div>
                      
                      {/* Delete Comment Confirmation */}
                      {showCommentDeleteConfirm.postId === post.id && 
                       showCommentDeleteConfirm.commentId === comment.id && (
                        <div className="mt-1 bg-red-50 border border-red-200 p-2 rounded text-xs">
                          <p className="text-red-600 font-medium mb-1">Delete this comment?</p>
                          <div className="flex justify-end space-x-2">
                            <button
                              className="bg-gray-200 px-2 py-1 rounded"
                              onClick={() => setShowCommentDeleteConfirm({ postId: null, commentId: null })}
                            >
                              Cancel
                            </button>
                            <button
                              className="bg-red-500 text-white px-2 py-1 rounded"
                              onClick={() => handleDeleteComment(post.id, comment.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center p-3">No comments yet.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFlagDetails = () => {
    if (!flagDetailsVisible) return null;
    
    if (selectedComment) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Flagged Comment</h3>
                <button onClick={() => setFlagDetailsVisible(false)} className="text-gray-500">
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">From post:</div>
                <div className="font-medium">{selectedPost?.title || 'Unknown Post'}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Comment:</div>
                <div className="p-3 bg-gray-100 rounded">{selectedComment.text}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Author:</div>
                <div>{selectedComment.authorName || 'Anonymous'}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Flag Reason:</div>
                <div className="p-2 bg-red-50 text-red-700 rounded">{selectedComment.flagReason || 'No reason provided'}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Flagged on:</div>
                <div>{formatDate(selectedComment.flaggedAt)}</div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  className="bg-green-500 text-white px-3 py-2 rounded flex items-center"
                  onClick={() => handleRemoveFlag(selectedPost.id, selectedComment.id)}
                >
                  <FaCheck className="mr-2" />
                  Ignore Flag
                </button>
                
                <button
                  className="bg-red-500 text-white px-3 py-2 rounded flex items-center"
                  onClick={() => {
                    setFlagDetailsVisible(false);
                    setShowCommentDeleteConfirm({ 
                      postId: selectedPost.id, 
                      commentId: selectedComment.id 
                    });
                  }}
                >
                  <FaTrash className="mr-2" />
                  Delete Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (selectedPost) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Flagged Post</h3>
                <button onClick={() => setFlagDetailsVisible(false)} className="text-gray-500">
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Title:</div>
                <div className="font-medium">{selectedPost.title}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Content:</div>
                <div className="p-3 bg-gray-100 rounded">{selectedPost.content}</div>
              </div>
              
              {selectedPost.imageUrl && (
                <div className="mb-4">
                  <img src={selectedPost.imageUrl} alt={selectedPost.title} className="rounded-lg max-h-60 object-cover" />
                </div>
              )}
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Author:</div>
                <div>{selectedPost.authorName || 'Anonymous'}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Flag Reason:</div>
                <div className="p-2 bg-red-50 text-red-700 rounded">{selectedPost.flagReason || 'No reason provided'}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Flagged on:</div>
                <div>{formatDate(selectedPost.flaggedAt)}</div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  className="bg-green-500 text-white px-3 py-2 rounded flex items-center"
                  onClick={() => handleRemoveFlag(selectedPost.id)}
                >
                  <FaCheck className="mr-2" />
                  Ignore Flag
                </button>
                
                <button
                  className="bg-red-500 text-white px-3 py-2 rounded flex items-center"
                  onClick={() => {
                    setFlagDetailsVisible(false);
                    setShowDeleteConfirm(selectedPost.id);
                  }}
                >
                  <FaTrash className="mr-2" />
                  Delete Post
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const renderFlaggedCommentsTable = () => {
    if (flaggedComments.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No flagged comments found
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flag Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {flaggedComments.map(comment => (
              <tr key={comment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-normal">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {comment.text}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-normal">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {comment.postTitle}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{comment.authorName || 'Anonymous'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-red-600">{comment.flagReason || 'Not specified'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openFlagDetails(comment, 'comment')}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleRemoveFlag(comment.postId, comment.id)}
                    className="text-green-600 hover:text-green-900 mr-3"
                  >
                    Ignore
                  </button>
                  <button
                    onClick={() => setShowCommentDeleteConfirm({postId: comment.postId, commentId: comment.id})}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">TailTalks Admin</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => setActiveFilter('questions')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'questions' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'
            }`}
          >
            Questions
          </button>
          <button
            onClick={() => setActiveFilter('flagged')}
            className={`px-4 py-2 rounded-lg ${
              activeFilter === 'flagged' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'
            }`}
          >
            Flagged Content
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
          <p className="ml-2 text-gray-600">Loading TailTalks content...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => fetchPosts()} 
            className="bg-red-600 text-white px-4 py-2 rounded-md ml-4"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeFilter === 'flagged' && (
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
              <div className="md:w-1/2">
                <h3 className="text-xl font-semibold mb-3">Flagged Posts</h3>
                {posts.filter(post => post.isFlagged).length === 0 ? (
                  <p className="text-gray-500">No flagged posts found.</p>
                ) : (
                  <div className="space-y-4">
                    {posts.filter(post => post.isFlagged).map(post => renderPostCard(post))}
                  </div>
                )}
              </div>
              <div className="md:w-1/2">
                <h3 className="text-xl font-semibold mb-3">Flagged Comments</h3>
                {flaggedComments.length === 0 ? (
                  <p className="text-gray-500">No flagged comments found.</p>
                ) : (
                  renderFlaggedCommentsTable()
                )}
              </div>
            </div>
          )}

          {activeFilter !== 'flagged' && (
            <>
              {posts.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <p className="text-gray-500 text-center">No posts found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map(post => renderPostCard(post))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {flagDetailsVisible && renderFlagDetails()}

      {/* Delete post confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3">Confirm Deletion</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePost(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete comment confirmation dialog */}
      {showCommentDeleteConfirm.postId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3">Confirm Deletion</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCommentDeleteConfirm({ postId: null, commentId: null })}
                className="px-4 py-2 bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleDeleteComment(
                    showCommentDeleteConfirm.postId,
                    showCommentDeleteConfirm.commentId
                  )
                }
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TailTalksAdmin; 