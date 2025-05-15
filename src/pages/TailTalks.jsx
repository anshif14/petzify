import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getFirestore, collection, query, orderBy, limit, getDocs, doc, 
  getDoc, setDoc, updateDoc, addDoc, serverTimestamp, deleteDoc, 
  increment, where, onSnapshot, runTransaction, startAfter
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotification, NotificationProvider } from '../context/NotificationContext';
import { PullToRefresh } from 'react-js-pull-to-refresh';
// Import Petzify logo for admin comments
import petzifyLogo from '../assets/images/Petzify Logo-05 (3).png';
import { FaThumbsUp, FaFlag } from 'react-icons/fa';
import '../styles/richtexteditor.css';

const TailTalksInner = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const notification = useNotification();

  // State declarations - removed unused state variables
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTag, setActiveTag] = useState('all');
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  const [lastVisible, setLastVisible] = useState(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('text');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedTags, setParsedTags] = useState([]);
  const [isPostAsQuestion, setIsPostAsQuestion] = useState(false); // Renamed from isQuestion to clarify purpose
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flaggingPostId, setFlaggingPostId] = useState(null);
  const [flaggingCommentId, setFlaggingCommentId] = useState(null);

  // Create observer ref for infinite scrolling
  const observerTarget = useRef(null);

  // Add this function near the top of the component
  const getUserEmail = () => {
    if (currentUser && currentUser.email) {
      return currentUser.email;
    }
    return null;
  };

  // Add a function to safely get the user ID
  const getUserId = () => {
    if (currentUser && currentUser.uid) {
      return currentUser.uid;
    }
    // Fall back to email if uid is not available
    if (currentUser && currentUser.email) {
      return currentUser.email;
    }
    return null;
  };

  // Function to toggle comments visibility for a post
  const toggleComments = (postId) => {
    // Check if we're showing comments
    const isCurrentlyVisible = commentsVisible[postId] || false;

    // If we're showing comments, just hide them
    if (isCurrentlyVisible) {
      setCommentsVisible(prev => ({
        ...prev,
        [postId]: false
      }));
      return;
    }

    // If we're showing comments for the first time, fetch them
    setCommentsVisible(prev => ({
      ...prev,
      [postId]: true
    }));

    // For dummy posts, comments are already loaded, no need to fetch
    if (postId.startsWith('dummy')) {
      return;
    }

    // For real posts, fetch comments from Firestore
    fetchComments(postId);
  };

  // Function to fetch comments for a post
  const fetchComments = async (postId) => {
    try {
      // Don't fetch for dummy posts
      if (postId.startsWith('dummy')) {
        return;
      }

      const db = getFirestore(app);
      const commentsRef = collection(db, 'tailtalks', postId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(10));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No comments found for post:', postId);
        // Initialize empty comments array on the post
        setPosts(prevPosts =>
          prevPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                comments: []
              };
            }
            return post;
          })
        );
        return;
      }

      const commentsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Support both 'text' and 'content' field formats
        commentsData.push({
          id: doc.id,
          text: data.text || data.content || '', // Check for both field names
          authorName: data.authorName || 'Anonymous',
          authorPhotoURL: data.authorPhotoURL || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          isVerified: data.isVerified || false, // Make sure we capture the verification status
          authorId: data.authorId || ''
        });
      });

      console.log('Fetched comments for post', postId, ':', commentsData);

      // Sort comments: verified/admin comments first, then by recent date
      const sortedComments = commentsData.sort((a, b) => {
        // First sort by verification status (verified/admin comments first)
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        
        // Then sort by date (most recent first)
        return b.createdAt - a.createdAt;
      });

      // Update the post with fetched comments
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: sortedComments
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error fetching comments:', error);
      showNotification('error', 'Failed to load comments');
    }
  };

  // Safe notification function to prevent undefined errors
  const showNotification = (type, message) => {
    if (notification && notification[type]) {
      notification[type](message);
    } else {
      console.log(`${type}: ${message}`);
    }
  };

  // Update the showComingSoon function to use safe notification
  const showComingSoon = (featureName) => {
    showNotification('info', `${featureName} feature coming soon!`);
  };

  // Update handlePostClick for dummy posts with safe notification
  const handlePostClick = (postId) => {
    // For dummy posts, we'll stay on the current page
    if (postId.startsWith('dummy')) {
      showNotification('info', 'Viewing post details');

      // Toggle comments instead
      toggleComments(postId);
      return;
    }

    // Navigate to the post detail view
    navigate(`/tailtalk/post/${postId}`);
  };

  // Enhance the requireAuth function with better notification feedback
  const requireAuth = (action) => {
    if (!isAuthenticated() || !currentUser) {
      console.log('Authentication required for:', action);
      console.log('Current user:', currentUser);
      console.log('isAuthenticated:', isAuthenticated());

      showNotification('warning', `Please sign in to ${action}`);

      // Redirect to login page instead of showing modal
      setTimeout(() => {
        navigate('/login', { state: { from: '/tailtalk' } });
      }, 1500);

      return false;
    }
    return true;
  };

  // Update handleSubmitQuestion success notification
  const handleSubmitQuestion = async (e) => {
    e?.preventDefault();

    console.log('Starting post submission...');
    console.log('Current user:', currentUser);
    console.log('Authentication state:', isAuthenticated());

    // Check authentication before proceeding
    if (!isAuthenticated() || !currentUser) {
      showNotification('error', 'You must be signed in to create a post');
      setTimeout(() => {
        navigate('/login', { state: { from: '/tailtalk' } });
      }, 1000);
      return;
    }

    if (!requireAuth('create a post')) {
      return;
    }

    // Basic validation
    if (!postTitle.trim()) {
      showNotification('warning', 'Please add a title to your post');
      return;
    }

    if (!postContent.trim()) {
      showNotification('warning', 'Please add some content to your post');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Extract hashtags from content
      const hashtags = postContent.match(/#[a-zA-Z0-9_]+/g) || [];
      const tags = hashtags.map(tag => tag.substring(1));  // Remove the # symbol

      // Ensure currentUser exists and has required properties
      if (!currentUser) {
        throw new Error('You must be logged in to create a post');
      }

      // Get user ID safely - crucial fix
      const userId = getUserId();
      if (!userId) {
        throw new Error('Unable to determine user ID or email. Please try again or contact support.');
      }

      // Check if we're using email as ID
      const isUsingEmail = currentUser.email && userId === currentUser.email;

      // Add question to tags if this is a question
      if (isPostAsQuestion && !tags.includes('question')) {
        tags.push('question');
      }

      // Prepare the post data with safe checks for all user fields
      const postData = {
        title: postTitle.trim(),
        content: postContent.trim(),
        authorId: userId, // Use the safely retrieved user ID or email
        authorEmail: currentUser.email || 'anonymous@example.com',
        isAuthorIdEmail: isUsingEmail, // Flag to indicate if we're using email as ID
        authorName: (currentUser && currentUser.displayName) ? currentUser.displayName :
                    (currentUser && currentUser.email) ? currentUser.email.split('@')[0] : 'Anonymous',
        authorPhotoURL: (currentUser && currentUser.photoURL) ? currentUser.photoURL : null,
        type: postType,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        tags: tags.length > 0 ? tags : ['TailTalks'],
        isQuestion: isPostAsQuestion
      };

      console.log('Creating post with data:', postData);

      // Upload media if selected
      if (postType === 'image' && selectedImage) {
        const storage = getStorage(app);
        const imageFileName = `images/${postData.authorId}_${Date.now()}_${selectedImage.name}`;
        const imageRef = ref(storage, imageFileName);

        // Create upload task
        const uploadTask = uploadBytes(imageRef, selectedImage);

        // Wait for upload to complete
        await uploadTask;

        // Get download URL
        const imageUrl = await getDownloadURL(imageRef);
        postData.imageUrl = imageUrl;
      }

      if (postType === 'video' && selectedVideo) {
        const storage = getStorage(app);
        const videoFileName = `videos/${postData.authorId}_${Date.now()}_${selectedVideo.name}`;
        const videoRef = ref(storage, videoFileName);

        // Create upload task
        const uploadTask = uploadBytes(videoRef, selectedVideo);

        // Wait for upload to complete
        await uploadTask;

        // Get download URL
        const videoUrl = await getDownloadURL(videoRef);
        postData.videoUrl = videoUrl;
      }

      // Add post to Firestore
      const db = getFirestore(app);
      const postsRef = collection(db, 'tailtalks');

      try {
        const docRef = await addDoc(postsRef, postData);
        console.log('Post added with ID:', docRef.id);

        // If this is a question, add it to direct_questions as well
        if (isPostAsQuestion) {
          const directQuestionsRef = collection(db, 'direct_questions');
          await addDoc(directQuestionsRef, {
            content: postContent.trim(),
            title: postTitle.trim(),
            authorId: userId, // Use the safely retrieved user ID or email
            authorEmail: currentUser.email || 'anonymous@example.com',
            isAuthorIdEmail: isUsingEmail, // Flag to indicate if we're using email as ID
            authorName: currentUser.displayName || currentUser.email.split('@')[0] || 'Anonymous',
            authorPhotoURL: currentUser.photoURL || null,
            createdAt: serverTimestamp(),
            status: 'pending',
            postId: docRef.id, // Reference to the original post
            imageUrl: postData.imageUrl || null
          });
          
          showNotification('success', 'Your question has been submitted and will be reviewed by our team!');
        } else {
          showNotification('success', 'Post created successfully!');
        }

        // Reset form
        setPostTitle('');
        setPostContent('');
        setPostType('text');
        setSelectedImage(null);
        setSelectedVideo(null);
        setMediaPreview(null);
        setParsedTags([]);
        setIsPostAsQuestion(false);

        // Close modal
        setAskModalOpen(false);

        // Refresh the feed
        setLastVisible(null);
        fetchPosts(true);
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        throw new Error(`Firestore error: ${firestoreError.message}`);
      }

    } catch (error) {
      console.error('Error submitting post:', error);
      showNotification('error', `Failed to submit post: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Add helper function to handle media selection
  const handleMediaSelect = (e, type) => {
    const file = e.target.files[0];

    if (!file) return;

    // Check if file is too large (>10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('error', 'File is too large. Maximum size is 10MB.');
      return;
    }

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);

    if (type === 'image') {
      setSelectedImage(file);
      setSelectedVideo(null);
      setPostType('image');
    } else if (type === 'video') {
      setSelectedVideo(file);
      setSelectedImage(null);
      setPostType('video');
    }
  };

  // Add function to extract hashtags from post content as user types
  const handleContentChange = (content) => {
    setPostContent(content);

    // Extract hashtags from content
    const hashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    const tags = hashtags.map(tag => tag.substring(1));
    setParsedTags(tags);
  };

  // Format date helper function
  const formatDate = (date) => {
    if (!date) return 'Just now';

    try {
      // Handle Firestore timestamps
      if (date && typeof date.toDate === 'function') {
        date = date.toDate();
      }
      
      // Handle both Date objects and timestamps
      const dateObj = date instanceof Date ? date : new Date(date);

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown time';
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
        // Return formatted date and time for older posts
        return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Unknown time';
    }
  };

  // Handle like post function
  const handleLikePost = async (postId) => {
    if (!requireAuth('like this post')) {
      return;
    }

    try {
      // Make sure postId is valid
      if (!postId) {
        console.error('Invalid post ID');
        return;
      }

      // Get user email 
      const userEmail = currentUser.email;
      
      if (!userEmail) {
        console.error('User email not available');
        return;
      }

      // Find the post to check if already liked
      const post = posts.find(p => p.id === postId);
      if (!post) {
        console.error('Post not found');
        return;
      }

      // Check if user already liked by looking at the post's likes map
      const wasLiked = post.likes && post.likes[userEmail] === true;
      console.log(`User ${userEmail} has ${wasLiked ? 'already liked' : 'not liked'} post ${postId}`);

      // Update UI optimistically
      const updatedPosts = posts.map(p => {
        if (p.id === postId) {
          // Create updated likes object
          const updatedLikes = {...(p.likes || {})};
          
          if (wasLiked) {
            // Remove the user email from likes
            delete updatedLikes[userEmail];
          } else {
            // Add the user email to likes
            updatedLikes[userEmail] = true;
          }
          
          return {
            ...p,
            likes: updatedLikes,
            likeCount: wasLiked ? Math.max(0, p.likeCount - 1) : (p.likeCount || 0) + 1
          };
        }
        return p;
      });

      setPosts(updatedPosts);

      // For dummy posts, just update the UI and return
      if (postId.startsWith('dummy')) {
        showNotification('success', wasLiked ? 'Post unliked' : 'Post liked!');
        return;
      }

      // For real posts, update in Firestore
      const db = getFirestore(app);
      const postRef = doc(db, 'tailtalks', postId);

      // Simple transaction to add/remove user email to likes
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);

        if (!postDoc.exists()) {
          throw new Error("Post does not exist!");
        }

        // Get current post data
        const postData = postDoc.data();
        
        // Get or initialize likes object
        let likes = postData.likes || {};
        
        if (wasLiked) {
          // Remove user email from likes
          delete likes[userEmail];
        } else {
          // Add user email to likes
          likes[userEmail] = true;
        }
        
        // Calculate new count
        const newLikeCount = Object.keys(likes).length;

        // Update post with likes object and count
        transaction.update(postRef, { 
          likes: likes,
          likeCount: newLikeCount 
        });
      });

      console.log(wasLiked ? 'Successfully unliked post' : 'Successfully liked post');

    } catch (error) {
      console.error('Error updating like status:', error);
      showNotification('error', 'Failed to update like. Please try again.');
      
      // Revert UI changes on error
      fetchPosts(true);
    }
  };

  // Handle share post function
  const handleSharePost = async (postId, e) => {
    e?.stopPropagation();

    if (!requireAuth('share this post')) {
      return;
    }

    try {
      console.log('Sharing post:', postId);

      // Find the post
      const post = posts.find(p => p.id === postId);
      if (!post) {
        console.error('Post not found:', postId);
        throw new Error('Post not found');
      }

      // Update UI optimistically
      const updatedPosts = posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            shareCount: (p.shareCount || 0) + 1
          };
        }
        return p;
      });

      setPosts(updatedPosts);

      // For dummy posts, just update the UI
      if (postId.startsWith('dummy')) {
        await handleShareContent(post.title, post.content, window.location.href);
        return;
      }

      // For real posts, prepare the share URL
      const shareUrl = `${window.location.origin}/tailtalk/post/${postId}`;

      try {
        // Try to update in Firestore first
        const db = getFirestore(app);
        const postRef = doc(db, 'tailtalks', postId);

        await updateDoc(postRef, {
          shareCount: increment(1)
        });

        // Then try to share the content
        await handleShareContent(post.title, post.content, shareUrl);

      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        // Even if Firestore update fails, try to share
        await handleShareContent(post.title, post.content, shareUrl);
      }

    } catch (error) {
      console.error('Error sharing post:', error);

      // Revert UI changes
      const revertedPosts = posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            shareCount: Math.max(0, (p.shareCount || 1) - 1)
          };
        }
        return p;
      });

      setPosts(revertedPosts);

      // Show a more specific error message if possible
      if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
        showNotification('info', 'Share cancelled by user');
      } else if (error.message?.includes('share is not enabled')) {
        showNotification('info', 'Sharing is not supported on this device. Link copied to clipboard instead.');
      } else {
        showNotification('error', 'Sorry, we had trouble sharing this post. Please try again later.');
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

  // Function to generate dummy posts when no real data is available
  const generateDummyPosts = () => {
    // Get current user email
    const userEmail = currentUser?.email || '';
    
    // Function to generate likes object with random emails
    const generateLikesObject = (count, includeCurrentUser = false) => {
      const likes = {};
      
      // Add current user if requested and available
      if (includeCurrentUser && userEmail) {
        likes[userEmail] = true;
      }
      
      // Generate random emails for remaining likes
      const remainingCount = count - (includeCurrentUser && userEmail ? 1 : 0);
      for (let i = 0; i < remainingCount; i++) {
        const randomEmail = `user${Math.floor(Math.random() * 1000)}@example.com`;
        likes[randomEmail] = true;
      }
      
      return likes;
    };
    
    return [
      {
        id: 'dummy1',
        title: 'Welcome to Tail Talks!',
        content: 'Share your pet stories, ask for advice, and connect with other pet lovers. #PetCommunity #TailTalks',
        authorName: 'Petzify Team',
        type: 'text',
        tags: ['PetCommunity', 'TailTalks'],
        likes: generateLikesObject(42, true), // Include current user in likes
        likeCount: 42,
        commentCount: 7,
        shareCount: 12,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        comments: [
          {
            id: 'comment1',
            text: 'Excited to join this community!',
            authorName: 'PetLover123',
            createdAt: new Date(Date.now() - 1800000) // 30 minutes ago
          }
        ]
      },
      {
        id: 'dummy2',
        title: 'My Golden Retriever\'s First Beach Day',
        content: 'Max had such a blast at the beach yesterday! He couldn\'t stop chasing the waves. Any tips for washing all the sand out of his fur? #GoldenRetriever #BeachDay',
        authorName: 'DogMom',
        imageUrl: 'https://images.unsplash.com/photo-1546421845-6471bdcf3edf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGdvbGRlbiUyMHJldHJpZXZlciUyMGJlYWNofGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60',
        type: 'image',
        tags: ['GoldenRetriever', 'BeachDay', 'DogCare'],
        likes: generateLikesObject(24),
        likeCount: 24,
        commentCount: 5,
        shareCount: 3,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        comments: [
          {
            id: 'comment2',
            text: 'I use a detachable shower head with medium pressure - works great for getting sand out!',
            authorName: 'PetGroomer',
            createdAt: new Date(Date.now() - 43200000) // 12 hours ago
          }
        ]
      },
      {
        id: 'dummy3',
        title: 'Cat Nutrition Question',
        content: 'My 3-year-old tabby seems bored with her food lately. Any recommendations for healthy wet food brands that picky cats love? #CatCare #PetNutrition',
        authorName: 'CatWhisperer',
        type: 'text',
        tags: ['CatCare', 'PetNutrition', 'FelineHealth'],
        likes: generateLikesObject(15),
        likeCount: 15,
        commentCount: 8,
        shareCount: 2,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        comments: [
          {
            id: 'comment3',
            text: 'Try Royal Canin or Hill\'s Science Diet - my cats love the texture and they\'re nutritionally complete!',
            authorName: 'VetTech',
            createdAt: new Date(Date.now() - 86400000) // 1 day ago
          }
        ]
      }
    ];
  };

  // Use useCallback to memoize the fetchPosts function
  const fetchPosts = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const db = getFirestore(app);
      const postsRef = collection(db, 'tailtalks');

      // Build query based on filters and pagination
      let q;
      const pageSize = 10; // Set to exactly 10 posts per page for consistent lazy loading

      if (activeTag === 'all') {
        q = lastVisible && !isInitialLoad
          ? query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(pageSize))
          : query(postsRef, orderBy('createdAt', 'desc'), limit(pageSize));
      } else {
        q = lastVisible && !isInitialLoad
          ? query(
              postsRef,
              where('tags', 'array-contains', activeTag),
              orderBy('createdAt', 'desc'),
              startAfter(lastVisible),
              limit(pageSize)
            )
          : query(
              postsRef,
              where('tags', 'array-contains', activeTag),
              orderBy('createdAt', 'desc'),
              limit(pageSize)
            );
      }

      const querySnapshot = await getDocs(q);

      // Update lastVisible for pagination
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc || null);

      // Check if we have more posts to load
      setHasMore(querySnapshot.docs.length === pageSize);

      if (querySnapshot.empty && posts.length === 0) {
        // Only load dummy data if we have no real data and this is initial load
        const dummyPosts = generateDummyPosts();
        setPosts(dummyPosts);
        setHasMore(false);

        if (isInitialLoad && activeTag !== 'all') {
          showNotification('info', `No posts found for #${activeTag}. Showing sample content instead.`);
        }
        return;
      }

      const postsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Get the likes object from the post data
        const likes = data.likes || {};
        
        postsData.push({
          id: doc.id,
          title: data.title || 'Untitled Post',
          content: data.content || '',
          authorName: data.authorName || 'Petzify Team',
          authorPhotoURL: data.authorPhotoURL || null,
          imageUrl: data.imageUrl || null,
          videoUrl: data.videoUrl || null,
          thumbnailUrl: data.thumbnailUrl || null,
          type: data.type || 'text',
          tags: data.tags || [],
          likeCount: data.likeCount || Object.keys(likes).length || 0,
          commentCount: data.commentCount || 0,
          shareCount: data.shareCount || 0,
          createdAt: data.createdAt, // preserve the Firestore timestamp
          likes: likes, // Include the full likes map
          isQuestion: data.isQuestion || false
        });
      });

      // Append posts for pagination or replace them for new filters
      setPosts(prevPosts => isInitialLoad ? postsData : [...prevPosts, ...postsData]);
    } catch (error) {
      console.error('Error fetching posts:', error);

      // Show error notification
      if (isInitialLoad) {
        showNotification('error', 'Failed to load posts. Please try again later.');
      } else {
        showNotification('error', 'Failed to load more posts. Please try again later.');
      }

      // Fallback to dummy data in case of errors on initial load
      if (posts.length === 0 && isInitialLoad) {
        const dummyPosts = generateDummyPosts();
        setPosts(dummyPosts);
        setHasMore(false);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [activeTag, lastVisible, posts]);

  // Handle refreshing for pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsFirstLoad(false);
    setLastVisible(null);
    setHasMore(true);
    return fetchPosts(true);
  }, [activeTag, fetchPosts]);

  // Add a manual refresh function
  const handleManualRefresh = async () => {
    setRefreshing(true);
    setIsFirstLoad(false);
    setLastVisible(null);
    setHasMore(true);

    try {
      await fetchPosts(true);
      showNotification('success', 'Posts refreshed');
    } catch (error) {
      console.error('Error refreshing posts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Check user's liked posts when authenticated
  useEffect(() => {
    if (isAuthenticated() && getUserEmail()) {
      const checkLikedPosts = async () => {
        try {
          const userEmail = getUserEmail();
          console.log("Checking liked posts for user:", userEmail);
          const db = getFirestore(app);
          const userLikesRef = doc(db, 'user_likes', userEmail);
          const docSnap = await getDoc(userLikesRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log("User liked posts:", userData.likedPosts);
            
            // Ensure likedPosts is an object with proper boolean values
            const likedPostsData = {};
            
            // Convert all values to true for consistent checking
            if (userData.likedPosts) {
              Object.keys(userData.likedPosts).forEach(postId => {
                likedPostsData[postId] = true;
              });
            }
            
            setLikedPosts(likedPostsData);
          } else {
            console.log("No liked posts found for user");
            setLikedPosts({});
          }
        } catch (error) {
          console.error('Error fetching liked posts:', error);
          setLikedPosts({});
        }
      };

      checkLikedPosts();
    } else {
      // Reset liked posts if not authenticated
      setLikedPosts({});
    }
  }, [currentUser, isAuthenticated]);

  // Set up useEffect for infinite scrolling
  useEffect(() => {
    // Only fetch posts on initial load
    if (isFirstLoad) {
      fetchPosts(true);
      setIsFirstLoad(false);
    }
  }, [activeTag, isFirstLoad, fetchPosts]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPosts(false);
        }
      },
      { threshold: 1.0 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading]);

  // Function to handle adding a comment
  const handleAddComment = async (postId, e) => {
    e?.preventDefault();

    if (!requireAuth('comment on this post')) {
      return;
    }

    const commentText = commentInputs[postId]?.trim();

    if (!commentText) {
      showNotification('warning', 'Please enter a comment');
      return;
    }

    try {
      // Generate a consistent temp ID
      const tempId = `temp-${Date.now()}`;

      // Check if the current user is an admin
      const isAdmin = currentUser && currentUser.uid && await isAdminUser(currentUser.uid);
      
      // Optimistic UI update
      const newComment = {
        id: tempId,
        text: commentText,
        content: commentText,
        authorName: isAdmin ? 'Petzify' : (currentUser?.displayName || getUserEmail()?.split('@')[0] || 'Anonymous'),
        authorPhotoURL: currentUser?.photoURL || null,
        createdAt: new Date(), // For optimistic UI update, use Date object
        isVerified: isAdmin
      };

      // Find the post and add the comment
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          // Initialize comments array if it doesn't exist
          const existingComments = post.comments || [];
          
          // Insert admin comments at the top, otherwise prepend to the array
          let updatedComments;
          if (isAdmin) {
            // Admin comments go at the top
            updatedComments = [newComment, ...existingComments];
          } else {
            // User comments go after admin comments
            const adminComments = existingComments.filter(comment => comment.isVerified);
            const userComments = existingComments.filter(comment => !comment.isVerified);
            updatedComments = [...adminComments, newComment, ...userComments];
          }
          
          return {
            ...post,
            comments: updatedComments,
            commentCount: (post.commentCount || 0) + 1
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

      // If it's a dummy post, just update the UI
      if (postId.startsWith('dummy')) {
        showNotification('success', 'Comment added successfully!');
        return;
      }

      // For real posts, save to Firestore
      const db = getFirestore(app);

      // Make sure post exists before trying to comment
      const postRef = doc(db, 'tailtalks', postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        throw new Error('Post does not exist');
      }

      // Add comment to subcollection
      const commentData = {
        text: commentText,
        content: commentText,
        authorId: (currentUser && currentUser.uid) ? currentUser.uid : 'anonymous',
        authorName: isAdmin ? 'Petzify' : (currentUser?.displayName || getUserEmail()?.split('@')[0] || 'Anonymous'),
        authorPhotoURL: (currentUser && currentUser.photoURL) ? currentUser.photoURL : null,
        createdAt: serverTimestamp(),
        isVerified: isAdmin
      };

      const commentsRef = collection(db, 'tailtalks', postId, 'comments');

      // Try to add the comment
      let docRef;
      try {
        docRef = await addDoc(commentsRef, commentData);
        console.log('Comment added with ID:', docRef.id);
      } catch (addError) {
        console.error('Error adding comment document:', addError);
        throw addError;
      }

      // Update comment count on post
      try {
        await updateDoc(postRef, {
          commentCount: increment(1)
        });
        console.log('Comment count updated successfully');
      } catch (updateError) {
        console.error('Error updating comment count:', updateError);
        // Even if this fails, the comment was added, so don't throw
      }

      // If an admin is replying to a question post, update its status
      const postData = postSnap.data();
      if (isAdmin && postData && postData.isQuestion) {
        try {
          // Find the corresponding direct question
          const directQuestionsRef = collection(db, 'direct_questions');
          const q = query(directQuestionsRef, where('postId', '==', postId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Update the status of the direct question
            const questionDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'direct_questions', questionDoc.id), {
              status: 'answered',
              answeredBy: currentUser.uid,
              answeredAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error('Error updating question status:', error);
          // Don't throw, as the comment was still added successfully
        }
      }

      showNotification('success', 'Comment added successfully!');

      // Update comments with server ID
      if (docRef?.id) {
        const finalPosts = posts.map(post => {
          if (post.id === postId) {
            // Initialize comments array if it doesn't exist
            const existingComments = post.comments || [];
            const updatedComments = existingComments.map(comment => {
              if (comment.id === tempId) {
                return {
                  ...comment,
                  id: docRef.id
                };
              }
              return comment;
            });

            return {
              ...post,
              comments: updatedComments
            };
          }
          return post;
        });

        setPosts(finalPosts);
      }

    } catch (error) {
      console.error('Error adding comment:', error);

      // Get the specific error message
      const errorMessage = error.message || 'Failed to add comment. Please try again.';

      // Revert optimistic update
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          // Ensure comments array exists before filtering it
          const existingComments = post.comments || [];
          const updatedComments = existingComments.filter(
            comment => !comment.id.startsWith('temp-')
          );
          return {
            ...post,
            comments: updatedComments,
            commentCount: Math.max(0, (post.commentCount || 1) - 1)
          };
        }
        return post;
      });

      setPosts(updatedPosts);
      showNotification('error', errorMessage);
    }
  };

  // Helper function to check if a user is an admin
  const isAdminUser = async (uid) => {
    try {
      const db = getFirestore(app);
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.role === 'admin';
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  // Function to render a post card
  const renderPostCard = (post) => {
    const isCommentVisible = commentsVisible[post.id] || false;
    
    // Check directly if the user's email is in the post's likes map
    const isPostLiked = currentUser?.email && post.likes && post.likes[currentUser.email] === true;

    return (
      <div key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden mb-4" onClick={() => handlePostClick(post.id)}>
        {/* Post Header */}
        <div className="p-4">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
              {post.authorName === 'Petzify' || post.authorName === 'Petzify Team' ? (
                // Petzify logo for admin posts
                <img src={petzifyLogo} alt="Petzify" className="w-full h-full object-contain p-0.5" />
              ) : post.authorPhotoURL ? (
                <img src={post.authorPhotoURL} alt={post.authorName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-primary">
                  {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'P'}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start">
              <p className="font-medium text-sm">
                {post.authorName === 'Petzify Team' ? 'Petzify' : post.authorName}
                {(post.authorName === 'Petzify' || post.authorName === 'Petzify Team') && (
                  <svg className="w-4 h-4 ml-1 inline text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                )}
              </p>
              <p className="text-xs text-gray-500 text-left">{formatDate(post.createdAt)}</p>
            </div>
          </div>

          {/* Post Content */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-left">{post.title}</h3>
            {post.isQuestion && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Question
              </span>
            )}
          </div>

          {post.content && (
            <p className="text-gray-700 mb-3 text-left">
              {post.content.split(/(\s+)/).map((word, index) =>
                word.startsWith('#') ? (
                  <span key={index} className="font-bold text-primary">{word} </span>
                ) : (
                  <span key={index}>{word}</span>
                )
              )}
            </p>
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

          {post.type === 'video' && post.videoUrl && (
            <div className="rounded-lg overflow-hidden mb-3">
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
                <div className="relative">
                  <video
                    src={post.videoUrl}
                    className="w-full rounded"
                    controls
                    poster={post.thumbnailUrl}
                  ></video>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-primary px-2 py-1 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTag(tag);
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Post Stats */}
          <div className="flex justify-between items-center text-xs text-gray-500 py-2 border-t border-gray-100">
            <span>{post.likeCount || 0} likes</span>
            <div className="flex space-x-3">
              <span>{post.commentCount || 0} comments</span>
              <span>{post.shareCount || 0} shares</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex border-t border-gray-100 pt-2">
            <button
              className={`flex-1 flex items-center justify-center py-1 ${isPostLiked ? 'text-primary' : 'text-gray-600'} hover:bg-gray-50 rounded-md`}
              onClick={(e) => {
                e.stopPropagation();
                handleLikePost(post.id);
              }}
            >
              <FaThumbsUp className="w-5 h-5 mr-1" fill={isPostLiked ? "currentColor" : "none"} stroke="currentColor" />
              <span>{isPostLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button
              className={`flex-1 flex items-center justify-center py-1 ${isCommentVisible ? 'text-primary' : 'text-gray-600'} hover:bg-gray-50 rounded-md`}
              onClick={(e) => {
                e.stopPropagation();
                toggleComments(post.id);
              }}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <span>{isCommentVisible ? 'Hide Comments' : 'Comment'}</span>
            </button>
            <button
              className="flex-1 flex items-center justify-center py-1 text-gray-600 hover:bg-gray-50 rounded-md"
              onClick={(e) => {
                e.stopPropagation();
                handleFlagPost(post.id, e);
              }}
            >
              <FaFlag className="w-5 h-5 mr-1" />
              <span>Report</span>
            </button>
          </div>
        </div>

        {/* Comments Section - Toggle Visibility */}
        {isCommentVisible && (
          <div className="bg-gray-50 p-3 border-t border-gray-100">
            <h4 className="font-medium mb-3 text-sm text-left">Comments</h4>

            {/* Comment Input */}
            {isAuthenticated() && currentUser && (
              <form
                className="flex mb-3"
                onSubmit={(e) => handleAddComment(post.id, e)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 overflow-hidden flex-shrink-0">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-primary text-xs">
                      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'P'}
                    </span>
                  )}
                </div>
                <div className="flex-grow flex">
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-l-full px-3 py-1.5 text-sm bg-white"
                    placeholder="Write a comment..."
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      setCommentInputs(prev => ({
                        ...prev,
                        [post.id]: e.target.value
                      }));
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white rounded-r-full px-3 flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                    </svg>
                  </button>
                </div>
              </form>
            )}

            {/* Check if comments exist and have items */}
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-3">
                {post.comments.slice(0, 3).map(comment => (
                  <div key={comment.id} className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 overflow-hidden flex-shrink-0">
                      {comment.isVerified || comment.authorName === 'Petzify' || comment.authorName === 'Petzify Team' ? (
                        <img src={petzifyLogo} alt="Petzify" className="w-full h-full object-contain p-0.5" />
                      ) : comment.authorPhotoURL ? (
                        <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-gray-500 text-xs">
                          {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'A'}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow max-w-[85%]">
                      <div className={`${comment.isVerified ? 'bg-blue-50 border border-blue-100' : 'bg-primary/5'} rounded-2xl rounded-tl-none px-3 py-2 shadow-sm`}>
                        <div className="flex justify-between items-start">
                          <p className={`font-medium text-xs ${comment.isVerified ? 'text-primary' : 'text-primary-dark'} flex items-center`}>
                            {comment.authorName === 'Petzify Team' ? 'Petzify' : comment.authorName || 'Anonymous'}
                            {comment.isVerified && (
                              <svg className="w-4 h-4 ml-1 text-primary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                              </svg>
                            )}
                          </p>
                          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-left text-gray-800 break-words whitespace-pre-wrap">{comment.text || comment.content || 'No text'}</p>
                      </div>
                      <div className="flex items-center mt-1 px-2 text-xs text-gray-500">
                        <button 
                          className="hover:text-red-500 flex items-center"
                          onClick={(e) => handleFlagComment(post.id, comment.id, e)}
                        >
                          <FaFlag className="mr-1" size={10} />
                          Report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {post.comments.length > 3 && (
                  <button
                    className="text-primary font-medium text-sm mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tailtalk/post/${post.id}`);
                    }}
                  >
                    View all {post.comments.length} comments
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-3">No comments yet. Be the first to comment!</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Add the modal to the render section
  const renderAskModal = () => {
    if (!askModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold text-primary">
              {isPostAsQuestion ? "Ask a Question" : "Create Post"}
            </h3>
            <button
              className="text-gray-500"
              onClick={() => setAskModalOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmitQuestion} className="p-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-primary">
                    {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'P'}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous'}</p>
                <div className="flex space-x-2 mt-1">
                  <button
                    type="button"
                    className={`text-xs px-2 py-0.5 rounded ${postType === 'text' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => setPostType('text')}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={`text-xs px-2 py-0.5 rounded ${postType === 'image' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => setPostType('image')}
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    className={`text-xs px-2 py-0.5 rounded ${postType === 'video' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => setPostType('video')}
                  >
                    Video
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                className="w-full border-b border-gray-200 p-2 outline-none"
                placeholder="Add a title to your post"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <textarea
                className="w-full border-b border-gray-200 p-2 outline-none resize-none h-32"
                placeholder="What's on your mind about your pets? Use #hashtags for better discoverability!"
                value={postContent}
                onChange={(e) => handleContentChange(e.target.value)}
                required
              ></textarea>
            </div>

            {/* Media upload section */}
            {(postType === 'image' || postType === 'video') && (
              <div className="mb-4">
                {mediaPreview ? (
                  <div className="relative">
                    {postType === 'image' && (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    {postType === 'video' && (
                      <video
                        src={mediaPreview}
                        className="w-full h-48 object-cover rounded-lg"
                        controls
                      />
                    )}
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1"
                      onClick={() => {
                        setMediaPreview(null);
                        setSelectedImage(null);
                        setSelectedVideo(null);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <label className="cursor-pointer block">
                      <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        {postType === 'image' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        )}
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Click to upload {postType === 'image' ? 'an image' : 'a video'}</p>
                      <input
                        type="file"
                        className="hidden"
                        accept={postType === 'image' ? 'image/*' : 'video/*'}
                        onChange={(e) => handleMediaSelect(e, postType)}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Extracted hashtags */}
            {parsedTags.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Hashtags:</p>
                <div className="flex flex-wrap gap-1">
                  {parsedTags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="mr-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm"
                onClick={() => setAskModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center"
                disabled={isUploading || !postTitle.trim() || !postContent.trim()}
              >
                {isUploading ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span className="ml-2">Posting...</span>
                  </>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Handle flagging a post
  const handleFlagPost = (postId, e) => {
    e.stopPropagation();
    if (!requireAuth('flag this post')) {
      return;
    }
    
    setFlaggingPostId(postId);
    setFlaggingCommentId(null);
    setFlagReason('');
    setShowFlagModal(true);
  };

  // Handle flagging a comment
  const handleFlagComment = (postId, commentId, e) => {
    e.stopPropagation();
    if (!requireAuth('flag this comment')) {
      return;
    }
    
    setFlaggingPostId(postId);
    setFlaggingCommentId(commentId);
    setFlagReason('');
    setShowFlagModal(true);
  };

  // Submit flag
  const submitFlag = async () => {
    if (!flagReason.trim()) {
      return;
    }

    try {
      setFlagSubmitting(true);
      const db = getFirestore(app);
      
      // Get user email safely
      const userEmail = getUserEmail();
      if (!userEmail) {
        throw new Error('Unable to identify user. Please try again or contact support.');
      }
      
      if (flaggingCommentId) {
        // Flag a comment
        const commentRef = doc(db, 'tailtalks', flaggingPostId, 'comments', flaggingCommentId);
        await updateDoc(commentRef, {
          isFlagged: true,
          flagReason: flagReason,
          flaggedBy: userEmail, // Use email instead of uid
          flaggedAt: serverTimestamp()
        });
        
        // Update local state
        setPosts(posts.map(post => {
          if (post.id === flaggingPostId) {
            return {
              ...post,
              comments: post.comments?.map(comment => 
                comment.id === flaggingCommentId 
                  ? {...comment, isFlagged: true, flagReason: flagReason} 
                  : comment
              )
            };
          }
          return post;
        }));
      } else {
        // Flag the post
        const postRef = doc(db, 'tailtalks', flaggingPostId);
        await updateDoc(postRef, {
          isFlagged: true,
          flagReason: flagReason,
          flaggedBy: userEmail, // Use email instead of uid
          flaggedAt: serverTimestamp()
        });
        
        // Update local state
        setPosts(posts.map(post => 
          post.id === flaggingPostId 
            ? {...post, isFlagged: true, flagReason: flagReason} 
            : post
        ));
      }
      
      setShowFlagModal(false);
      showNotification('success', 'Content has been flagged for review. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Error flagging content:', error);
      showNotification('error', 'Failed to flag content. Please try again later.');
    } finally {
      setFlagSubmitting(false);
    }
  };

  // Add flag modal to render
  const renderFlagModal = () => {
    if (!showFlagModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-lg p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold mb-3">
            {flaggingCommentId ? 'Report Comment' : 'Report Post'}
          </h3>
          <p className="text-gray-600 mb-3">
            Please tell us why you're reporting this {flaggingCommentId ? 'comment' : 'post'}
          </p>
          
          <select 
            className="w-full p-2 border border-gray-300 rounded mb-4"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
          >
            <option value="">Select a reason</option>
            <option value="spam">Spam</option>
            <option value="inappropriate">Inappropriate content</option>
            <option value="harassment">Harassment or bullying</option>
            <option value="false_information">False information</option>
            <option value="violence">Violence or dangerous content</option>
            <option value="hate_speech">Hate speech</option>
            <option value="other">Other</option>
          </select>
          
          {flagReason === 'other' && (
            <textarea
              className="w-full p-2 border border-gray-300 rounded mb-4"
              placeholder="Please explain why you're reporting this content"
              rows="3"
              value={flagReason === 'other' ? flagReason : ''}
              onChange={(e) => setFlagReason(e.target.value)}
            />
          )}
          
          <div className="flex justify-end">
            <button
              className="px-4 py-2 text-gray-600 rounded-lg mr-2"
              onClick={() => setShowFlagModal(false)}
              disabled={flagSubmitting}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center"
              onClick={submitFlag}
              disabled={!flagReason || flagSubmitting}
            >
              {flagSubmitting ? 'Submitting...' : 'Report'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // In the render method, remove the showFeaturePrompt toast element
  return (
    <div className="pb-16 bg-gray-100 min-h-screen">
      {/* Fixed Header - Updated with refresh button */}
      <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-primary">Tail Talks</h1>
        <div className="flex space-x-2">
          <button
            className="text-gray-600"
            onClick={() => showComingSoon('Search')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            className="text-gray-600"
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium flex items-center mr-2"
            onClick={() => {
              setIsPostAsQuestion(true); // Set as question before opening modal
              setAskModalOpen(true);
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Ask Question
          </button>
          <button
            className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium flex items-center"
            onClick={() => {
              setIsPostAsQuestion(false); // Set as regular post before opening modal
              setAskModalOpen(true);
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Post
          </button>
        </div>
      </div>

      {/* Main Content - Redesigned with sidebar on the left */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:space-x-4">
          {/* Sidebar - now on left side with sticky positioning */}
          <div className="md:w-1/4 mb-4 md:mb-0">
            <div className="md:sticky md:top-20 space-y-4">
              {/* My Posts section */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-medium text-primary mb-3">My Posts</h3>
                <button
                  onClick={() => navigate('/tailtalk/myposts')}
                  className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium transition duration-200 hover:bg-primary-dark"
                >
                  View My Posts
                </button>
              </div>
              
              {/* Coming Soon: Pet Community section */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="text-center">
                  <h3 className="text-xl font-medium text-primary mb-2">Coming Soon: Pet Community</h3>
                  <p className="text-gray-600 mb-4">
                    Soon, all pet parents will be able to share their own stories, ask questions, and interact with other pet lovers.
                  </p>
                  <button
                    onClick={() => showNotification('success', 'Thanks for your interest! We\'ll notify you when Community launches.')}
                    className="w-full bg-primary text-white py-2 px-4 rounded-full text-sm hover:bg-primary-dark transition-colors"
                  >
                    <span className="flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      I'm Interested!
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Suggested For You section */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-medium text-gray-700 mb-3">Suggested For You</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=256&q=80" alt="Dr. Amanda" className="w-8 h-8 rounded-full mr-2 object-cover" />
                      <div>
                        <p className="font-medium text-gray-800">Dr. Amanda</p>
                        <p className="text-xs text-gray-500">Veterinarian</p>
                      </div>
                    </div>
                    <button 
                      className="text-primary text-sm border border-primary rounded-md px-3 py-1 hover:bg-primary hover:text-white transition-colors"
                      onClick={() => showNotification('info', 'Following feature coming soon!')}
                    >
                      Follow
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <img src="https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGRvZyUyMHRyYWluZXJ8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=256&q=80" alt="PetTrainers" className="w-8 h-8 rounded-full mr-2 object-cover" />
                      <div>
                        <p className="font-medium text-gray-800">PetTrainers</p>
                        <p className="text-xs text-gray-500">Training Tips</p>
                      </div>
                    </div>
                    <button 
                      className="text-primary text-sm border border-primary rounded-md px-3 py-1 hover:bg-primary hover:text-white transition-colors"
                      onClick={() => showNotification('info', 'Following feature coming soon!')}
                    >
                      Follow
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Trending Topics section */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-medium text-gray-700 mb-3">Trending Topics</h3>
                <div className="space-y-3">
                  <div className="cursor-pointer" onClick={() => setActiveTag('adoption')}>
                    <p className="font-medium text-primary">#PetAdoption</p>
                    <p className="text-xs text-gray-500">243 posts this week</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => setActiveTag('training')}>
                    <p className="font-medium text-primary">#DogTraining</p>
                    <p className="text-xs text-gray-500">153 posts this week</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => setActiveTag('catcare')}>
                    <p className="font-medium text-primary">#CatCare</p>
                    <p className="text-xs text-gray-500">97 posts this week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="md:w-3/4">
            <PullToRefresh
              pullDownThreshold={80}
              onRefresh={handleRefresh}
              pullingContent={
                <div className="text-center py-3 text-gray-500">
                  <span>Pull down to refresh...</span>
                </div>
              }
              refreshingContent={
                <div className="flex justify-center items-center py-3">
                  <LoadingSpinner size="small" />
                  <span className="ml-2 text-gray-600">Refreshing...</span>
                </div>
              }
            >
              {/* Create Post Box */}
              <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
                <div className="flex">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 overflow-hidden">
                    {currentUser?.photoURL ? (
                      <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-primary">
                        {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'P'}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex-grow bg-gray-100 rounded-full px-4 py-2.5 text-gray-500 cursor-pointer"
                    onClick={() => setAskModalOpen(true)}
                  >
                    What's on your mind about your pets?
                  </div>
                </div>
              </div>

              {/* Main Feed Content */}
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {posts.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {posts.map(post => renderPostCard(post))}
                      </div>

                      {/* Load more trigger */}
                      <div
                        ref={observerTarget}
                        className="py-4 text-center"
                      >
                        {loadingMore && <LoadingSpinner size="small" />}
                        {!hasMore && posts.length > 10 && (
                          <p className="text-sm text-gray-500">No more posts to load</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                      </svg>
                      <p className="mt-2 text-gray-500">No posts found in this category yet</p>
                    </div>
                  )}
                </>
              )}
            </PullToRefresh>
          </div>
        </div>
      </div>

      <MobileBottomNav />

      {/* Render the Ask Modal */}
      {renderAskModal()}
      
      {/* Flag Modal */}
      {renderFlagModal()}
    </div>
  );
};

// Wrap the component with NotificationProvider to ensure context is available
const TailTalks = () => {
  return (
    <NotificationProvider>
      <TailTalksInner />
    </NotificationProvider>
  );
};

export default TailTalks;