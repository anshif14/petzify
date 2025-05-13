import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs, addDoc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotification, NotificationProvider } from '../context/NotificationContext';

// Inner component that uses the notification context
const TailTalkPostDetailInner = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const notification = useNotification();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);

  // Safe notification function to prevent undefined errors
  const showNotification = (type, message) => {
    if (notification && notification[type]) {
      notification[type](message);
    } else {
      console.log(`${type}: ${message}`);
    }
  };

  useEffect(() => {
    fetchPost();
    
    if (isAuthenticated() && currentUser?.uid) {
      checkLikeStatus();
    }
  }, [postId, currentUser]);
  
  // Debug log for current comments
  useEffect(() => {
    console.log('Current comments in state:', comments);
  }, [comments]);
  
  const fetchPost = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      const docRef = doc(db, 'tailtalks', postId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const postData = docSnap.data();
        setPost({
          id: docSnap.id,
          ...postData,
          createdAt: postData.createdAt?.toDate() || new Date()
        });
        
        // Fetch comments after post is loaded
        fetchComments();
        
        // Fetch related posts based on tags
        if (postData.tags && postData.tags.length > 0) {
          fetchRelatedPosts(postData.tags);
        }
      } else {
        console.error('Post not found');
        // Handle 404 case
        navigate('/tailtalk', { replace: true });
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      showNotification('error', 'Failed to load post details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const db = getFirestore(app);
      
      // Clear comments first to avoid stale data
      setComments([]);
      
      const commentsRef = collection(db, 'tailtalks', postId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(30));
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No comments found for post:', postId);
        setComments([]);
        return;
      }
      
      const commentsData = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Raw comment data:', data);
        
        commentsData.push({
          id: doc.id,
          text: data.text || 'No comment text',
          authorId: data.authorId || 'anonymous',
          authorName: data.authorName || 'Anonymous',
          authorPhotoURL: data.authorPhotoURL || null,
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });
      
      console.log('Processed comments:', commentsData);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      showNotification('error', 'Failed to load comments');
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };
  
  const fetchRelatedPosts = async (tags) => {
    try {
      const db = getFirestore(app);
      const postsRef = collection(db, 'tailtalks');
      
      // For simplicity, we'll just get the most recent posts
      // In a production app, you'd implement a more sophisticated recommendation algorithm
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(5));
      
      const querySnapshot = await getDocs(q);
      const postsData = [];
      
      querySnapshot.forEach(doc => {
        // Don't include the current post
        if (doc.id !== postId) {
          const data = doc.data();
          postsData.push({
            id: doc.id,
            title: data.title || 'Untitled Post',
            authorName: data.authorName || 'Petzify Team',
            createdAt: data.createdAt?.toDate() || new Date(),
            imageUrl: data.imageUrl || null,
            likeCount: data.likeCount || 0
          });
        }
      });
      
      setRelatedPosts(postsData);
    } catch (error) {
      console.error('Error fetching related posts:', error);
    }
  };
  
  const checkLikeStatus = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const db = getFirestore(app);
      const userLikesRef = doc(db, 'user_likes', currentUser.uid);
      const docSnap = await getDoc(userLikesRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setIsLiked(userData.likedPosts && userData.likedPosts[postId] === true);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };
  
  const handleLike = async () => {
    if (!requireAuth('like this post')) {
      return;
    }
    
    try {
      const db = getFirestore(app);
      const postRef = doc(db, 'tailtalks', postId);
      const userLikesRef = doc(db, 'user_likes', currentUser.uid);
      
      // Optimistic UI update
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      
      // Update post in state
      setPost(prev => prev ? ({
        ...prev,
        likeCount: wasLiked ? Math.max(0, prev.likeCount - 1) : prev.likeCount + 1
      }) : null);
      
      // Verify post exists
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        throw new Error("Post does not exist!");
      }
      
      // Update in Firestore
      await updateDoc(postRef, {
        likeCount: increment(wasLiked ? -1 : 1)
      });
      
      const userLikesSnap = await getDoc(userLikesRef);
      
      if (userLikesSnap.exists()) {
        const userData = userLikesSnap.data();
        const likedPosts = userData.likedPosts || {};
        
        if (wasLiked) {
          delete likedPosts[postId];
        } else {
          likedPosts[postId] = true;
        }
        
        await updateDoc(userLikesRef, { likedPosts });
      } else {
        await setDoc(userLikesRef, {
          userId: currentUser.uid,
          likedPosts: { [postId]: !wasLiked }
        });
      }
      
      showNotification('success', wasLiked ? 'Post unliked' : 'Post liked');
    } catch (error) {
      console.error('Error updating like status:', error);
      
      // Revert UI changes
      setIsLiked(isLiked);
      setPost(prev => prev ? ({
        ...prev,
        likeCount: isLiked ? prev.likeCount : Math.max(0, prev.likeCount - 1)
      }) : null);
      
      showNotification('error', 'Failed to update like status. Please try again.');
    }
  };
  
  const handleAddComment = async () => {
    // Clear console for better debugging visibility
    console.clear();
    console.log('Starting comment submission');
    
    if (!requireAuth('comment on this post')) {
      console.log('Auth required - aborting');
      return;
    }
    
    const trimmedComment = commentText.trim();
    if (!trimmedComment) {
      showNotification('warning', 'Please enter a comment');
      return;
    }
    
    try {
      setSubmittingComment(true);
      
      // STEP 1: Prepare the comment data
      const commentData = {
        text: trimmedComment,
        authorId: currentUser?.uid || 'anonymous',
        authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
        authorPhotoURL: currentUser?.photoURL || null,
        createdAt: serverTimestamp()
      };
      
      console.log('Comment data to be saved:', commentData);
      
      // STEP 2: Add comment to Firestore
      const db = getFirestore(app);
      const commentsRef = collection(db, 'tailtalks', postId, 'comments');
      
      const docRef = await addDoc(commentsRef, commentData);
      console.log('Comment saved with ID:', docRef.id);
      
      // STEP 3: Update comment count on post
      const postRef = doc(db, 'tailtalks', postId);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });
      
      // STEP 4: Update UI
      // Add new comment to the list with client timestamp for immediate display
      const clientComment = {
        ...commentData,
        id: docRef.id,
        createdAt: new Date() // Use client date for immediate display
      };
      
      setComments(prev => [clientComment, ...prev]);
      
      // Update post comment count in state
      setPost(prev => prev ? {
        ...prev,
        commentCount: (prev.commentCount || 0) + 1
      } : null);
      
      // Clear comment input
      setCommentText('');
      
      showNotification('success', 'Comment added successfully');
      
      // Fetch all comments again to ensure everything is in sync after a delay
      setTimeout(() => {
        fetchComments();
      }, 1000);
      
    } catch (error) {
      console.error('Error adding comment:', error);
      showNotification('error', 'Failed to add comment: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmittingComment(false);
    }
  };
  
  const handleShare = async () => {
    try {
      console.log('Sharing post detail:', postId);
      
      // Update share count
      const db = getFirestore(app);
      const postRef = doc(db, 'tailtalks', postId);
      
      // Optimistic UI update
      setPost(prev => prev ? ({
        ...prev,
        shareCount: (prev.shareCount || 0) + 1
      }) : null);
      
      // Get the share URL
      const shareUrl = window.location.href;
      
      try {
        // Try to update in Firestore first
        await updateDoc(postRef, {
          shareCount: increment(1)
        });
        
        // Then try to share
        await handleShareContent(post.title, post.content, shareUrl);
        
      } catch (firestoreError) {
        console.error('Firestore error when sharing:', firestoreError);
        // Even if Firestore update fails, try to share
        await handleShareContent(post.title, post.content, shareUrl);
      }
      
    } catch (error) {
      console.error('Error sharing post:', error);
      
      // Revert UI update on error
      setPost(prev => prev ? ({
        ...prev,
        shareCount: Math.max(0, (prev.shareCount || 1) - 1)
      }) : null);
      
      // Show a more specific error message if possible
      if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
        showNotification('info', 'Share cancelled by user');
      } else if (error.message?.includes('share is not enabled')) {
        showNotification('info', 'Sharing is not supported on this device. Link copied to clipboard instead.');
      } else {
        showNotification('error', 'Failed to share post. Please try again.');
      }
    }
  };
  
  // Helper function to handle content sharing with proper fallbacks
  const handleShareContent = async (title, text, url) => {
    try {
      // Check if Web Share API is available and supported
      if (navigator.share) {
        console.log('Using Web Share API');
        await navigator.share({
          title: title || 'Petzify Post',
          text: text || 'Check out this post on Petzify!',
          url: url
        });
        showNotification('success', 'Post shared successfully!');
        return;
      }
      
      // If Web Share API is not available, try clipboard
      console.log('Web Share API not available, using clipboard');
      
      // Try to write to clipboard
      await navigator.clipboard.writeText(url);
      showNotification('success', 'Link copied to clipboard!');
      
    } catch (error) {
      console.error('Error in handleShareContent:', error);
      
      // Try one more fallback for clipboard
      if (error.name === 'NotAllowedError' || !navigator.clipboard) {
        try {
          // Create temporary input element
          const tempInput = document.createElement('input');
          tempInput.value = url;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          
          showNotification('success', 'Link copied to clipboard!');
        } catch (fallbackError) {
          console.error('Fallback clipboard error:', fallbackError);
          throw new Error('Unable to share or copy link');
        }
      } else {
        throw error; // Re-throw for the main handler to catch
      }
    }
  };
  
  const requireAuth = (action) => {
    if (!isAuthenticated() || !currentUser) {
      showNotification('warning', `Please sign in to ${action}`);
      
      // Redirect to login page after a delay
      setTimeout(() => {
        navigate('/login', { state: { from: `/tailtalk/post/${postId}` } });
      }, 1500);
      
      return false;
    }
    return true;
  };
  
  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    
    try {
      // Handle both Date objects and timestamps
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Recently';
      }
      
      const now = new Date();
      const diffMs = now - dateObj;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return dateObj.toLocaleDateString();
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Recently';
    }
  };
  
  // Add refreshing function for comments
  const refreshComments = async () => {
    try {
      console.log('Refreshing comments...');
      await fetchComments();
      showNotification('success', 'Comments refreshed');
    } catch (error) {
      console.error('Error refreshing comments:', error);
      showNotification('error', 'Failed to refresh comments');
    }
  };
  
  // Render comments section - simplified but robust
  const renderComments = () => {
    if (loadingComments) {
      return (
        <div className="py-6 flex justify-center">
          <LoadingSpinner />
        </div>
      );
    }
    
    if (!comments || comments.length === 0) {
      return (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="mt-2 text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="flex items-start">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 overflow-hidden flex-shrink-0">
              {comment.authorPhotoURL ? (
                <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-gray-500">
                  {comment.authorName?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              )}
            </div>
            <div className="flex-grow">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-left">{comment.authorName || 'Anonymous'}</p>
                  <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-left">{comment.text || "No text"}</p>
              </div>
              <div className="flex items-center mt-1 px-2 text-xs text-gray-500">
                <button className="mr-4 hover:text-primary">Like</button>
                <button className="hover:text-primary">Reply</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Replace the comments section in renderPostContent with this
  const renderCommentsSection = () => {
    return (
      <div className="bg-gray-50 p-4 border-t border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-left">Comments ({post?.commentCount || 0})</h3>
          <button 
            onClick={refreshComments}
            className="text-xs text-primary flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        {/* Comment Input */}
        <div className="flex items-start mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden flex-shrink-0">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-primary">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'P'}
              </span>
            )}
          </div>
          <div className="flex-grow flex items-center">
            <input
              id="comment-input"
              type="text"
              className="flex-grow bg-white border border-gray-200 rounded-l-full px-4 py-2 text-sm"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button 
              className="ml-0 p-2 text-white bg-primary rounded-r-full px-3"
              onClick={() => handleAddComment()}
              disabled={!commentText.trim() || submittingComment}
            >
              {submittingComment ? (
                <LoadingSpinner size="small" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Comments List */}
        {renderComments()}
      </div>
    );
  };

  // Update the renderPostContent function to use the new renderCommentsSection
  const renderPostContent = () => {
    if (!post) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
        {/* Post Header */}
        <div className="p-4">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
              {post.authorPhotoURL ? (
                <img src={post.authorPhotoURL} alt={post.authorName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-primary">
                  {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'P'}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-sm">
                {post.authorName}
                {post.authorName === 'Petzify Team' && (
                  <svg className="w-4 h-4 ml-1 inline text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                )}
              </p>
              <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
            </div>
          </div>
          
          {/* Post Title and Content */}
          <h1 className="text-xl font-bold mb-3 text-left">{post.title}</h1>
          
          {/* Post Content with Hashtag Styling */}
          {post.content && (
            <div className="text-gray-700 mb-4 text-left">
              {post.content.split(/(\s+)/).map((word, index) => 
                word.startsWith('#') ? (
                  <span key={index} className="font-bold text-primary">{word} </span>
                ) : (
                  <span key={index}>{word}</span>
                )
              )}
            </div>
          )}
          
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map(tag => (
                <span 
                  key={tag} 
                  className="text-sm font-bold text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Post Media */}
          {post.type === 'image' && post.imageUrl && (
            <div className="rounded-lg overflow-hidden mb-4">
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="w-full object-cover max-h-96" 
              />
            </div>
          )}
          
          {post.type === 'video' && post.videoUrl && (
            <div className="rounded-lg overflow-hidden mb-4">
              {post.videoUrl.includes('youtube.com') || post.videoUrl.includes('youtu.be') ? (
                <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={post.videoUrl.replace('watch?v=', 'embed/')}
                    title={post.title}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <video
                  src={post.videoUrl}
                  className="w-full"
                  controls
                  poster={post.thumbnailUrl}
                ></video>
              )}
            </div>
          )}
          
          {/* Post Stats */}
          <div className="flex justify-between items-center text-sm text-gray-500 py-2 border-t border-b border-gray-100">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path>
                  </svg>
                </div>
                <span className="ml-2">{post.likeCount || 0} likes</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <span>{post.commentCount || 0} comments</span>
              <span>{post.shareCount || 0} shares</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex py-1 mt-1">
            <button 
              className={`flex-1 flex items-center justify-center py-2 ${isLiked ? 'text-primary font-medium' : 'text-gray-600'} hover:bg-gray-50 rounded-md`}
              onClick={handleLike}
            >
              <svg className="w-5 h-5 mr-1.5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
              </svg>
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button 
              className="flex-1 flex items-center justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-md"
              onClick={() => document.getElementById('comment-input').focus()}
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd"></path>
              </svg>
              <span>Comment</span>
            </button>
            <button 
              className="flex-1 flex items-center justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-md"
              onClick={handleShare}
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
              </svg>
              <span>Share</span>
            </button>
          </div>
        </div>
        
        {/* Comments Section */}
        {renderCommentsSection()}
      </div>
    );
  };
  
  return (
    <div className="pb-16 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center shadow-sm sticky top-0 z-10">
        <button 
          className="mr-3 text-gray-600"
          onClick={() => navigate('/tailtalk')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-primary">Post Detail</h1>
      </div>
      
      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-primary">Sign In Required</h3>
                <button 
                  className="text-gray-500"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-800">Join Petzify Community</h4>
                  <p className="text-sm text-gray-600">Log in to interact with posts and connect with other pet lovers.</p>
                </div>
              </div>
              <div className="space-y-3">
                <button 
                  className="w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center"
                  onClick={() => {
                    setShowLoginPrompt(false);
                    navigate('/login');
                  }}
                >
                  Sign In
                </button>
                <button 
                  className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center"
                  onClick={() => {
                    setShowLoginPrompt(false);
                    navigate('/register');
                  }}
                >
                  Create an Account
                </button>
                <button 
                  className="w-full text-gray-500 py-2 text-sm"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Post Content */}
            {renderPostContent()}
            
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <h3 className="font-semibold mb-4">More Posts You Might Like</h3>
                <div className="space-y-3">
                  {relatedPosts.map(relatedPost => (
                    <div 
                      key={relatedPost.id}
                      className="flex items-start py-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-md"
                      onClick={() => navigate(`/tailtalk/post/${relatedPost.id}`)}
                    >
                      {relatedPost.imageUrl ? (
                        <div className="w-12 h-12 rounded overflow-hidden mr-3 flex-shrink-0">
                          <img src={relatedPost.imageUrl} alt={relatedPost.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded overflow-hidden mr-3 flex-shrink-0 flex items-center justify-center">
                          <span className="text-primary font-bold">{relatedPost.title.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm line-clamp-2 text-left">{relatedPost.title}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <span className="mr-3">{relatedPost.authorName}</span>
                          <span>❤️ {relatedPost.likeCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <MobileBottomNav />
    </div>
  );
};

// Wrap with the NotificationProvider context
const TailTalkPostDetail = () => {
  return (
    <NotificationProvider>
      <TailTalkPostDetailInner />
    </NotificationProvider>
  );
};

export default TailTalkPostDetail; 