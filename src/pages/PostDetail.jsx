// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate, Link } from 'react-router-dom';
// import {
//   doc, getDoc, updateDoc, collection, addDoc, query,
//   where, orderBy, onSnapshot, arrayUnion, arrayRemove,
//   serverTimestamp, increment
// } from 'firebase/firestore';
// import { db, auth } from '../firebase/config';
// import { useAuthState } from 'react-firebase-hooks/auth';
// import { toast } from 'react-toastify';
// import { FaArrowLeft, FaRegComment, FaComment, FaThumbsUp, FaRegThumbsUp, FaShare, FaVoteYea } from 'react-icons/fa';
// import LoadingSpinner from '../components/common/LoadingSpinner';
// import MobileBottomNav from '../components/common/MobileBottomNav';
//
// const PostDetail = () => {
//   const { communityId, postId } = useParams();
//   const navigate = useNavigate();
//   const [currentUser] = useAuthState(auth);
//
//   // State variables
//   const [post, setPost] = useState(null);
//   const [community, setCommunity] = useState(null);
//   const [comments, setComments] = useState([]);
//   const [newComment, setNewComment] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [commentLoading, setCommentLoading] = useState(false);
//   const [pollVoted, setPollVoted] = useState(false);
//
//   // Fetch post and community data
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//
//         // Fetch post data
//         const postRef = doc(db, `communities/${communityId}/posts`, postId);
//         const postSnap = await getDoc(postRef);
//
//         if (!postSnap.exists()) {
//           toast.error('Post not found');
//           navigate(`/tailtalk/community/${communityId}`);
//           return;
//         }
//
//         setPost({
//           id: postSnap.id,
//           ...postSnap.data()
//         });
//
//         // Check if user has voted on any polls
//         if (postSnap.data().poll && currentUser) {
//           const pollOptions = postSnap.data().poll.options || [];
//           const hasVoted = pollOptions.some(option =>
//             option.voters && option.voters.includes(currentUser.uid)
//           );
//           setPollVoted(hasVoted);
//         }
//
//         // Fetch community data
//         const communityRef = doc(db, 'communities', communityId);
//         const communitySnap = await getDoc(communityRef);
//
//         if (!communitySnap.exists()) {
//           toast.error('Community not found');
//           navigate('/tailtalk');
//           return;
//         }
//
//         setCommunity({
//           id: communitySnap.id,
//           ...communitySnap.data()
//         });
//
//         setLoading(false);
//       } catch (error) {
//         console.error('Error fetching post data:', error);
//         toast.error('Error loading post');
//         setLoading(false);
//       }
//     };
//
//     fetchData();
//   }, [communityId, postId, navigate, currentUser]);
//
//   // Fetch comments
//   useEffect(() => {
//     if (!communityId || !postId) return;
//
//     console.log('Setting up comments listener for:', { communityId, postId });
//
//     const commentsRef = collection(db, `communities/${communityId}/posts/${postId}/comments`);
//     const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
//
//     const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
//       console.log('Comments snapshot received:', snapshot.size, 'comments found');
//
//       const commentsData = snapshot.docs.map(doc => {
//         const data = doc.data();
//         console.log('Raw comment data:', data);
//
//         return {
//           id: doc.id,
//           ...data,
//           // Ensure both text and content fields are available
//           text: data.text || '',
//           content: data.content || data.text || '',
//           createdAt: data.createdAt?.toDate() || new Date()
//         };
//       });
//
//       console.log('Processed comments data:', commentsData);
//       setComments(commentsData);
//     }, (error) => {
//       console.error('Error fetching comments:', error);
//       toast.error('Error loading comments');
//     });
//
//     return () => unsubscribe();
//   }, [communityId, postId]);
//
//   // Handle like/unlike post
//   const handleLike = async () => {
//     if (!currentUser) {
//       toast.info('Please sign in to like posts');
//       return;
//     }
//
//     try {
//       const postRef = doc(db, `communities/${communityId}/posts`, postId);
//       const userId = currentUser.uid;
//
//       if (post.likes && post.likes.includes(userId)) {
//         // Unlike post
//         await updateDoc(postRef, {
//           likes: arrayRemove(userId),
//           likeCount: increment(-1)
//         });
//         setPost({
//           ...post,
//           likes: post.likes.filter(id => id !== userId),
//           likeCount: (post.likeCount || 1) - 1
//         });
//       } else {
//         // Like post
//         await updateDoc(postRef, {
//           likes: arrayUnion(userId),
//           likeCount: increment(1)
//         });
//         setPost({
//           ...post,
//           likes: [...(post.likes || []), userId],
//           likeCount: (post.likeCount || 0) + 1
//         });
//       }
//     } catch (error) {
//       console.error('Error updating like:', error);
//       toast.error('Failed to update like');
//     }
//   };
//
//   // Submit a new comment
//   const handleCommentSubmit = async (e) => {
//     e.preventDefault();
//
//     if (!currentUser) {
//       toast.info('Please sign in to comment');
//       return;
//     }
//
//     if (!newComment.trim()) {
//       toast.info('Comment cannot be empty');
//       return;
//     }
//
//     try {
//       setCommentLoading(true);
//
//       const commentsRef = collection(db, `communities/${communityId}/posts/${postId}/comments`);
//       await addDoc(commentsRef, {
//         content: newComment.trim(),
//         text: newComment.trim(),
//         authorId: currentUser.uid,
//         authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous User',
//         authorPhotoURL: currentUser.photoURL || '',
//         createdAt: serverTimestamp()
//       });
//
//       // Update comment count on post
//       const postRef = doc(db, `communities/${communityId}/posts`, postId);
//       await updateDoc(postRef, {
//         commentCount: increment(1)
//       });
//
//       setNewComment('');
//       setCommentLoading(false);
//       toast.success('Comment added');
//     } catch (error) {
//       console.error('Error adding comment:', error);
//       toast.error('Failed to add comment');
//       setCommentLoading(false);
//     }
//   };
//
//   // Handle poll voting
//   const handleVote = async (optionIndex) => {
//     if (!currentUser) {
//       toast.info('Please sign in to vote');
//       return;
//     }
//
//     if (pollVoted) {
//       toast.info('You have already voted on this poll');
//       return;
//     }
//
//     try {
//       const postRef = doc(db, `communities/${communityId}/posts`, postId);
//       const updatedOptions = [...post.poll.options];
//
//       // Add user to voters for the selected option
//       if (!updatedOptions[optionIndex].voters) {
//         updatedOptions[optionIndex].voters = [];
//       }
//       updatedOptions[optionIndex].voters.push(currentUser.uid);
//       updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
//
//       await updateDoc(postRef, {
//         'poll.options': updatedOptions,
//         'poll.totalVotes': (post.poll.totalVotes || 0) + 1
//       });
//
//       // Update local state
//       const updatedPost = {
//         ...post,
//         poll: {
//           ...post.poll,
//           options: updatedOptions,
//           totalVotes: (post.poll.totalVotes || 0) + 1
//         }
//       };
//
//       setPost(updatedPost);
//       setPollVoted(true);
//       toast.success('Vote recorded');
//     } catch (error) {
//       console.error('Error recording vote:', error);
//       toast.error('Failed to record vote');
//     }
//   };
//
//   // Handle sharing
//   const handleShare = () => {
//     if (navigator.share) {
//       navigator.share({
//         title: post?.title || 'Post from TailTalks',
//         text: `Check out this post in ${community?.name}: ${post?.title}`,
//         url: window.location.href
//       })
//       .then(() => console.log('Shared successfully'))
//       .catch((error) => console.log('Error sharing:', error));
//     } else {
//       // Fallback for browsers that don't support navigator.share
//       navigator.clipboard.writeText(window.location.href)
//         .then(() => toast.success('Link copied to clipboard'))
//         .catch(() => toast.error('Failed to copy link'));
//     }
//   };
//
//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <LoadingSpinner size="large" />
//       </div>
//     );
//   }
//
//   if (!post || !community) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen px-4">
//         <p className="text-lg text-gray-600 mb-4">Post not found</p>
//         <button
//           onClick={() => navigate('/tailtalk')}
//           className="bg-primary text-white font-semibold py-2 px-4 rounded-lg"
//         >
//           Back to TailTalks
//         </button>
//       </div>
//     );
//   }
//
//   // Calculate poll percentages
//   const calculatePollPercentage = (votes) => {
//     if (!post.poll.totalVotes) return 0;
//     return Math.round((votes / post.poll.totalVotes) * 100);
//   };
//
//   // Check if user has liked the post
//   const hasLiked = post.likes && currentUser && post.likes.includes(currentUser.uid);
//
//   return (
//     <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
//       {/* Back button and community info */}
//       <div className="flex items-center mb-6">
//         <button
//           onClick={() => navigate(`/tailtalk/community/${communityId}`)}
//           className="mr-3 text-gray-600 hover:text-primary"
//         >
//           <FaArrowLeft size={20} />
//         </button>
//         <Link to={`/tailtalk/community/${communityId}`} className="flex items-center">
//           <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden">
//             {community.photoURL ? (
//               <img src={community.photoURL} alt={community.name} className="w-full h-full object-cover" />
//             ) : (
//               <span className="font-bold text-lg">{community.name.charAt(0).toUpperCase()}</span>
//             )}
//           </div>
//           <div className="ml-2">
//             <h2 className="font-bold text-primary">{community.name}</h2>
//             <p className="text-xs text-gray-500">
//               {new Date(post.createdAt?.toDate()).toLocaleDateString()}
//             </p>
//           </div>
//         </Link>
//       </div>
//
//       {/* Post content */}
//       <div className="bg-white rounded-xl shadow-md p-4 mb-6">
//         {/* Author info */}
//         <div className="flex items-center mb-4">
//           <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white overflow-hidden">
//             {post.authorPhotoURL ? (
//               <img src={post.authorPhotoURL} alt={post.authorName} className="w-full h-full object-cover" />
//             ) : (
//               <span className="font-bold text-lg">{post.authorName?.charAt(0).toUpperCase() || 'A'}</span>
//             )}
//           </div>
//           <div className="ml-2">
//             <p className="font-semibold">{post.authorName || 'Anonymous User'}</p>
//           </div>
//         </div>
//
//         {/* Post title */}
//         <h1 className="text-xl font-bold mb-3">{post.title}</h1>
//
//         {/* Post content */}
//         <div className="mb-4 whitespace-pre-wrap">{post.content}</div>
//
//         {/* Post image if any */}
//         {post.imageURL && (
//           <div className="mb-4 rounded-lg overflow-hidden">
//             <img
//               src={post.imageURL}
//               alt="Post content"
//               className="w-full h-auto max-h-96 object-contain"
//             />
//           </div>
//         )}
//
//         {/* Poll if any */}
//         {post.poll && post.poll.options && post.poll.options.length > 0 && (
//           <div className="mb-4 p-3 bg-gray-50 rounded-lg">
//             <h3 className="font-bold mb-2">{post.poll.question || 'Poll'}</h3>
//             <div className="space-y-2">
//               {post.poll.options.map((option, index) => (
//                 <button
//                   key={index}
//                   onClick={() => !pollVoted && handleVote(index)}
//                   disabled={pollVoted}
//                   className={`w-full text-left p-2 rounded-lg border ${
//                     pollVoted ? 'cursor-default' : 'hover:bg-gray-200 cursor-pointer'
//                   }`}
//                 >
//                   <div className="flex justify-between items-center mb-1">
//                     <span>{option.text}</span>
//                     {pollVoted && (
//                       <span className="text-sm font-semibold">
//                         {calculatePollPercentage(option.votes || 0)}%
//                       </span>
//                     )}
//                   </div>
//
//                   {pollVoted && (
//                     <div className="w-full bg-gray-200 rounded-full h-2.5">
//                       <div
//                         className="bg-primary h-2.5 rounded-full"
//                         style={{ width: `${calculatePollPercentage(option.votes || 0)}%` }}
//                       ></div>
//                     </div>
//                   )}
//                 </button>
//               ))}
//             </div>
//             <p className="text-sm text-gray-500 mt-2">
//               {post.poll.totalVotes || 0} votes
//             </p>
//           </div>
//         )}
//
//         {/* Interaction buttons */}
//         <div className="flex items-center justify-between border-t pt-3 mt-3">
//           <button
//             onClick={handleLike}
//             className={`flex items-center gap-1 px-3 py-1 rounded-full ${
//               hasLiked ? 'text-primary' : 'text-gray-600'
//             } hover:bg-gray-100`}
//           >
//             {hasLiked ? <FaThumbsUp /> : <FaRegThumbsUp />}
//             <span>{post.likeCount || 0}</span>
//           </button>
//
//           <button
//             onClick={() => document.getElementById('comment-input').focus()}
//             className="flex items-center gap-1 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-100"
//           >
//             <FaRegComment />
//             <span>{post.commentCount || comments.length || 0}</span>
//           </button>
//
//           <button
//             onClick={handleShare}
//             className="flex items-center gap-1 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-100"
//           >
//             <FaShare />
//             <span>Share</span>
//           </button>
//         </div>
//       </div>
//
//       {/* Comments section */}
//       <div className="bg-white rounded-xl shadow-md p-4">
//         <h2 className="font-bold text-lg mb-4">Comments</h2>
//
//         {/* Comment form */}
//         <form onSubmit={handleCommentSubmit} className="mb-6">
//           <div className="flex gap-2">
//             <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white overflow-hidden">
//               {currentUser?.photoURL ? (
//                 <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
//               ) : (
//                 <span className="font-bold text-sm">{currentUser?.displayName?.charAt(0).toUpperCase() || 'A'}</span>
//               )}
//             </div>
//             <input
//               id="comment-input"
//               type="text"
//               value={newComment}
//               onChange={(e) => setNewComment(e.target.value)}
//               placeholder="Add a comment..."
//               className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
//               disabled={!currentUser}
//             />
//             <button
//               type="submit"
//               disabled={commentLoading || !newComment.trim() || !currentUser}
//               className="bg-primary text-white px-4 py-2 rounded-full font-semibold disabled:opacity-50"
//             >
//               {commentLoading ? 'Posting...' : 'Post'}
//             </button>
//           </div>
//           {!currentUser && (
//             <p className="text-sm text-gray-500 mt-2 ml-10">
//               Please sign in to comment
//             </p>
//           )}
//         </form>
//
//         {/* Comments list */}
//         <div className="space-y-4">
//           {comments.length === 0 ? (
//             <p className="text-center text-gray-500 py-4">No comments yet. Be the first to comment!</p>
//           ) : (
//             comments.map(comment => (
//               <div key={comment.id} className="flex gap-2">
//                 <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white overflow-hidden flex-shrink-0">
//                   {comment.authorPhotoURL ? (
//                     <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-full h-full object-cover" />
//                   ) : (
//                     <span className="font-bold text-sm">{comment.authorName?.charAt(0).toUpperCase() || 'A'}</span>
//                   )}
//                 </div>
//                 <div className="bg-gray-100 rounded-lg p-3 flex-1">
//                   <div className="flex justify-between items-start">
//                     <p className="font-semibold text-sm">{comment.authorName || 'Anonymous User'}</p>
//                     <p className="text-xs text-gray-500">
//                       {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : 'Just now'}
//                     </p>
//                   </div>
//                   <p className="text-sm mt-1">{comment.content || comment.text || ''}</p>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//
//       {/* Add the MobileBottomNav at the bottom of the page */}
//       <MobileBottomNav />
//     </div>
//   );
// };
//
// export default PostDetail;