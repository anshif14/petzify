import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, collection, query, orderBy, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import LoadingSpinner from '../components/common/LoadingSpinner';

const CommunityDetail = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const { showSuccess, showError } = useAlert();
  
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [postSortBy, setPostSortBy] = useState('hot');
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [joiningInProgress, setJoiningInProgress] = useState(false);
  
  useEffect(() => {
    if (communityId) {
      fetchCommunityData();
    }
  }, [communityId]);
  
  useEffect(() => {
    if (communityId && activeTab === 'posts') {
      fetchPosts();
    } else if (communityId && activeTab === 'members') {
      fetchMembers();
    }
  }, [communityId, activeTab, postSortBy]);
  
  const fetchCommunityData = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const communityRef = doc(db, 'communities', communityId);
      const communityDoc = await getDoc(communityRef);
      
      if (communityDoc.exists()) {
        const communityData = {
          id: communityDoc.id,
          ...communityDoc.data()
        };
        
        setCommunity(communityData);
        
        // Check if user has joined
        if (currentUser && communityData.members) {
          setIsJoined(communityData.members.includes(currentUser.email));
        }
        
        // Fetch initial posts
        if (activeTab === 'posts') {
          fetchPosts();
        }
      } else {
        showError('Community not found');
        navigate('/tailtalk');
      }
    } catch (error) {
      console.error('Error fetching community:', error);
      showError('Failed to load community details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      let q;
      
      // Different queries based on sort type
      if (postSortBy === 'hot') {
        q = query(
          collection(db, `communities/${communityId}/posts`), 
          orderBy('likeCount', 'desc'),
          orderBy('createdAt', 'desc'),
          where('deleted', '==', false)
        );
      } else if (postSortBy === 'new') {
        q = query(
          collection(db, `communities/${communityId}/posts`), 
          orderBy('createdAt', 'desc'),
          where('deleted', '==', false)
        );
      } else if (postSortBy === 'top') {
        q = query(
          collection(db, `communities/${communityId}/posts`), 
          orderBy('likeCount', 'desc'),
          where('deleted', '==', false)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const postsData = [];
      
      querySnapshot.forEach((doc) => {
        postsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      showError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // If community has a members array directly
      if (community && community.members) {
        const memberPromises = community.members.map(async (memberEmail) => {
          const userRef = doc(db, 'users', memberEmail);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            return {
              id: userDoc.id,
              email: memberEmail,
              ...userDoc.data()
            };
          }
          
          return {
            id: memberEmail,
            email: memberEmail,
            name: memberEmail.split('@')[0],
            avatar: null
          };
        });
        
        const membersData = await Promise.all(memberPromises);
        setMembers(membersData);
      }
      // If using a separate members collection
      else {
        const membersRef = collection(db, `communities/${communityId}/members`);
        const membersSnapshot = await getDocs(membersRef);
        
        const membersData = [];
        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          const userRef = doc(db, 'users', memberDoc.id);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            membersData.push({
              id: userDoc.id,
              ...userDoc.data(),
              role: memberData.role || 'member',
              joinedAt: memberData.joinedAt
            });
          }
        }
        
        setMembers(membersData);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      showError('Failed to load community members');
    } finally {
      setLoading(false);
    }
  };
  
  const handleJoinCommunity = async () => {
    if (!isAuthenticated()) {
      showError('Please sign in to join communities');
      return;
    }
    
    try {
      setJoiningInProgress(true);
      const db = getFirestore(app);
      const communityRef = doc(db, 'communities', communityId);
      
      // Update the community document
      if (isJoined) {
        await updateDoc(communityRef, {
          members: arrayRemove(currentUser.email),
          memberCount: (community.memberCount || 0) - 1
        });
        setIsJoined(false);
        showSuccess('You left the community');
      } else {
        await updateDoc(communityRef, {
          members: arrayUnion(currentUser.email),
          memberCount: (community.memberCount || 0) + 1
        });
        setIsJoined(true);
        showSuccess('You joined the community');
      }
      
      // Update the local community state
      setCommunity(prev => ({
        ...prev,
        memberCount: isJoined ? (prev.memberCount - 1) : (prev.memberCount + 1),
        members: isJoined 
          ? prev.members.filter(email => email !== currentUser.email)
          : [...prev.members, currentUser.email]
      }));
      
    } catch (error) {
      console.error('Error updating community membership:', error);
      showError(isJoined ? 'Failed to leave community' : 'Failed to join community');
    } finally {
      setJoiningInProgress(false);
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      // Handle Firestore Timestamp
      date = timestamp.toDate();
    } else {
      // Handle regular date string or object
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleCreatePost = () => {
    navigate(`/tailtalk/community/${communityId}/create-post`);
  };
  
  const renderPost = (post) => {
    return (
      <div 
        key={post.id} 
        className="bg-white rounded-lg shadow-sm p-4 mb-4"
        onClick={() => navigate(`/tailtalk/community/${communityId}/post/${post.id}`)}
      >
        {/* Post Header with Author Info */}
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white overflow-hidden">
            {post.authorPhotoURL ? (
              <img 
                src={post.authorPhotoURL} 
                alt={post.authorName} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <span className="font-bold text-lg">{post.authorName?.charAt(0).toUpperCase() || 'A'}</span>
            )}
          </div>
          <div className="ml-3">
            <p className="font-medium">{post.authorName || 'Anonymous'}</p>
            <p className="text-xs text-gray-500">
              {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : 'Just now'}
            </p>
          </div>
        </div>

        {/* Post Content */}
        <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
        
        {/* Show a preview of the content */}
        <p className="text-gray-700 mb-3 line-clamp-3">{post.content}</p>

        {/* Post Image (if available) */}
        {post.imageURL && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img 
              src={post.imageURL} 
              alt={post.title} 
              className="w-full h-52 object-cover"
            />
          </div>
        )}

        {/* Post Poll Preview (if available) */}
        {post.poll && post.poll.options && post.poll.options.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium mb-1">{post.poll.question || 'Poll'}</p>
            <p className="text-sm text-gray-500">{post.poll.options.length} options • {post.poll.totalVotes || 0} votes</p>
          </div>
        )}

        {/* Post Engagement Stats */}
        <div className="flex text-sm text-gray-500 mt-2 pt-2 border-t border-gray-100">
          <span>{post.likeCount || 0} likes</span>
          <span className="mx-2">•</span>
          <span>{post.commentCount || 0} comments</span>
        </div>
      </div>
    );
  };
  
  if (loading && !community) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="pb-16 bg-gray-50 min-h-screen">
      {/* Community Header */}
      <div className="bg-white shadow-sm">
        {/* Cover Image */}
        <div className="h-40 bg-gray-200 relative">
          {community?.coverUrl ? (
            <img 
              src={community.coverUrl} 
              alt={community?.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          )}
          
          <button 
            className="absolute top-4 left-4 bg-black/30 text-white rounded-full p-2"
            onClick={() => navigate('/tailtalk')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        {/* Community Info */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">{community?.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {community?.memberCount || 0} members
              </p>
            </div>
            
            <button 
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                isJoined 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-primary text-white'
              }`}
              onClick={handleJoinCommunity}
              disabled={joiningInProgress}
            >
              {joiningInProgress ? 'Processing...' : isJoined ? 'Joined' : 'Join'}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-t border-gray-200">
          <div className="flex">
            <button 
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'posts' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('posts')}
            >
              Posts
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'about' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'members' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
          </div>
        </div>
      </div>
      
      {/* Post Sorting (only shown for Posts tab) */}
      {activeTab === 'posts' && (
        <div className="bg-white px-4 py-2 flex space-x-2 overflow-x-auto scrollbar-hide">
          <button 
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              postSortBy === 'hot' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setPostSortBy('hot')}
          >
            Hot
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              postSortBy === 'new' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setPostSortBy('new')}
          >
            New
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              postSortBy === 'top' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setPostSortBy('top')}
          >
            Top
          </button>
        </div>
      )}
      
      {/* Main Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <>
                {posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map(renderPost)}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <p className="mt-2 text-gray-500">No posts yet in this community</p>
                    <button 
                      className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                      onClick={handleCreatePost}
                    >
                      Create the First Post
                    </button>
                  </div>
                )}
              </>
            )}
            
            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-3">About {community?.name}</h2>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-700">{community?.description}</p>
                  <p className="text-xs text-gray-500 mt-2">Created {formatDate(community?.createdAt)}</p>
                </div>
                
                {community?.rules && community.rules.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-base font-medium mb-2">Community Rules</h3>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {community.rules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <h3 className="text-base font-medium mb-2">Moderators</h3>
                  {community?.moderators && community.moderators.length > 0 ? (
                    <div className="space-y-2">
                      {community.moderators.map((mod, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-8 h-8 rounded-full overflow-hidden mr-3 bg-gray-200">
                            {mod.avatar ? (
                              <img 
                                src={mod.avatar} 
                                alt={mod.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary text-white text-xs font-bold">
                                {mod.name?.charAt(0).toUpperCase() || 'M'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{mod.name}</p>
                            <p className="text-xs text-primary">Moderator</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No moderators listed</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-3">Members</h2>
                
                {members.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {members.map(member => (
                      <div 
                        key={member.id} 
                        className="flex items-center p-2 border border-gray-100 rounded-lg"
                        onClick={() => navigate(`/tailtalk/profile/${member.id}`)}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-gray-200">
                          {member.avatar ? (
                            <img 
                              src={member.avatar} 
                              alt={member.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary text-white text-sm font-bold">
                              {member.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          {member.role && (
                            <p className="text-xs text-primary truncate">{member.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No members found</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* FAB - Create Post (only shown in Posts tab) */}
      {activeTab === 'posts' && (
        <button 
          className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
          onClick={handleCreatePost}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
      
      <MobileBottomNav />
    </div>
  );
};

export default CommunityDetail; 