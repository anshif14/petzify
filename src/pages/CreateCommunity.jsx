import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CreateCommunity = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const { showSuccess, showError } = useAlert();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [rules, setRules] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  
  const coverInputRef = useRef(null);
  
  React.useEffect(() => {
    if (!isAuthenticated()) {
      showError('Please sign in to create a community');
      navigate('/login');
    }
  }, []);
  
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size should be less than 5MB');
      return;
    }
    
    setCoverFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleAddRule = () => {
    if (rules.length < 10) {
      setRules([...rules, '']);
    } else {
      showError('Maximum 10 rules allowed');
    }
  };
  
  const handleRuleChange = (index, value) => {
    const newRules = [...rules];
    newRules[index] = value;
    setRules(newRules);
  };
  
  const handleRemoveRule = (index) => {
    if (rules.length <= 1) {
      showError('At least one rule is required');
      return;
    }
    
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
  };
  
  const validateCommunity = () => {
    if (!name.trim()) {
      showError('Please enter a name for your community');
      return false;
    }
    
    if (name.length < 3) {
      showError('Community name should be at least 3 characters');
      return false;
    }
    
    if (!description.trim()) {
      showError('Please enter a description for your community');
      return false;
    }
    
    // Filter out empty rules
    const filteredRules = rules.filter(rule => rule.trim() !== '');
    if (filteredRules.length === 0) {
      showError('Please add at least one community rule');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCommunity()) return;
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      const storage = getStorage(app);
      
      let coverUrl = null;
      
      // Upload cover image if provided
      if (coverFile) {
        const storageRef = ref(storage, `community_covers/${Date.now()}_${coverFile.name}`);
        await uploadBytes(storageRef, coverFile);
        coverUrl = await getDownloadURL(storageRef);
      }
      
      // Filter out empty rules
      const filteredRules = rules.filter(rule => rule.trim() !== '');
      
      // Create community document
      const communityData = {
        name,
        description,
        coverUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.email,
        memberCount: 1, // Creator is the first member
        members: [currentUser.email],
        moderators: [
          {
            email: currentUser.email,
            name: currentUser.displayName || currentUser.email.split('@')[0],
            avatar: currentUser.photoURL || null,
            role: 'owner'
          }
        ],
        rules: filteredRules
      };
      
      const communitiesRef = collection(db, 'communities');
      const newCommunityRef = await addDoc(communitiesRef, communityData);
      
      showSuccess('Community created successfully!');
      navigate(`/tailtalk/community/${newCommunityRef.id}`);
      
    } catch (error) {
      console.error('Error creating community:', error);
      showError('Failed to create community. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
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
          onClick={() => navigate('/tailtalk')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-center">Create Community</h1>
        <button 
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            loading ? 'bg-gray-300 text-gray-500' : 'bg-primary text-white'
          }`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
      
      {/* Form */}
      <div className="p-4">
        <form className="bg-white rounded-lg shadow-sm p-4">
          {/* Community Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Community Name*
            </label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter community name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {name.length}/50
            </div>
          </div>
          
          {/* Cover Image */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Image
            </label>
            <input 
              type="file" 
              ref={coverInputRef}
              className="hidden"
              accept="image/*" 
              onChange={handleCoverChange}
            />
            
            {coverPreview ? (
              <div className="relative rounded-lg overflow-hidden mb-3">
                <img 
                  src={coverPreview} 
                  alt="Preview" 
                  className="w-full object-cover h-40"
                />
                <button 
                  type="button"
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
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
                onClick={() => coverInputRef.current?.click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500">Click to upload a cover image</p>
                <p className="text-xs text-gray-400 mt-1">Recommended size: 1200x300px</p>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description*
            </label>
            <textarea 
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
              placeholder="What is this community about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {description.length}/500
            </div>
          </div>
          
          {/* Community Rules */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Community Rules*
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Create rules to set the expectations for your community members
            </p>
            
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-center">
                  <input 
                    type="text" 
                    className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder={`Rule ${index + 1}`}
                    value={rule}
                    onChange={(e) => handleRuleChange(index, e.target.value)}
                    maxLength={100}
                  />
                  {rules.length > 1 && (
                    <button 
                      type="button"
                      className="ml-2 text-gray-500"
                      onClick={() => handleRemoveRule(index)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {rules.length < 10 && (
              <button 
                type="button"
                className="mt-3 flex items-center text-primary text-sm font-medium"
                onClick={handleAddRule}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Rule
              </button>
            )}
          </div>
          
          <div className="mt-6">
            <p className="text-xs text-gray-500">
              By creating a community, you agree to our Community Guidelines and Terms of Service.
              You will automatically become the owner and moderator of this community.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCommunity; 