import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotification, NotificationProvider } from '../context/NotificationContext';

const MyPostsInner = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const notification = useNotification();
  
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmPost, setDeleteConfirmPost] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch user's posts
  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!isAuthenticated() || !currentUser) {
        navigate('/login', { state: { from: '/tailtalk/myposts' } });
        return;
      }

      try {
        setLoading(true);
        const db = getFirestore(app);
        const postsRef = collection(db, 'tailtalks');
        
        // We need to check for posts with either UID or email as authorId
        const userEmail = currentUser.email;
        const userId = currentUser.uid;
        
        if (!userId && !userEmail) {
          notification.error('Unable to identify user account');
          return;
        }
        
        // Query posts for user ID
        let postsData = [];
        
        // First query posts where authorId matches the UID
        if (userId) {
          const uidQuery = query(
            postsRef, 
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc')
          );
          
          const uidSnapshot = await getDocs(uidQuery);
          
          uidSnapshot.forEach((doc) => {
            postsData.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date()
            });
          });
        }
        
        // Then query posts where authorId matches the email
        if (userEmail) {
          const emailQuery = query(
            postsRef, 
            where('authorId', '==', userEmail),
            orderBy('createdAt', 'desc')
          );
          
          const emailSnapshot = await getDocs(emailQuery);
          
          emailSnapshot.forEach((doc) => {
            // Check if we already have this post from the UID query
            if (!postsData.some(post => post.id === doc.id)) {
              postsData.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
              });
            }
          });
        }
        
        // Additionally, check if authorEmail field matches (as a backup)
        if (userEmail) {
          const backupQuery = query(
            postsRef, 
            where('authorEmail', '==', userEmail),
            orderBy('createdAt', 'desc')
          );
          
          const backupSnapshot = await getDocs(backupQuery);
          
          backupSnapshot.forEach((doc) => {
            // Check if we already have this post
            if (!postsData.some(post => post.id === doc.id)) {
              postsData.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
              });
            }
          });
        }
        
        // Sort posts by createdAt date (newest first)
        postsData.sort((a, b) => b.createdAt - a.createdAt);
        
        setMyPosts(postsData);
      } catch (error) {
        console.error('Error fetching my posts:', error);
        notification.error('Failed to load your posts');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyPosts();
  }, [currentUser, isAuthenticated, navigate, notification, refreshTrigger]);

  // Handle post edit
  const startEditPost = (post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const cancelEditPost = () => {
    setEditingPost(null);
    setEditTitle('');
    setEditContent('');
  };

  const saveEditPost = async () => {
    if (!editingPost) return;
    
    try {
      const db = getFirestore(app);
      const postRef = doc(db, 'tailtalks', editingPost.id);
      
      await updateDoc(postRef, {
        title: editTitle,
        content: editContent,
        updatedAt: new Date()
      });
      
      // If it's a question post, also update the direct_questions collection
      if (editingPost.isQuestion) {
        // Try to find and update the corresponding question doc
        const questionsRef = collection(db, 'direct_questions');
        
        // Check if we need to search by postId or by authorId+title (which is more reliable)
        let q;
        
        if (editingPost.postId) {
          // If the post has a reference to the original post
          q = query(questionsRef, where('postId', '==', editingPost.id));
        } else {
          // Otherwise search by author and title
          const authorId = editingPost.authorId;
          q = query(
            questionsRef, 
            where('authorId', '==', authorId),
            where('title', '==', editingPost.title)
          );
        }
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const questionDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'direct_questions', questionDoc.id), {
            title: editTitle,
            content: editContent,
            updatedAt: new Date()
          });
        }
      }
      
      notification.success('Post updated successfully');
      setEditingPost(null);
      setRefreshTrigger(prev => prev + 1); // Trigger a refresh
    } catch (error) {
      console.error('Error updating post:', error);
      notification.error('Failed to update post');
    }
  };

  // Handle post deletion
  const confirmDeletePost = (post) => {
    setDeleteConfirmPost(post);
  };

  const cancelDeletePost = () => {
    setDeleteConfirmPost(null);
  };

  const deletePost = async () => {
    if (!deleteConfirmPost) return;
    
    try {
      const db = getFirestore(app);
      const postRef = doc(db, 'tailtalks', deleteConfirmPost.id);
      
      await deleteDoc(postRef);
      
      // If it's a question post, also delete from direct_questions collection
      if (deleteConfirmPost.isQuestion) {
        // Try to find and delete the corresponding question doc
        const questionsRef = collection(db, 'direct_questions');
        
        // We need multiple queries to find all matching questions
        let questionDocs = [];
        
        // First try to find by postId
        const postIdQuery = query(questionsRef, where('postId', '==', deleteConfirmPost.id));
        const postIdSnapshot = await getDocs(postIdQuery);
        
        postIdSnapshot.forEach(doc => {
          questionDocs.push(doc);
        });
        
        // If no results, try to find by author+title
        if (questionDocs.length === 0) {
          const authorId = deleteConfirmPost.authorId;
          const titleQuery = query(
            questionsRef, 
            where('authorId', '==', authorId),
            where('title', '==', deleteConfirmPost.title)
          );
          
          const titleSnapshot = await getDocs(titleQuery);
          titleSnapshot.forEach(doc => {
            questionDocs.push(doc);
          });
        }
        
        // Delete all found question documents
        for (const doc of questionDocs) {
          await deleteDoc(doc.ref);
        }
      }
      
      notification.success('Post deleted successfully');
      setDeleteConfirmPost(null);
      setMyPosts(prevPosts => prevPosts.filter(post => post.id !== deleteConfirmPost.id));
    } catch (error) {
      console.error('Error deleting post:', error);
      notification.error('Failed to delete post');
    }
  };

  // Format date helper function
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    
    try {
      const now = new Date();
      const diffMs = now - date;
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
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Unknown';
    }
  };

  const renderEditModal = () => {
    if (!editingPost) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold text-primary">Edit Post</h3>
            <button
              className="text-gray-500"
              onClick={cancelEditPost}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-2 outline-none resize-none h-32 focus:ring-2 focus:ring-primary"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="mr-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm"
                onClick={cancelEditPost}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                onClick={saveEditPost}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!deleteConfirmPost) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
          </div>

          <div className="p-4">
            <p className="text-gray-700 mb-4">Are you sure you want to delete this post? This action cannot be undone.</p>

            <div className="flex justify-end">
              <button
                type="button"
                className="mr-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm"
                onClick={cancelDeletePost}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                onClick={deletePost}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-16 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-primary">My Posts</h1>
        <div className="flex items-center space-x-2">
          <button
            className="text-gray-600"
            onClick={() => navigate('/debug')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          <button
            className="text-gray-600"
            onClick={() => navigate('/tailtalk')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Authentication Debug Info (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Auth Debug:</strong> {isAuthenticated() ? 'Authenticated' : 'Not Authenticated'} | 
                  User ID: {currentUser?.uid || 'None'} |
                  Email: {currentUser?.email || 'None'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Current Route: {window.location.pathname}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            {myPosts.length > 0 ? (
              myPosts.map(post => (
                <div 
                  key={post.id} 
                  className="bg-white rounded-lg shadow-sm p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`text-xs ${post.isQuestion ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} px-2 py-0.5 rounded-full`}>
                        {post.isQuestion ? 'Question' : 'Post'}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">{formatDate(post.createdAt)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="text-gray-500 hover:text-primary"
                        onClick={() => startEditPost(post)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        className="text-gray-500 hover:text-red-500"
                        onClick={() => confirmDeletePost(post)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h2 className="font-bold mb-2">{post.title || 'Untitled Post'}</h2>
                  <p className="text-gray-700 mb-3">{post.content || ''}</p>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="Post" className="w-full h-48 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Status: {post.status || 'Published'}</span>
                    <span>{post.likeCount || 0} likes • {post.commentCount || 0} comments</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500 mb-4">You haven't created any posts yet</p>
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                  onClick={() => navigate('/tailtalk')}
                >
                  Create Your First Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {renderEditModal()}
      {renderDeleteConfirmModal()}
      <MobileBottomNav />
    </div>
  );
};

// Wrap the component with NotificationProvider
const MyPosts = () => {
  return (
    <NotificationProvider>
      <MyPostsInner />
    </NotificationProvider>
  );
};

export default MyPosts; 