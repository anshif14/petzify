import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { app } from '../../firebase/config';
import PasswordInput from '../common/PasswordInput';

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'editor',
    password: '',
    permissions: {
      manage_users: false,
      edit_contacts: false,
      manage_messages: false,
      manage_products: false,
      manage_bookings: false,
      edit_profile: true
    }
  });

  useEffect(() => {
    fetchUsers();
    
    // Get current user info
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      try {
        const admin = JSON.parse(adminAuth);
        setCurrentUser(admin);
      } catch (error) {
        console.error('Error parsing admin auth:', error);
      }
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const db = getFirestore(app);
      const usersSnapshot = await getDocs(collection(db, 'admin'));
      
      const usersList = [];
      usersSnapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          ...doc.data(),
          password: '********' // Don't display actual password
        });
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage('Error loading users. Please try again.');
      setMessageType('error');
    } finally {
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

  const handlePermissionChange = (permission) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: !formData.permissions[permission]
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      role: 'editor',
      password: '',
      permissions: {
        manage_users: false,
        edit_contacts: false,
        manage_messages: false,
        manage_products: false,
        manage_bookings: false,
        edit_profile: true
      }
    });
    setFormMode('add');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.username || !formData.email) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }
    
    // If adding a new user, password is required
    if (formMode === 'add' && !formData.password) {
      setMessage('Password is required for new users');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      
      // Check if username already exists (for new users)
      if (formMode === 'add') {
        const usernameQuery = query(
          collection(db, 'admin'),
          where('username', '==', formData.username)
        );
        
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
          setMessage('Username already exists. Please choose another.');
          setMessageType('error');
          setLoading(false);
          return;
        }
      }
      
      // Convert permissions object to array for Firestore
      const permissionsArray = Object.keys(formData.permissions).filter(
        permission => formData.permissions[permission]
      );
      
      if (formMode === 'add') {
        // Add new user
        await addDoc(collection(db, 'admin'), {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          permissions: permissionsArray,
          createdAt: Timestamp.now()
        });
        
        setMessage('User added successfully');
        setMessageType('success');
        resetForm();
      } else {
        // Update existing user
        const userRef = doc(db, 'admin', formData.id);
        
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: permissionsArray,
          updatedAt: Timestamp.now()
        };
        
        // Only update password if it was changed (not ********)
        if (formData.password && formData.password !== '********') {
          updateData.password = formData.password;
        }
        
        await updateDoc(userRef, updateData);
        
        setMessage('User updated successfully');
        setMessageType('success');
        resetForm();
      }
      
      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      setMessage('Error saving user. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    // Initialize permissions object
    let permissions = {
      manage_users: false,
      edit_contacts: false,
      manage_messages: false,
      manage_products: false,
      manage_bookings: false,
      edit_profile: true
    };
    
    // Handle array-style permissions
    if (Array.isArray(user.permissions)) {
      permissions = {
        manage_users: user.permissions.includes('manage_users') || false,
        edit_contacts: user.permissions.includes('edit_contacts') || false,
        manage_messages: user.permissions.includes('manage_messages') || false,
        manage_products: user.permissions.includes('manage_products') || false,
        manage_bookings: user.permissions.includes('manage_bookings') || false,
        edit_profile: user.permissions.includes('edit_profile') || true
      };
    } 
    // Handle object-style permissions
    else if (user.permissions && typeof user.permissions === 'object') {
      permissions = {
        manage_users: user.permissions.canManageUsers || user.permissions.manage_users || false,
        edit_contacts: user.permissions.canEditContacts || user.permissions.edit_contacts || false,
        manage_messages: user.permissions.canManageMessages || user.permissions.manage_messages || false,
        manage_products: user.permissions.canManageProducts || user.permissions.manage_products || false,
        manage_bookings: user.permissions.canManageBookings || user.permissions.manage_bookings || false,
        edit_profile: user.permissions.canEditProfile || user.permissions.edit_profile || true
      };
    }
    
    setFormData({
      ...user,
      permissions
    });
    setFormMode('edit');
  };

  const handleDelete = async (userId, username) => {
    // Prevent deleting own account
    if (currentUser && currentUser.username === username) {
      setMessage('You cannot delete your own account');
      setMessageType('error');
      return;
    }
    
    // Prevent deleting superadmin
    const userToDelete = users.find(user => user.id === userId);
    if (userToDelete && userToDelete.role === 'superadmin') {
      setMessage('Cannot delete a superadmin account');
      setMessageType('error');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${username}?`)) {
      setLoading(true);
      try {
        const db = getFirestore(app);
        await deleteDoc(doc(db, 'admin', userId));
        
        setMessage('User deleted successfully');
        setMessageType('success');
        
        // Refresh users list
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setMessage('Error deleting user. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">User Management</h2>
      
      {messageType && (
        <div className={`p-4 mb-6 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-medium text-gray-700">Admin Users</h3>
            </div>
            
            {loading && users.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'superadmin'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'doctor'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(user.permissions) 
                              ? user.permissions.map((permission) => (
                                  <span key={permission} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                    {permission.replace('_', ' ')}
                                  </span>
                                ))
                              : user.permissions && typeof user.permissions === 'object'
                                ? Object.entries(user.permissions)
                                    .filter(([_, value]) => value === true)
                                    .map(([key]) => (
                                      <span key={key} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                        {key.replace('_', ' ').replace(/^can/, '')}
                                      </span>
                                    ))
                                : <span className="text-gray-400">No permissions</span>
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-primary hover:text-primary-dark mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="text-red-600 hover:text-red-800"
                            disabled={
                              (currentUser && currentUser.username === user.username) ||
                              user.role === 'superadmin'
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No users found. Add your first user.
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-4">
              {formMode === 'add' ? 'Add New User' : 'Edit User'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username*</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    readOnly={formMode === 'edit'} // Username can't be changed once created
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password{formMode === 'add' ? '*' : ''}</label>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={formMode === 'add'} // Only required for new users
                    placeholder={formMode === 'edit' ? 'Leave blank to keep unchanged' : 'Enter password'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="boarding_admin">Boarding Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="manage_users"
                        checked={formData.permissions.manage_users}
                        onChange={() => handlePermissionChange('manage_users')}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="manage_users" className="ml-2 block text-sm text-gray-700">
                        Manage Users
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit_contacts"
                        checked={formData.permissions.edit_contacts}
                        onChange={() => handlePermissionChange('edit_contacts')}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="edit_contacts" className="ml-2 block text-sm text-gray-700">
                        Edit Contact Information
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="manage_messages"
                        checked={formData.permissions.manage_messages}
                        onChange={() => handlePermissionChange('manage_messages')}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="manage_messages" className="ml-2 block text-sm text-gray-700">
                        Manage Messages
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="manage_products"
                        checked={formData.permissions.manage_products}
                        onChange={() => handlePermissionChange('manage_products')}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="manage_products" className="ml-2 block text-sm text-gray-700">
                        Manage Products
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="manage_bookings"
                        checked={formData.permissions.manage_bookings}
                        onChange={() => handlePermissionChange('manage_bookings')}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="manage_bookings" className="ml-2 block text-sm text-gray-700">
                        Manage Appointments
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="edit_profile"
                        checked={formData.permissions.edit_profile}
                        onChange={() => handlePermissionChange('edit_profile')}
                        disabled
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="edit_profile" className="ml-2 block text-sm text-gray-700">
                        Edit Own Profile (always enabled)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                {formMode === 'edit' && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  {loading ? 'Saving...' : formMode === 'add' ? 'Add User' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersManager; 