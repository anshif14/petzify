import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaThumbsUp, FaRegThumbsUp, FaComment } from 'react-icons/fa';
import { 
  getFirestore, doc, getDoc, collection, addDoc, query, 
  orderBy, onSnapshot, updateDoc, serverTimestamp,
  where, getDocs, limit, runTransaction, increment
} from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Export the component explicitly as a named function
function TailTalksPostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const commentInputRef = useRef(null);
  
  // State variables
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isPostLiked, setIsPostLiked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);
        const postRef = doc(db, 'tailtalks', postId);
        const postSnap = await getDoc(postRef);
        
        if (!postSnap.exists()) {
          console.error('Post not found in tailtalks collection');
          setErrorMessage('The post you\'re looking for doesn\'t exist or has been removed.');
          setLoading(false);
          return;
        }
        
        const postData = {
          id: postSnap.id,
          ...postSnap.data()
        };
        
        setPost(postData);
        
        // Fetch related posts based on tags
        if (postData.tags && postData.tags.length > 0) {
          fetchRelatedPosts(postData.tags, postData.id);
        }
        
      } catch (error) {
        console.error('Error fetching post:', error);
        setErrorMessage('Sorry, we couldn\'t load this post. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
    
    // Check if user has liked this post
    const checkUserLikeStatus = async () => {
      if (isAuthenticated() && currentUser?.uid) {
        try {
          const db = getFirestore(app);
          const userLikesRef = doc(db, 'user_likes', currentUser.uid);
          const userLikesSnap = await getDoc(userLikesRef);
          
          if (userLikesSnap.exists()) {
            const userData = userLikesSnap.data();
            setIsPostLiked(userData.likedPosts && userData.likedPosts[postId] === true);
          }
        } catch (error) {
          console.error('Error checking like status:', error);
        }
      }
    };
    
    checkUserLikeStatus();
  }, [postId, navigate, currentUser, isAuthenticated]);
  
  // Fetch comments
  useEffect(() => {
    if (!postId) return;
    
    const db = getFirestore(app);
    // Use correct subcollection path
    const commentsRef = collection(db, 'tailtalks', postId, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      try {
        const commentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Comment data:', data); // Debug log
          
          // Ensure we have all required fields with default values if needed
          return {
            id: doc.id,
            authorName: data.authorName || 'Anonymous',
            authorPhotoURL: data.authorPhotoURL || null,
            text: data.text || '',
            content: data.content || '', // For backward compatibility
            createdAt: data.createdAt || new Date(),
            authorId: data.authorId || '',
          };
        });
        
        console.log('Processed comments:', commentsData); // Debug log
        setComments(commentsData);
      } catch (error) {
        console.error('Error processing comments:', error);
      }
    }, (error) => {
      console.error('Error fetching comments:', error);
    });
    
    return () => unsubscribe();
  }, [postId]);
  
  // Fetch related posts
  const fetchRelatedPosts = async (tags, currentPostId) => {
    try {
      const db = getFirestore(app);
      // Use correct collection path
      const postsRef = collection(db, 'tailtalks');
      
      // Get posts that share at least one tag with the current post
      const querySnapshot = await getDocs(
        query(postsRef, 
          where('tags', 'array-contains-any', tags),
          limit(4)
        )
      );
      
      const relatedPostsData = [];
      querySnapshot.forEach(doc => {
        // Exclude the current post
        if (doc.id !== currentPostId) {
          relatedPostsData.push({
            id: doc.id,
            ...doc.data()
          });
        }
      });
      
      setRelatedPosts(relatedPostsData);
    } catch (error) {
      console.error('Error fetching related posts:', error);
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
      
      // Optimistically update UI
      setPost(prevPost => ({
        ...prevPost,
        likeCount: isPostLiked 
          ? Math.max(0, (prevPost.likeCount || 1) - 1) 
          : (prevPost.likeCount || 0) + 1
      }));
      
      setIsPostLiked(!isPostLiked);
      
      // Update Firestore using transaction for consistency
      await runTransaction(db, async (transaction) => {
        const postSnap = await transaction.get(postRef);
        
        if (!postSnap.exists()) {
          throw new Error("Post does not exist!");
        }
        
        const postData = postSnap.data();
        const newLikeCount = isPostLiked 
          ? Math.max(0, (postData.likeCount || 0) - 1) 
          : (postData.likeCount || 0) + 1;
        
        transaction.update(postRef, { likeCount: newLikeCount });
        
        // Update user's liked posts in Firestore
        const userLikesSnap = await transaction.get(userLikesRef);
        
        if (userLikesSnap.exists()) {
          const userData = userLikesSnap.data();
          const likedPosts = userData.likedPosts || {};
          
          if (isPostLiked) {
            delete likedPosts[postId];
          } else {
            likedPosts[postId] = true;
          }
          
          transaction.update(userLikesRef, { likedPosts });
        } else {
          // Create new user likes document
          transaction.set(userLikesRef, { 
            userId: currentUser.uid,
            likedPosts: isPostLiked ? {} : { [postId]: true }
          });
        }
      });
      
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert optimistic UI update
      setPost(prevPost => ({
        ...prevPost,
        likeCount: isPostLiked 
          ? (prevPost.likeCount || 0) - 1 
          : (prevPost.likeCount || 1) + 1
      }));
      setIsPostLiked(!isPostLiked);
    }
  };
  
  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!requireAuth('add a comment')) {
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      setCommentSubmitting(true);
      const db = getFirestore(app);
      
      console.log('Adding comment to post:', postId);
      
      // Use correct subcollection path
      const commentsRef = collection(db, 'tailtalks', postId, 'comments');
      
      // Add comment with field name that matches database schema
      const commentData = {
        text: newComment.trim(),
        authorId: currentUser?.uid || 'anonymous',
        authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
        authorPhotoURL: currentUser?.photoURL || null,
        createdAt: serverTimestamp()
      };
      
      console.log('Comment data being submitted:', commentData);
      
      // Add to Firestore
      const docRef = await addDoc(commentsRef, commentData);
      console.log('Comment added with ID:', docRef.id);
      
      // Update comment count
      const postRef = doc(db, 'tailtalks', postId);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });
      
      // Update local state
      setPost(prevPost => ({
        ...prevPost,
        commentCount: (prevPost.commentCount || 0) + 1
      }));
      
      // Add comment to local comments array for immediate display
      setComments(prevComments => [
        {
          id: docRef.id,
          text: newComment.trim(),
          authorId: currentUser?.uid || 'anonymous',
          authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
          authorPhotoURL: currentUser?.photoURL || null,
          createdAt: new Date()
        },
        ...prevComments
      ]);
      
      // Clear input
      setNewComment('');
      setShowCommentInput(false);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Sorry, we couldn\'t add your comment. Please try again.');
    } finally {
      setCommentSubmitting(false);
    }
  };
  
  // Function to handle authentication requirement
  const requireAuth = (action) => {
    if (!isAuthenticated() || !currentUser) {
      setShowLoginPrompt(true);
      return false;
    }
    return true;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="pb-16 bg-gray-100 min-h-screen">
      {/* Header/Back Button */}
      <div className="bg-white px-4 py-3 flex items-center shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate('/tailtalk')}
          className="mr-3 text-gray-600"
        >
          <FaArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Post Details</h1>
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
      
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <LoadingSpinner />
        </div>
      ) : errorMessage ? (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 className="text-xl font-bold text-gray-700 mb-2">{errorMessage}</h2>
            <p className="text-gray-500 mb-6">You can return to the feed to browse other posts.</p>
            <button 
              onClick={() => navigate('/tailtalk')}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium"
            >
              Return to Feed
            </button>
          </div>
        </div>
      ) : post ? (
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row">
          {/* Main Post Content */}
          <div className="w-full lg:w-2/3 lg:pr-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              {/* Post Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
                    {post.authorPhotoURL ? (
                      <img src={post.authorPhotoURL} alt={post.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-primary">
                        {post.authorName === 'Petzify Team' || post.authorName === 'PetzifyTeam' ? 'P' : post.authorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium">
                        {post.authorName === 'Petzify Team' || post.authorName === 'PetzifyTeam' ? 'Petzify' : post.authorName}
                      </p>
                      {(post.authorName === 'Petzify Team' || post.authorName === 'PetzifyTeam') && (
                        <svg className="w-4 h-4 ml-1 text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Recently'}
                    </p>
                  </div>
                </div>
                
                <h1 className="text-xl font-bold mb-2">{post.title}</h1>
                
                {/* Post Content with Hashtag Styling */}
                {post.content && (
                  <div className="text-base text-gray-700 mb-3">
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
                  <div className="flex flex-wrap gap-2 mb-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-sm font-bold text-primary">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Post Media Content */}
              {post.type === 'image' && post.imageUrl && (
                <div className="border-t border-b border-gray-100">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full object-cover"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
              )}
              
              {post.type === 'video' && post.videoUrl && (
                <div className="border-t border-b border-gray-100 relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                  {post.videoUrl.includes('youtube.com') ? (
                    <iframe
                      src={post.videoUrl.replace('watch?v=', 'embed/')}
                      title={post.title}
                      className="absolute top-0 left-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video
                      src={post.videoUrl}
                      className="absolute top-0 left-0 w-full h-full object-cover"
                      controls
                      poster={post.thumbnailUrl}
                    ></video>
                  )}
                </div>
              )}
              
              {/* Post Engagement Stats */}
              <div className="px-4 py-3 flex justify-between items-center text-sm text-gray-500 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="flex items-center mr-4">
                    <div className="w-5 h-5 rounded-full bg-primary/60 flex items-center justify-center text-white overflow-hidden">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path>
                      </svg>
                    </div>
                    <span className="ml-1">{post.likeCount || 0}</span>
                  </div>
                </div>
                <div className="space-x-4">
                  <span>{comments.length || post.commentCount || 0} comments</span>
                  <span>{post.shareCount || 0} shares</span>
                </div>
              </div>
              
              {/* Post Interaction Buttons */}
              <div className="px-2 py-1 flex justify-between">
                <button 
                  className={`flex-1 flex items-center justify-center py-2 ${isPostLiked ? 'text-primary font-medium' : 'text-gray-600'} hover:bg-gray-50 rounded-md`}
                  onClick={handleLike}
                >
                  {isPostLiked ? (
                    <FaThumbsUp className="mr-2" />
                  ) : (
                    <FaRegThumbsUp className="mr-2" />
                  )}
                  <span>{isPostLiked ? 'Liked' : 'Like'}</span>
                </button>
                
                <button 
                  className="flex-1 flex items-center justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                  onClick={() => {
                    setShowCommentInput(true);
                    setTimeout(() => {
                      commentInputRef.current?.focus();
                    }, 100);
                  }}
                >
                  <FaComment className="mr-2" />
                  <span>Comment</span>
                </button>
                
                <button 
                  className="flex-1 flex items-center justify-center py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: post.title,
                        text: post.content,
                        url: window.location.href
                      }).catch(error => {
                        console.error('Error sharing:', error);
                        navigator.clipboard.writeText(window.location.href);
                        alert('Link copied to clipboard');
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard');
                    }
                  }}
                >
                  <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </div>
            
            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-100 text-left">
                <h2 className="font-bold text-lg">Comments ({comments.length || post.commentCount || 0})</h2>
              </div>
              
              {/* Comment Input */}
              <div className="p-4 border-b border-gray-100">
                <form onSubmit={handleAddComment} className="flex flex-col">
                  <div className="flex">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden flex-shrink-0">
                      {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-primary">
                          {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow">
                      <textarea
                        ref={commentInputRef}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm shadow-sm bg-gray-50 text-left"
                        placeholder="Write a comment..."
                        rows={showCommentInput ? 3 : 1}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onFocus={() => setShowCommentInput(true)}
                      ></textarea>
                      
                      {showCommentInput && (
                        <div className="flex justify-end mt-2 space-x-2">
                          <button
                            type="button"
                            className="px-4 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-200 rounded-lg"
                            onClick={() => {
                              setShowCommentInput(false);
                              setNewComment('');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 text-sm text-white bg-primary hover:bg-primary-dark transition-colors rounded-lg"
                            disabled={!newComment.trim() || commentSubmitting}
                          >
                            {commentSubmitting ? (
                              <LoadingSpinner size="small" color="white" />
                            ) : (
                              'Post Comment'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Comments List */}
              {comments.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {comments.map(comment => (
                    <div key={comment.id} className="py-3 px-2">
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden flex-shrink-0">
                          {comment.authorPhotoURL ? (
                            <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-primary">
                              {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                            </span>
                          )}
                        </div>
                        <div className="flex-grow max-w-[85%]">
                          <div className="bg-gray-50 px-4 py-3 rounded-lg shadow-sm border border-gray-100 text-left">
                            <div className="flex items-center mb-1.5">
                              <p className="font-semibold text-sm text-primary-dark mr-2">{comment.authorName || 'Anonymous'}</p>
                              <span className="text-xs text-gray-400">
                                {comment.createdAt ? 
                                  (typeof comment.createdAt.toDate === 'function' ?
                                    new Date(comment.createdAt.toDate()).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) :
                                    'Recently') : 
                                  'Just now'
                                }
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 break-words whitespace-pre-wrap text-left">{comment.text || comment.content || 'No content'}</p>
                          </div>
                          <div className="mt-1.5 ml-2 flex items-center text-xs space-x-3">
                            <button className="text-gray-500 hover:text-primary transition-colors">Like</button>
                            <button className="text-gray-500 hover:text-primary transition-colors">Reply</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar - Related Posts */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-16">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold">Related Posts</h2>
              </div>
              
              {relatedPosts.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {relatedPosts.map(relatedPost => (
                    <div
                      key={relatedPost.id}
                      onClick={() => navigate(`/tailtalk/post/${relatedPost.id}`)}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex">
                        {relatedPost.imageUrl && (
                          <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden mr-3 flex-shrink-0">
                            <img src={relatedPost.imageUrl} alt={relatedPost.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-sm line-clamp-2 mb-1">{relatedPost.title}</h3>
                          <p className="text-xs text-gray-500">{relatedPost.authorName}</p>
                          {relatedPost.tags && relatedPost.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {relatedPost.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-xs font-bold text-primary">
                                  #{tag}
                                </span>
                              ))}
                              {relatedPost.tags.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{relatedPost.tags.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>No related posts found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      
      <MobileBottomNav />
    </div>
  );
}

// Make sure there's a clear default export
export default TailTalksPostDetail; 