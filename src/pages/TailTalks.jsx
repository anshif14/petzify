import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc, serverTimestamp, addDoc, where, runTransaction, startAfter, increment, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotification, NotificationProvider } from '../context/NotificationContext';
import { PullToRefresh } from 'react-js-pull-to-refresh';

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

  // Create observer ref for infinite scrolling
  const observerTarget = useRef(null);

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
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });

      console.log('Fetched comments for post', postId, ':', commentsData);

      // Update the post with fetched comments
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: commentsData
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

      // Prepare the post data with safe checks for all user fields
      const postData = {
        title: postTitle.trim(),
        content: postContent.trim(),
        authorId: (currentUser && currentUser.uid) ? currentUser.uid : 'anonymous',
        authorName: (currentUser && currentUser.displayName) ? currentUser.displayName :
                    (currentUser && currentUser.email) ? currentUser.email.split('@')[0] : 'Anonymous',
        authorPhotoURL: (currentUser && currentUser.photoURL) ? currentUser.photoURL : null,
        type: postType,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        tags: tags.length > 0 ? tags : ['TailTalks']
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

        // Reset form
        setPostTitle('');
        setPostContent('');
        setPostType('text');
        setSelectedImage(null);
        setSelectedVideo(null);
        setMediaPreview(null);
        setParsedTags([]);

        // Close modal
        setAskModalOpen(false);

        // Show success message
        showNotification('success', 'Post created successfully!');

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

      // Ensure likedPosts is initialized
      const currentLikedStatus = likedPosts?.[postId] || false;

      // Update UI optimistically
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: currentLikedStatus ? Math.max(0, post.likeCount - 1) : post.likeCount + 1
          };
        }
        return post;
      });

      setPosts(updatedPosts);

      // Update liked posts state
      setLikedPosts(prev => ({
        ...prev,
        [postId]: !currentLikedStatus
      }));

      // For dummy posts, just update the UI and return
      if (postId.startsWith('dummy')) {
        showNotification('success', 'Post liked!');
        return;
      }

      // For real posts, update in Firestore
      const db = getFirestore(app);
      const postRef = doc(db, 'tailtalks', postId);

      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);

        if (!postDoc.exists()) {
          throw new Error("Post does not exist!");
        }

        const newLikeCount = currentLikedStatus
          ? Math.max(0, postDoc.data().likeCount - 1)
          : (postDoc.data().likeCount || 0) + 1;

        transaction.update(postRef, { likeCount: newLikeCount });

        // Update user likes collection
        if (currentUser?.uid) {
          const userLikesRef = doc(db, 'user_likes', currentUser.uid);
          const userLikesDoc = await transaction.get(userLikesRef);

          if (userLikesDoc.exists()) {
            const userData = userLikesDoc.data();
            const likedPostsData = userData.likedPosts || {};

            if (currentLikedStatus) {
              delete likedPostsData[postId];
            } else {
              likedPostsData[postId] = true;
            }

            transaction.update(userLikesRef, { likedPosts: likedPostsData });
          } else {
            transaction.set(userLikesRef, {
              userId: currentUser.uid,
              likedPosts: { [postId]: !currentLikedStatus }
            });
          }
        }
      });

    } catch (error) {
      console.error('Error updating like status:', error);

      // Revert optimistic UI update
      const currentLikedStatus = likedPosts?.[postId] || false;
      const revertedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: currentLikedStatus ? post.likeCount + 1 : Math.max(0, post.likeCount - 1)
          };
        }
        return post;
      });

      setPosts(revertedPosts);
      setLikedPosts(prev => ({
        ...prev,
        [postId]: currentLikedStatus
      }));

      showNotification('error', 'Failed to update like. Please try again.');
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
    return [
      {
        id: 'dummy1',
        title: 'Welcome to Tail Talks!',
        content: 'Share your pet stories, ask for advice, and connect with other pet lovers. #PetCommunity #TailTalks',
        authorName: 'Petzify Team',
        type: 'text',
        tags: ['PetCommunity', 'TailTalks'],
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
      const pageSize = 10; // Reduced from 20 for better UX

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
          likeCount: data.likeCount || 0,
          commentCount: data.commentCount || 0,
          shareCount: data.shareCount || 0,
          createdAt: data.createdAt || serverTimestamp()
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
    if (isAuthenticated() && currentUser?.uid) {
      const checkLikedPosts = async () => {
        try {
          const db = getFirestore(app);
          const userLikesRef = doc(db, 'user_likes', currentUser.uid);
          const docSnap = await getDoc(userLikesRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setLikedPosts(userData.likedPosts || {});
          }
        } catch (error) {
          console.error('Error fetching liked posts:', error);
        }
      };

      checkLikedPosts();
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

      // Optimistic UI update
      const newComment = {
        id: tempId,
        text: commentText,
        content: commentText,
        authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
        authorPhotoURL: currentUser?.photoURL || null,
        createdAt: new Date()
      };

      // Find the post and add the comment
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          // Initialize comments array if it doesn't exist
          const existingComments = post.comments || [];
          const updatedComments = [newComment, ...existingComments];
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
        authorName: (currentUser && currentUser.displayName) ? currentUser.displayName :
                    (currentUser && currentUser.email) ? currentUser.email.split('@')[0] : 'Anonymous',
        authorPhotoURL: (currentUser && currentUser.photoURL) ? currentUser.photoURL : null,
        createdAt: serverTimestamp()
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

  // Function to render a post card
  const renderPostCard = (post) => {
    const isCommentVisible = commentsVisible[post.id] || false;
    const isPostLiked = likedPosts?.[post.id] || false;

    return (
      <div key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
        {/* Post Header */}
        <div className="p-4">
          <div className="flex items-center mb-3">
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

          {/* Post Content */}
          <div onClick={() => handlePostClick(post.id)} className="cursor-pointer">
            <h3 className="font-bold mb-2 text-left">{post.title}</h3>

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
          </div>

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
              <svg className="w-5 h-5 mr-1" fill={isPostLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
              </svg>
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
                handleSharePost(post.id, e);
              }}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
              <span>Share</span>
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
                      {comment.authorPhotoURL ? (
                        <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-gray-500 text-xs">
                          {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'A'}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow max-w-[85%]">
                      <div className="bg-primary/5 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-xs text-primary-dark">{comment.authorName || 'Anonymous'}</p>
                          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-left text-gray-800 break-words whitespace-pre-wrap">{comment.text || comment.content || 'No text'}</p>
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
            <h3 className="text-lg font-semibold text-primary">Create Post</h3>
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
            className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium flex items-center"
            onClick={() => setAskModalOpen(true)}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Ask Petzify
          </button>
        </div>
      </div>

      {/* Main Content - Redesigned with sidebar on the left */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row md:space-x-4">
          {/* Sidebar - now on left side */}
          <div className="md:w-1/4 mb-4 md:mb-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-16">
              <h2 className="font-medium text-gray-900 mb-3">Categories</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTag('all')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    activeTag === 'all'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Posts
                </button>
                <button
                  onClick={() => setActiveTag('question')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    activeTag === 'question'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Questions
                </button>
                <button
                  onClick={() => setActiveTag('discussion')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    activeTag === 'discussion'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Discussions
                </button>
                <button
                  onClick={() => setActiveTag('tip')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    activeTag === 'tip'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Tips & Advice
                </button>
              </div>
            </div>

            {/* New Community Coming Soon Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Community Coming Soon!</h3>
                <p className="text-sm text-gray-600 mb-3">Join groups, connect with pet owners, and participate in local events.</p>
                <button
                  onClick={() => showNotification('success', 'Thanks for your interest! We\'ll notify you when Community launches.')}
                  className="w-full bg-primary text-white py-2 px-4 rounded-md text-sm hover:bg-primary-dark transition-colors"
                >
                  Show Interest
                </button>
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