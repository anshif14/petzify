import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CreatePost = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const { showSuccess, showError } = useAlert();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('text'); // 'text', 'image', 'poll'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCommunity, setFetchingCommunity] = useState(true);
  
  const imageInputRef = useRef(null);
  
  React.useEffect(() => {
    if (!isAuthenticated()) {
      showError('Please sign in to create a post');
      navigate('/login');
      return;
    }
    
    fetchCommunityDetails();
  }, [communityId]);
  
  const fetchCommunityDetails = async () => {
    try {
      setFetchingCommunity(true);
      const db = getFirestore(app);
      const communityRef = doc(db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);
      
      if (communityDoc.exists()) {
        setCommunity({
          id: communityDoc.id,
          ...communityDoc.data()
        });
      } else {
        showError('Community not found');
        navigate('/tailtalk');
      }
    } catch (error) {
      console.error('Error fetching community:', error);
      showError('Failed to load community details');
    } finally {
      setFetchingCommunity(false);
    }
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size should be less than 5MB');
      return;
    }
    
    setImageFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    } else {
      showError('Maximum 6 poll options allowed');
    }
  };
  
  const handlePollOptionChange = (index, value) => {
    const newPollOptions = [...pollOptions];
    newPollOptions[index] = value;
    setPollOptions(newPollOptions);
  };
  
  const handleRemovePollOption = (index) => {
    if (pollOptions.length <= 2) {
      showError('At least 2 options are required for a poll');
      return;
    }
    
    const newPollOptions = pollOptions.filter((_, i) => i !== index);
    setPollOptions(newPollOptions);
  };
  
  const validatePost = () => {
    if (!title.trim()) {
      showError('Please enter a title for your post');
      return false;
    }
    
    if (postType === 'text' && !content.trim()) {
      showError('Please enter some content for your post');
      return false;
    }
    
    if (postType === 'image' && !imageFile) {
      showError('Please select an image for your post');
      return false;
    }
    
    if (postType === 'poll') {
      // Check if all poll options have text
      const emptyOptions = pollOptions.filter(option => !option.trim());
      if (emptyOptions.length > 0) {
        showError('Please fill in all poll options');
        return false;
      }
      
      // Check for duplicate options
      const uniqueOptions = new Set(pollOptions.map(opt => opt.trim()));
      if (uniqueOptions.size !== pollOptions.length) {
        showError('Poll options must be unique');
        return false;
      }
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePost()) return;
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      const storage = getStorage(app);
      
      let imageUrl = null;
      
      // Upload image if needed
      if (postType === 'image' && imageFile) {
        const storageRef = ref(storage, `community_posts/${communityId}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Prepare poll options if needed
      const formattedPollOptions = postType === 'poll' 
        ? pollOptions.map(text => ({ 
            text, 
            votes: 0,
            voters: []
          }))
        : null;
      
      // Handle different user ID formats from Firebase
      const authorId = currentUser?.uid || currentUser?.id || currentUser?.email || 'anonymous';
      
      // Create post document
      const postData = {
        title,
        content: postType === 'text' ? content : '',
        imageUrl: imageUrl || null,
        authorId, // Use the safe authorId value
        authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous',
        authorEmail: currentUser?.email || 'anonymous@example.com',
        authorAvatar: currentUser?.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        likes: [],
        isPoll: postType === 'poll',
        pollOptions: formattedPollOptions,
        deleted: false
      };
      
      console.log('User data:', currentUser); // Add this for debugging
      console.log('Post data being saved:', postData); // Add this for debugging
      
      const postsRef = collection(db, `communities/${communityId}/posts`);
      const newPostRef = await addDoc(postsRef, postData);
      
      showSuccess('Post created successfully!');
      navigate(`/tailtalk/community/${communityId}/post/${newPostRef.id}`);
      
    } catch (error) {
      console.error('Error creating post:', error);
      showError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (fetchingCommunity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <button 
          className="text-gray-600"
          onClick={() => navigate(`/tailtalk/community/${communityId}`)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-center">Create Post</h1>
        <button 
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            loading ? 'bg-gray-300 text-gray-500' : 'bg-primary text-white'
          }`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
      
      {/* Community Info */}
      <div className="bg-white p-4 flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3">
          {community?.coverUrl ? (
            <img 
              src={community.coverUrl} 
              alt={community.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          )}
        </div>
        <div>
          <p className="font-medium">{community?.name}</p>
          <p className="text-xs text-gray-500">{community?.memberCount || 0} members</p>
        </div>
      </div>
      
      {/* Post Type Selection */}
      <div className="bg-white px-4 py-2 mb-4">
        <div className="flex justify-around">
          <button 
            className={`px-4 py-2 text-sm font-medium flex flex-col items-center ${
              postType === 'text' ? 'text-primary' : 'text-gray-500'
            }`}
            onClick={() => setPostType('text')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Text
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium flex flex-col items-center ${
              postType === 'image' ? 'text-primary' : 'text-gray-500'
            }`}
            onClick={() => setPostType('image')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium flex flex-col items-center ${
              postType === 'poll' ? 'text-primary' : 'text-gray-500'
            }`}
            onClick={() => setPostType('poll')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Poll
          </button>
        </div>
      </div>
      
      {/* Post Form */}
      <div className="bg-white p-4">
        <form>
          {/* Title - common for all post types */}
          <div className="mb-4">
            <input 
              type="text" 
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {title.length}/100
            </div>
          </div>
          
          {/* Text content - only for text posts */}
          {postType === 'text' && (
            <div className="mb-4">
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary min-h-[150px]"
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
              />
              <div className="text-xs text-gray-500 text-right mt-1">
                {content.length}/2000
              </div>
            </div>
          )}
          
          {/* Image upload - only for image posts */}
          {postType === 'image' && (
            <div className="mb-4">
              <input 
                type="file" 
                ref={imageInputRef}
                className="hidden"
                accept="image/*" 
                onChange={handleImageChange}
              />
              
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden mb-3">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full object-cover max-h-[300px]"
                  />
                  <button 
                    type="button"
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center cursor-pointer"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500">Click to upload an image</p>
                  <p className="text-xs text-gray-400 mt-1">Max size: 5MB</p>
                </div>
              )}
              
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary mt-3"
                placeholder="Add a caption (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
              />
            </div>
          )}
          
          {/* Poll options - only for poll posts */}
          {postType === 'poll' && (
            <div className="mb-4">
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary mb-4"
                placeholder="Poll description (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
              />
              
              <p className="text-sm font-medium mb-2">Poll Options</p>
              
              <div className="space-y-3">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center">
                    <input 
                      type="text" 
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handlePollOptionChange(index, e.target.value)}
                      maxLength={100}
                    />
                    {index > 1 && (
                      <button 
                        type="button"
                        className="ml-2 text-gray-500"
                        onClick={() => handleRemovePollOption(index)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {pollOptions.length < 6 && (
                <button 
                  type="button"
                  className="mt-3 flex items-center text-primary text-sm font-medium"
                  onClick={handleAddPollOption}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Option
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreatePost; 