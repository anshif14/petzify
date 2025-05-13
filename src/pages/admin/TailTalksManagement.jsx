import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc,
  updateDoc, deleteDoc, serverTimestamp, where
} from 'firebase/firestore';
import { app } from '../../firebase/config';
import { useUser } from '../../context/UserContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FaEdit, FaTrash, FaCheck, FaTimes, FaReply } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TailTalksManagement = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isAuthenticated } = useUser();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [directQuestions, setDirectQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts();
    } else if (activeTab === 'questions') {
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
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
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

  const handleUpdateQuestionStatus = async (questionId, postId, status) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to perform this action');
        return;
      }
      
      const db = getFirestore(app);
      const questionRef = doc(db, `tailtalks/${postId}/questions`, questionId);
      
      await updateDoc(questionRef, {
        status,
        updatedAt: serverTimestamp(),
        moderatorId: currentUser.uid
      });
      
      // Update state
      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, status, updatedAt: new Date() } : q
      ));
      
      toast.success(`Question ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating question status:', error);
      toast.error('Failed to update question status.');
    }
  };

  const handleUpdateDirectQuestion = async (questionId, status) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to perform this action');
        return;
      }
      
      const db = getFirestore(app);
      const questionRef = doc(db, 'direct_questions', questionId);
      
      await updateDoc(questionRef, {
        status,
        updatedAt: serverTimestamp()
      });
      
      // Update state
      setDirectQuestions(directQuestions.map(q => 
        q.id === questionId ? { ...q, status, updatedAt: new Date() } : q
      ));
      
      toast.success(`Question ${status} successfully!`);
    } catch (error) {
      console.error('Error updating direct question status:', error);
      toast.error('Failed to update question status.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      if (!currentUser) {
        toast.error('You must be logged in to perform this action');
        return;
      }
      
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

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderPostsTab = () => (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {post.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {post.authorName || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {post.type || 'text'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {post.createdAt ? formatDate(post.createdAt) : 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  <button
                    onClick={() => navigate(`/tailtalk/post/${post.id}`)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/admin/tailtalk?edit=${post.id}`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderQuestionsTab = () => (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {questions.map((question) => (
              <tr key={question.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {question.postTitle || 'Unknown'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {question.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.authorName || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    question.status === 'approved' ? 'bg-green-100 text-green-800' :
                    question.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {question.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.createdAt ? formatDate(question.createdAt) : 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  {question.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateQuestionStatus(question.id, question.postId, 'approved')}
                        className="text-green-600 hover:text-green-900"
                        title="Approve"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={() => handleUpdateQuestionStatus(question.id, question.postId, 'rejected')}
                        className="text-red-600 hover:text-red-900"
                        title="Reject"
                      >
                        <FaTimes />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => window.open(`/tailtalk/post/${question.postId}`, '_blank')}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="View Post"
                  >
                    View Post
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDirectQuestionsTab = () => (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {directQuestions.map((question) => (
              <tr key={question.id}>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {question.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.authorName || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    question.status === 'answered' ? 'bg-green-100 text-green-800' :
                    question.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {question.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.createdAt ? formatDate(question.createdAt) : 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                  {question.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateDirectQuestion(question.id, 'answered')}
                        className="text-green-600 hover:text-green-900"
                        title="Mark as Answered"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={() => handleUpdateDirectQuestion(question.id, 'rejected')}
                        className="text-red-600 hover:text-red-900"
                        title="Reject"
                      >
                        <FaTimes />
                      </button>
                    </>
                  )}
                  {question.imageUrl && (
                    <button
                      onClick={() => window.open(question.imageUrl, '_blank')}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Image"
                    >
                      Image
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tail Talks Management</h1>
          <button
            onClick={() => navigate('/admin/tailtalk')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go to Content Editor
          </button>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Posts
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'questions'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Post Questions
              </button>
              <button
                onClick={() => setActiveTab('direct-questions')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'direct-questions'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Direct Questions
              </button>
            </nav>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {activeTab === 'posts' && renderPostsTab()}
                {activeTab === 'questions' && renderQuestionsTab()}
                {activeTab === 'direct-questions' && renderDirectQuestionsTab()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailTalksManagement; 