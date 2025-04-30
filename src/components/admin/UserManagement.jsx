import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { app } from '../../firebase/config';
import PasswordInput from '../common/PasswordInput';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'editor',
    phone: '',
    permissions: {
      canEditContacts: false,
      canManageMessages: false,
      canManageUsers: false,
      canEditProfile: false
    }
  });
  const [availableRoles] = useState([
    { id: 'superadmin', label: 'Super Admin' },
    { id: 'admin', label: 'Admin' },
    { id: 'editor', label: 'Editor' },
    { id: 'doctor', label: 'Doctor' },
    { id: 'boarding_admin', label: 'Boarding Admin' },
    { id: 'assistant', label: 'Assistant' },
    { id: 'moderator', label: 'Moderator' },
    { id: 'custom', label: 'Custom Role' }
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [customRoleName, setCustomRoleName] = useState('');

  // Get current user from localStorage
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      const adminData = JSON.parse(adminAuth);
      setCurrentUser(adminData);
    }
  }, []);

  // Fetch users from Firestore
  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const adminCollection = collection(db, 'admin');
      let adminQuery;
      
      if (filterRole === 'all') {
        adminQuery = query(adminCollection);
      } else {
        adminQuery = query(adminCollection, where('role', '==', filterRole));
      }
      
      const querySnapshot = await getDocs(adminQuery);
      
      const usersList = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          ...userData,
          // Don't include password
          password: undefined
        });
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('permissions.')) {
      const permissionName = name.split('.')[1];
      setFormData((prevData) => ({
        ...prevData,
        permissions: {
          ...prevData.permissions,
          [permissionName]: checked
        }
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // If role is custom, reset permissions
    if (name === 'role' && value === 'custom') {
      setCustomRoleName('');
    }

    // Clear error message when user types
    setErrorMessage('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setErrorMessage('Name is required');
      return false;
    }
    if (!formData.username.trim()) {
      setErrorMessage('Username is required');
      return false;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Email is required');
      return false;
    }
    if (!isEditing && !formData.password) {
      setErrorMessage('Password is required');
      return false;
    }
    if (!isEditing && formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return false;
    }
    if (!isEditing && formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return false;
    }
    if (formData.role === 'custom' && !customRoleName.trim()) {
      setErrorMessage('Custom role name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Check if username already exists
      const usernameQuery = query(
        collection(db, 'admin'),
        where('username', '==', formData.username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      
      // For editing, it's okay if the current user has this username
      if (!isEditing && !usernameSnapshot.empty) {
        setErrorMessage('Username already exists');
        setLoading(false);
        return;
      }
      
      if (isEditing && !usernameSnapshot.empty) {
        // Make sure the username belongs to the user being edited
        let usernameExists = false;
        usernameSnapshot.forEach((doc) => {
          if (doc.id !== editUserId) {
            usernameExists = true;
          }
        });
        
        if (usernameExists) {
          setErrorMessage('Username already exists');
          setLoading(false);
          return;
        }
      }
      
      // Check if email already exists
      const emailQuery = query(
        collection(db, 'admin'),
        where('email', '==', formData.email)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      // For editing, it's okay if the current user has this email
      if (!isEditing && !emailSnapshot.empty) {
        setErrorMessage('Email already exists');
        setLoading(false);
        return;
      }
      
      if (isEditing && !emailSnapshot.empty) {
        // Make sure the email belongs to the user being edited
        let emailExists = false;
        emailSnapshot.forEach((doc) => {
          if (doc.id !== editUserId) {
            emailExists = true;
          }
        });
        
        if (emailExists) {
          setErrorMessage('Email already exists');
          setLoading(false);
          return;
        }
      }
      
      // Prepare user data
      const userData = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: formData.role === 'custom' ? customRoleName : formData.role,
        phone: formData.phone,
        permissions: formData.permissions,
        // Set default permissions based on role
        ...(formData.role === 'superadmin' && {
          permissions: {
            canEditContacts: true,
            canManageMessages: true,
            canManageUsers: true,
            canEditProfile: true
          }
        }),
        ...(formData.role === 'admin' && {
          permissions: {
            canEditContacts: true,
            canManageMessages: true,
            canManageUsers: false,
            canEditProfile: true
          }
        }),
        ...(formData.role === 'editor' && {
          permissions: {
            canEditContacts: true,
            canManageMessages: false,
            canManageUsers: false,
            canEditProfile: false
          }
        }),
        ...(formData.role === 'doctor' && {
          permissions: {
            canEditContacts: false,
            canManageMessages: true,
            canManageUsers: false,
            canEditProfile: true
          }
        }),
        ...(formData.role === 'boarding_admin' && {
          permissions: {
            canEditContacts: false,
            canManageMessages: true,
            canManageUsers: false,
            canEditProfile: true
          }
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (!isEditing) {
        // Add password for new users
        userData.password = formData.password;
        
        // Create new user
        await addDoc(collection(db, 'admin'), userData);
        setSuccessMessage('User created successfully');
      } else {
        // Update existing user
        const userDocRef = doc(db, 'admin', editUserId);
        
        // Only update password if provided
        if (formData.password) {
          userData.password = formData.password;
        }
        
        await updateDoc(userDocRef, userData);
        setSuccessMessage('User updated successfully');
        setIsEditing(false);
        setEditUserId(null);
      }
      
      // Reset form
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'editor',
        phone: '',
        permissions: {
          canEditContacts: false,
          canManageMessages: false,
          canManageUsers: false,
          canEditProfile: false
        }
      });
      setCustomRoleName('');
      
      // Refresh user list
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      setErrorMessage('Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setIsEditing(true);
    setEditUserId(user.id);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'editor',
      phone: user.phone || '',
      permissions: user.permissions || {
        canEditContacts: false,
        canManageMessages: false,
        canManageUsers: false,
        canEditProfile: false
      }
    });
    
    // If role is not in predefined roles, it's a custom role
    if (!availableRoles.find(role => role.id === user.role)) {
      setFormData(prev => ({
        ...prev,
        role: 'custom'
      }));
      setCustomRoleName(user.role);
    }
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      await deleteDoc(doc(db, 'admin', userToDelete.id));
      
      // Refresh user list
      fetchUsers();
      setSuccessMessage('User deleted successfully');
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrorMessage('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteConfirmation(false);
    setUserToDelete(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditUserId(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'editor',
      phone: '',
      permissions: {
        canEditContacts: false,
        canManageMessages: false,
        canManageUsers: false,
        canEditProfile: false
      }
    });
    setCustomRoleName('');
  };

  // Check if current user has permission to manage users
  const canManageUsers = currentUser?.role === 'superadmin' || 
                         (currentUser?.permissions && currentUser.permissions.canManageUsers);
  
  if (!canManageUsers) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">User Management</h2>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <p>You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-primary mb-4">
        {isEditing ? 'Edit User' : 'Add New User'}
      </h2>
      
      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{errorMessage}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{successMessage}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">
              {isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <PasswordInput
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!isEditing}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">
              {isEditing ? 'Confirm New Password' : 'Confirm Password *'}
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required={!isEditing}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          {formData.role === 'custom' && (
            <div>
              <label className="block text-gray-700 mb-1">Custom Role Name *</label>
              <input
                type="text"
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="canEditContacts"
                name="permissions.canEditContacts"
                checked={formData.permissions.canEditContacts}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="canEditContacts" className="ml-2 block text-gray-700">
                Edit Contact Information
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="canManageMessages"
                name="permissions.canManageMessages"
                checked={formData.permissions.canManageMessages}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="canManageMessages" className="ml-2 block text-gray-700">
                Manage Messages
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="canManageUsers"
                name="permissions.canManageUsers"
                checked={formData.permissions.canManageUsers}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="canManageUsers" className="ml-2 block text-gray-700">
                Manage Users
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="canEditProfile"
                name="permissions.canEditProfile"
                checked={formData.permissions.canEditProfile}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="canEditProfile" className="ml-2 block text-gray-700">
                Edit Profile
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditing ? 'Update User' : 'Add User'}
          </button>
          
          {isEditing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-primary mb-4">Manage Users</h2>
        
        <div className="mb-4 flex justify-between items-center">
          <div>
            <label className="text-gray-700 mr-2">Filter by Role:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-primary-light text-primary rounded-md hover:bg-primary hover:text-white transition-colors"
            disabled={loading}
          >
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </span>
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-gray-100 p-4 rounded-md text-center text-gray-500">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Username</th>
                  <th className="py-3 px-4 text-left">Role</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4">{user.username}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-primary-light text-primary">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800 mx-1"
                      >
                        Edit
                      </button>
                      {user.username !== currentUser?.username && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-800 mx-1"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete user <strong>{userToDelete?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelDeleteUser}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 