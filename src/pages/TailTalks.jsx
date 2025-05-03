import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TailTalks = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const [communities, setCommunities] = useState([]);
  const [trendingCommunities, setTrendingCommunities] = useState([]);
  const [userCommunities, setUserCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'trending', 'my'

  useEffect(() => {
    fetchCommunities();
  }, [currentUser, viewMode]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Fetch all communities
      if (viewMode === 'all' || viewMode === 'trending') {
        const communitiesRef = collection(db, 'communities');
        const q = query(communitiesRef, orderBy('memberCount', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        
        const communitiesData = [];
        querySnapshot.forEach((doc) => {
          communitiesData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        if (viewMode === 'all') {
          setCommunities(communitiesData);
        } else {
          // For trending, we might want to sort differently or apply other filters
          setTrendingCommunities(communitiesData);
        }
      }
      
      // Fetch user's communities
      if (viewMode === 'my' && isAuthenticated()) {
        const userCommunitiesRef = collection(db, 'communities');
        const q = query(
          userCommunitiesRef, 
          where('members', 'array-contains', currentUser.email),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        
        const userCommunitiesData = [];
        querySnapshot.forEach((doc) => {
          userCommunitiesData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setUserCommunities(userCommunitiesData);
      }
      
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = () => {
    navigate('/tailtalk/create-community');
  };

  const handleOpenCommunity = (communityId) => {
    navigate(`/tailtalk/community/${communityId}`);
  };

  // Determine which communities to display based on view mode
  const displayedCommunities = 
    viewMode === 'all' ? communities :
    viewMode === 'trending' ? trendingCommunities :
    userCommunities;

  return (
    <div className="pb-16 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-primary">TailTalks</h1>
        <div className="flex space-x-2">
          <button className="text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button 
            className="text-primary"
            onClick={() => navigate('/tailtalk/notifications')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white px-4 pt-2 pb-2 flex space-x-4">
        <button 
          className={`py-2 px-3 rounded-full text-sm font-medium ${
            viewMode === 'all' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setViewMode('all')}
        >
          All Communities
        </button>
        <button 
          className={`py-2 px-3 rounded-full text-sm font-medium ${
            viewMode === 'trending' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setViewMode('trending')}
        >
          Trending
        </button>
        <button 
          className={`py-2 px-3 rounded-full text-sm font-medium ${
            viewMode === 'my' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setViewMode('my')}
        >
          My Communities
        </button>
      </div>
      
      {/* Main Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {displayedCommunities.length > 0 ? (
              <div className="space-y-4">
                {displayedCommunities.map(community => (
                  <div 
                    key={community.id} 
                    className="bg-white rounded-lg shadow-sm overflow-hidden"
                    onClick={() => handleOpenCommunity(community.id)}
                  >
                    <div className="h-32 bg-gray-200 relative">
                      {community.coverUrl ? (
                        <img 
                          src={community.coverUrl} 
                          alt={community.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                        <h2 className="text-white text-xl font-bold">{community.name}</h2>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-600 text-sm line-clamp-2">{community.description}</p>
                      <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">{community.memberCount || 0}</span> members
                        </p>
                        <button 
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle join community
                          }}
                        >
                          {community.members?.includes(currentUser?.email) ? 'Joined' : 'Join'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-2 text-gray-500">
                  {viewMode === 'my' 
                    ? "You haven't joined any communities yet" 
                    : "No communities found"}
                </p>
                {viewMode === 'my' && (
                  <button 
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                    onClick={() => setViewMode('all')}
                  >
                    Discover Communities
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* FAB - Create Community */}
      <button 
        className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
        onClick={handleCreateCommunity}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      
      <MobileBottomNav />
    </div>
  );
};

export default TailTalks; 