import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFirestore, collection, query, orderBy, getDocs, doc, getDoc,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../../firebase/config';
import { useUser } from '../../context/UserContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FaEdit, FaTrash, FaCheck, FaTimes, FaReply } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TailTalksAdminPanel = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isAuthenticated } = useUser();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [editPostId, setEditPostId] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [directQuestions, setDirectQuestions] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'text',
    tags: [],
    imageFile: null,
    imageUrl: '',
    videoUrl: '',
    videoFile: null,
    thumbnailFile: null,
    thumbnailUrl: ''
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    // Redirect non-admin users
    if (isAuthenticated() && !isAdmin()) {
      navigate('/');
      return;
    }

    fetchPosts();
    
    if (activeTab === 'questions') {
      fetchQuestions();
    } else if (activeTab === 'direct-questions') {
      fetchDirectQuestions();
    }
  }, [currentUser, activeTab]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const postsRef = collection(db, 'tailtalks');
      const q = query(postsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const postsData = [];
      querySnapshot.forEach((doc) => {
        postsData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setPosts(postsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Initialize an array to hold all questions from all posts
      let allQuestions = [];
      
      // First, get all posts
      const postsRef = collection(db, 'tailtalks');
      const postsSnapshot = await getDocs(postsRef);
      
      // For each post, get its questions
      const questionsPromises = postsSnapshot.docs.map(async (postDoc) => {
        const postId = postDoc.id;
        const postData = postDoc.data();
        const questionsRef = collection(db, `tailtalks/${postId}/questions`);
        const questionsSnapshot = await getDocs(query(questionsRef, orderBy('createdAt', 'desc')));
        
        const postQuestions = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          postId,
          postTitle: postData.title,
          ...doc.data()
        }));
        
        return postQuestions;
      });
      
      // Wait for all questions to be fetched
      const questionsArrays = await Promise.all(questionsPromises);
      
      // Flatten the array of arrays
      allQuestions = questionsArrays.flat();
      
      // Sort by creation date (newest first)
      allQuestions.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });
      
      setQuestions(allQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
    }
  };

  const fetchDirectQuestions = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const questionsRef = collection(db, 'direct_questions');
      const q = query(questionsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const questionsData = [];
      querySnapshot.forEach((doc) => {
        questionsData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setDirectQuestions(questionsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching direct questions:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData({
        ...formData,
        [name]: files[0]
      });
    }
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim().toLowerCase())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim().toLowerCase()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleTypeChange = (e) => {
    setFormData({
      ...formData,
      type: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'text',
      tags: [],
      imageFile: null,
      imageUrl: '',
      videoUrl: '',
      videoFile: null,
      thumbnailFile: null,
      thumbnailUrl: ''
    });
    setTagInput('');
    setEditPostId(null);
  };

  const handleEditPost = (post) => {
    setEditPostId(post.id);
    setFormData({
      title: post.title || '',
      content: post.content || '',
      type: post.type || 'text',
      tags: post.tags || [],
      imageUrl: post.imageUrl || '',
      videoUrl: post.videoUrl || '',
      thumbnailUrl: post.thumbnailUrl || ''
    });
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Delete the post document
      await deleteDoc(doc(db, 'tailtalks', postId));
      
      // If successful, update the UI
      setPosts(posts.filter(post => post.id !== postId));
      toast.success('Post deleted successfully!');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      const storage = getStorage(app);
      
      let postData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        tags: formData.tags,
        updatedAt: serverTimestamp()
      };
      
      // Handle image upload if needed
      if (formData.type === 'image' && formData.imageFile) {
        const imageRef = ref(storage, `tailtalks/images/${Date.now()}_${formData.imageFile.name}`);
        await uploadBytes(imageRef, formData.imageFile);
        postData.imageUrl = await getDownloadURL(imageRef);
      } else if (formData.type === 'image') {
        postData.imageUrl = formData.imageUrl;
      }
      
      // Handle video upload or YouTube link
      if (formData.type === 'video') {
        if (formData.videoFile) {
          const videoRef = ref(storage, `tailtalks/videos/${Date.now()}_${formData.videoFile.name}`);
          await uploadBytes(videoRef, formData.videoFile);
          postData.videoUrl = await getDownloadURL(videoRef);
        } else {
          postData.videoUrl = formData.videoUrl;
        }
        
        // Handle thumbnail upload
        if (formData.thumbnailFile) {
          const thumbnailRef = ref(storage, `tailtalks/thumbnails/${Date.now()}_${formData.thumbnailFile.name}`);
          await uploadBytes(thumbnailRef, formData.thumbnailFile);
          postData.thumbnailUrl = await getDownloadURL(thumbnailRef);
        } else {
          postData.thumbnailUrl = formData.thumbnailUrl;
        }
      }
      
      if (editPostId) {
        // Update existing post
        const postRef = doc(db, 'tailtalks', editPostId);
        await updateDoc(postRef, postData);
        toast.success('Post updated successfully!');
      } else {
        // Create new post
        postData.createdAt = serverTimestamp();
        postData.authorName = 'Petzify Team';
        postData.likeCount = 0;
        postData.commentCount = 0;
        
        await addDoc(collection(db, 'tailtalks'), postData);
        toast.success('Post created successfully!');
      }
      
      // Reset form and refresh posts list
      resetForm();
      fetchPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = async (question, answer) => {
    if (!answer.trim()) {
      toast.error('Please enter an answer');
      return;
    }
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      const questionRef = doc(db, `tailtalks/${question.postId}/questions`, question.id);
      
      await updateDoc(questionRef, {
        answered: true,
        answer: answer.trim(),
        answeredBy: currentUser.uid,
        answeredAt: serverTimestamp()
      });
      
      // Update local state
      setQuestions(questions.map(q => 
        q.id === question.id ? {
          ...q,
          answered: true,
          answer: answer.trim(),
          answeredBy: currentUser.uid,
          answeredAt: new Date()
        } : q
      ));
      
      toast.success('Answer posted successfully!');
    } catch (error) {
      console.error('Error answering question:', error);
      toast.error('Failed to post answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerDirectQuestion = async (questionId, status) => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const questionRef = doc(db, 'direct_questions', questionId);
      
      await updateDoc(questionRef, {
        status,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setDirectQuestions(directQuestions.map(q => 
        q.id === questionId ? { ...q, status, updatedAt: new Date() } : q
      ));
      
      toast.success(`Question ${status === 'answered' ? 'answered' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating question status:', error);
      toast.error('Failed to update question status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Tail Talks Admin Panel</h1>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'posts' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('posts')}
        >
          Manage Posts
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'questions' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('questions')}
        >
          Answer Questions
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'direct-questions' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
          onClick={() => setActiveTab('direct-questions')}
        >
          Direct Questions
        </button>
      </div>
      
      {activeTab === 'posts' && (
        <>
          {/* Create/Edit Post Form */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">{editPostId ? 'Edit Post' : 'Create New Post'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Post Type</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="text"
                      checked={formData.type === 'text'}
                      onChange={handleTypeChange}
                      className="form-radio h-5 w-5 text-primary"
                    />
                    <span className="ml-2">Text</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="image"
                      checked={formData.type === 'image'}
                      onChange={handleTypeChange}
                      className="form-radio h-5 w-5 text-primary"
                    />
                    <span className="ml-2">Image</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="type"
                      value="video"
                      checked={formData.type === 'video'}
                      onChange={handleTypeChange}
                      className="form-radio h-5 w-5 text-primary"
                    />
                    <span className="ml-2">Video</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter post title"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Content</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter post content"
                  rows="4"
                ></textarea>
              </div>
              
              {/* Image upload section */}
              {formData.type === 'image' && (
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Image</label>
                  {formData.imageUrl && (
                    <div className="mb-2">
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="max-h-40 rounded-lg border" 
                      />
                    </div>
                  )}
                  <div className="flex items-center">
                    <input
                      type="file"
                      name="imageFile"
                      onChange={handleFileChange}
                      className="w-full"
                      accept="image/*"
                    />
                    {!formData.imageFile && (
                      <div className="ml-4 flex-shrink-0">
                        <label className="block text-gray-700 text-sm font-medium mb-1">Or paste URL</label>
                        <input
                          type="text"
                          name="imageUrl"
                          value={formData.imageUrl}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Video upload section */}
              {formData.type === 'video' && (
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Video</label>
                  <div className="flex space-x-2 mb-4">
                    <button
                      type="button"
                      className={`px-3 py-1 border rounded-lg text-sm ${!formData.videoFile ? 'bg-primary text-white' : 'bg-gray-100'}`}
                      onClick={() => setFormData({...formData, videoFile: null})}
                    >
                      YouTube URL
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 border rounded-lg text-sm ${formData.videoFile ? 'bg-primary text-white' : 'bg-gray-100'}`}
                      onClick={() => document.getElementById('videoFileInput').click()}
                    >
                      Upload Video
                    </button>
                  </div>
                  
                  {!formData.videoFile && (
                    <input
                      type="text"
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
                      placeholder="YouTube URL (e.g., https://www.youtube.com/watch?v=abcdef)"
                    />
                  )}
                  
                  <input
                    id="videoFileInput"
                    type="file"
                    name="videoFile"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="video/*"
                  />
                  
                  {formData.videoFile && (
                    <div className="p-3 bg-gray-100 rounded-lg mb-2">
                      <p className="text-sm">{formData.videoFile.name}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Video Thumbnail</label>
                    {formData.thumbnailUrl && (
                      <div className="mb-2">
                        <img 
                          src={formData.thumbnailUrl} 
                          alt="Thumbnail Preview" 
                          className="max-h-40 rounded-lg border" 
                        />
                      </div>
                    )}
                    <div className="flex items-center">
                      <input
                        type="file"
                        name="thumbnailFile"
                        onChange={handleFileChange}
                        className="w-full"
                        accept="image/*"
                      />
                      {!formData.thumbnailFile && (
                        <div className="ml-4 flex-shrink-0">
                          <label className="block text-gray-700 text-sm font-medium mb-1">Or paste URL</label>
                          <input
                            type="text"
                            name="thumbnailUrl"
                            value={formData.thumbnailUrl}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="https://example.com/thumbnail.jpg"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tags section */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Tags</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={handleTagInputChange}
                    className="flex-grow border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Enter a tag and press Add"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="ml-2 px-4 py-2 bg-primary text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="bg-gray-100 text-gray-800 text-sm font-medium px-2 py-1 rounded-full flex items-center"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-1 text-gray-500 hover:text-gray-700"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <FaTimes size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Form buttons */}
              <div className="flex justify-end space-x-2">
                {editPostId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white font-medium rounded-lg"
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="small" color="white" /> : (editPostId ? 'Update Post' : 'Create Post')}
                </button>
              </div>
            </form>
          </div>
          
          {/* Posts List */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Existing Posts</h2>
            
            {loading && posts.length === 0 ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : posts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Title</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Tags</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map(post => (
                      <tr key={post.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium line-clamp-1">{post.title}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                            {post.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {post.tags?.map(tag => (
                              <span 
                                key={tag} 
                                className="bg-primary-light text-primary text-xs px-2 py-0.5 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditPost(post)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Edit Post"
                            >
                              <FaEdit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Delete Post"
                            >
                              <FaTrash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No posts found. Create your first post!</p>
            )}
          </div>
        </>
      )}
      
      {activeTab === 'questions' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">User Questions</h2>
          
          {loading && questions.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-6">
              {questions.map(question => {
                const isAnswering = question.id === answeringQuestionId;
                
                return (
                  <div key={question.id} className="border-b pb-6 last:border-0">
                    <div className="flex items-start">
                      <div className="flex-grow">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm text-gray-500">
                              From post: <span className="font-medium">{question.postTitle}</span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              By: {question.authorName} • {question.createdAt 
                                ? new Date(question.createdAt.toDate()).toLocaleString() 
                                : 'Recently'}
                            </p>
                          </div>
                          <div>
                            {question.answered ? (
                              <span className="text-green-600 text-sm flex items-center">
                                <FaCheck size={12} className="mr-1" /> Answered
                              </span>
                            ) : (
                              <span className="text-orange-500 text-sm flex items-center">
                                <FaTimes size={12} className="mr-1" /> Unanswered
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">Question:</p>
                          <p className="mt-1">{question.content}</p>
                        </div>
                        
                        {question.answered && (
                          <div className="mt-3 bg-primary/5 p-3 rounded-lg border border-primary/20">
                            <p className="font-medium text-primary">Answer:</p>
                            <p className="mt-1">{question.answer}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Answered on: {question.answeredAt 
                                ? new Date(question.answeredAt.toDate()).toLocaleString() 
                                : 'Recently'}
                            </p>
                          </div>
                        )}
                        
                        {!question.answered && !isAnswering && (
                          <button
                            className="mt-3 text-primary font-medium flex items-center text-sm"
                            onClick={() => {
                              setAnsweringQuestionId(question.id);
                              setAnswerText('');
                            }}
                          >
                            <FaReply size={12} className="mr-1" /> Reply to this question
                          </button>
                        )}
                        
                        {!question.answered && isAnswering && (
                          <div className="mt-3">
                            <textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                              placeholder="Type your answer here..."
                              rows="3"
                            ></textarea>
                            <div className="flex justify-end space-x-2 mt-2">
                              <button
                                className="px-3 py-1 text-gray-600 font-medium rounded-lg text-sm"
                                onClick={() => {
                                  setAnsweringQuestionId(null);
                                  setAnswerText('');
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                className="px-3 py-1 bg-primary text-white font-medium rounded-lg text-sm"
                                onClick={() => {
                                  handleAnswerQuestion(question, answerText);
                                  setAnsweringQuestionId(null);
                                  setAnswerText('');
                                }}
                                disabled={!answerText.trim()}
                              >
                                Post Answer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No questions found yet.</p>
          )}
        </div>
      )}
      
      {activeTab === 'direct-questions' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Direct Questions</h2>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : directQuestions.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No direct questions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {directQuestions.map((question) => (
                    <tr key={question.id}>
                      <td className="px-4 py-4 whitespace-normal">
                        <div className="text-sm font-medium text-gray-900">{question.content}</div>
                        {question.imageUrl && (
                          <a 
                            href={question.imageUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-blue-500 hover:underline"
                          >
                            View Image
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{question.authorName || 'Anonymous'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          question.status === 'answered' ? 'bg-green-100 text-green-800' :
                          question.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {question.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {question.createdAt ? new Date(question.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {question.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAnswerDirectQuestion(question.id, 'answered')}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Answered"
                            >
                              <FaCheck />
                            </button>
                            <button
                              onClick={() => handleAnswerDirectQuestion(question.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <FaTimes />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TailTalksAdminPanel; 