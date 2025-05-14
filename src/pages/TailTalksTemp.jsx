import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { NotificationProvider } from '../context/NotificationContext';

// Inner component with main functionality
const TailTalksInner = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);
        const postsRef = collection(db, 'tailtalks');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(10));
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const postsData = [];
          querySnapshot.forEach((doc) => {
            postsData.push({
              id: doc.id,
              ...doc.data()
            });
          });
          setPosts(postsData);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, []);

  const handlePostClick = (postId) => {
    navigate(`/tailtalk/post/${postId}`);
  };

  return (
    <div className="pb-16 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-primary">Tail Talks</h1>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.length > 0 ? (
              posts.map(post => (
                <div 
                  key={post.id} 
                  className="bg-white rounded-lg shadow-sm p-4 cursor-pointer"
                  onClick={() => handlePostClick(post.id)}
                >
                  <h2 className="font-bold mb-2">{post.title || 'Untitled Post'}</h2>
                  <p className="text-gray-700 mb-3">{post.content || ''}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>By {post.authorName || 'Anonymous'}</span>
                    <span>{post.likeCount || 0} likes • {post.commentCount || 0} comments</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">No posts found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
};

// Wrap the component with NotificationProvider
const TailTalks = () => {
  return (
    <NotificationProvider>
      <TailTalksInner />
    </NotificationProvider>
  );
};

export default TailTalks; 