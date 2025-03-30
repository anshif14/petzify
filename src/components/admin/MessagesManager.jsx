import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';

const MessagesManager = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      
      const messagesList = [];
      querySnapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore Timestamp to JS Date if it exists
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()) : new Date()
        });
      });
      
      setMessages(messagesList);
      setError('');
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      const db = getFirestore(app);
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'read'
      });
      
      // Update local state
      setMessages(prevMessages => 
        prevMessages.map(message => 
          message.id === messageId ? { ...message, status: 'read' } : message
        )
      );
    } catch (err) {
      console.error('Error updating message status:', err);
      setError('Failed to mark message as read. Please try again.');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      setDeletingId(messageId);
      const db = getFirestore(app);
      const messageRef = doc(db, 'messages', messageId);
      await deleteDoc(messageRef);
      
      // Update local state
      setMessages(prevMessages => prevMessages.filter(message => message.id !== messageId));
      
      // If the deleted message was selected, clear the selection
      if (selectedMessage && selectedMessage.id === messageId) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const viewMessage = (message) => {
    // If message is unread, mark it as read
    if (message.status === 'unread') {
      markAsRead(message.id);
    }
    setSelectedMessage(message);
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return <div className="p-4">Loading messages...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-primary">Contact Messages</h2>
        <button 
          onClick={fetchMessages}
          className="text-sm bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No messages found. When visitors submit the contact form, messages will appear here.
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Messages List */}
          <div className="lg:w-1/2">
            <div className="overflow-y-auto max-h-[600px] pr-2">
              {messages.map(message => (
                <div 
                  key={message.id} 
                  className={`mb-3 p-4 rounded-md border cursor-pointer transition-colors ${
                    selectedMessage && selectedMessage.id === message.id 
                      ? 'bg-primary-light border-primary' 
                      : message.status === 'unread'
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => viewMessage(message)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold truncate max-w-[70%]">
                      {message.subject || 'No Subject'}
                    </h3>
                    {message.status === 'unread' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-1">
                    From: {message.name} ({message.email})
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(message.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Message View */}
          <div className="lg:w-1/2">
            {selectedMessage ? (
              <div className="border rounded-md p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedMessage.subject || 'No Subject'}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      From: {selectedMessage.name} ({selectedMessage.email})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(selectedMessage.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    disabled={deletingId === selectedMessage.id}
                    className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    {deletingId === selectedMessage.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
                
                <div className="border-t pt-4">
                  <p className="whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
                
                <div className="mt-6 pt-4 border-t flex justify-between">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || ''}`}
                    className="text-sm bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                  >
                    Reply via Email
                  </a>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-sm bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-6 text-center text-gray-500 h-full flex items-center justify-center">
                <div>
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p>Select a message to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesManager; 