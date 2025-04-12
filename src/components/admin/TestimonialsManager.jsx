import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const TestimonialsManager = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    image: '',
    content: '',
    rating: 5
  });

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  
  useEffect(() => {
    fetchTestimonials();
  }, []);
  
  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const testimonialsQuery = query(
        collection(db, 'testimonials'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(testimonialsQuery);
      const fetchedTestimonials = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setTestimonials(fetchedTestimonials);
      setError(null);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      setError("Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'rating' ? parseInt(value, 10) : value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      setError("Please select an image file (png, jpeg, jpg)");
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB");
      return;
    }
    
    setSelectedFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const uploadImage = async (file) => {
    if (!file) return null;
    
    try {
      setUploadingImage(true);
      const storage = getStorage();
      const timestamp = new Date().getTime();
      const fileName = `testimonials/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { downloadURL, fileName };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.role || !formData.content) {
      setError("Please fill in all required fields.");
      return;
    }
    
    if (!selectedFile && !formData.image && !editingId) {
      setError("Please select an image.");
      return;
    }
    
    try {
      setLoading(true);
      
      let imageData = { downloadURL: formData.image, fileName: formData.fileName };
      
      // Upload new image if selected
      if (selectedFile) {
        imageData = await uploadImage(selectedFile);
        
        // If editing and replacing image, delete the old one
        if (editingId && formData.fileName) {
          try {
            const storage = getStorage();
            const oldImageRef = ref(storage, formData.fileName);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.error("Error deleting old image:", error);
            // Continue with the update even if deleting old image fails
          }
        }
      }
      
      const testimonialData = {
        ...formData,
        image: imageData.downloadURL,
        fileName: imageData.fileName
      };
      
      if (editingId) {
        // Update existing testimonial
        await updateDoc(doc(db, 'testimonials', editingId), {
          ...testimonialData,
          updatedAt: serverTimestamp()
        });
        setSuccessMessage("Testimonial updated successfully!");
      } else {
        // Add new testimonial
        await addDoc(collection(db, 'testimonials'), {
          ...testimonialData,
          createdAt: serverTimestamp()
        });
        setSuccessMessage("Testimonial added successfully!");
      }
      
      // Reset form
      setFormData({
        name: '',
        role: '',
        image: '',
        content: '',
        rating: 5
      });
      
      setEditingId(null);
      setSelectedFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      fetchTestimonials();
    } catch (error) {
      console.error("Error saving testimonial:", error);
      setError("Failed to save testimonial.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (testimonial) => {
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      image: testimonial.image,
      fileName: testimonial.fileName,
      content: testimonial.content,
      rating: testimonial.rating || 5
    });
    setImagePreview(testimonial.image);
    setEditingId(testimonial.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this testimonial?")) {
      return;
    }
    
    try {
      setDeletingId(id);
      
      // Find the testimonial to get the image filename
      const testimonial = testimonials.find(t => t.id === id);
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'testimonials', id));
      
      // Delete image from Storage if exists
      if (testimonial.fileName) {
        try {
          const storage = getStorage();
          const imageRef = ref(storage, testimonial.fileName);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image file:", error);
          // Continue with deletion even if image delete fails
        }
      }
      
      setSuccessMessage("Testimonial deleted successfully!");
      fetchTestimonials();
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      setError("Failed to delete testimonial.");
    } finally {
      setDeletingId(null);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      image: '',
      content: '',
      rating: 5
    });
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setEditingId(null);
    setError(null);
  };
  
  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  return (
    <div className="p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">
        {editingId ? 'Edit Testimonial' : 'Add New Testimonial'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{successMessage}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Dog Owner, Veterinarian"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Image <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">Max size: 2MB. Formats: JPG, PNG, GIF</p>
            
            {imagePreview && (
              <div className="mt-3">
                <p className="text-sm text-gray-700 mb-1">Preview:</p>
                <div className="relative w-24 h-24 border rounded-full overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/100';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating (1-5)
            </label>
            <select
              name="rating"
              value={formData.rating}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num} Star{num !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            ></textarea>
          </div>
        </div>
        
        <div className="mt-6 flex items-center space-x-3">
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {(loading || uploadingImage) ? (
              <>
                <span className="inline-block animate-spin h-4 w-4 border-t-2 border-white rounded-full mr-2"></span>
                {uploadingImage ? 'Uploading Image...' : 'Saving...'}
              </>
            ) : (
              editingId ? 'Update Testimonial' : 'Add Testimonial'
            )}
          </button>
          
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      
      <h2 className="text-xl font-medium text-gray-900 mb-4">Manage Testimonials</h2>
      
      {loading && !testimonials.length ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading testimonials...</p>
        </div>
      ) : testimonials.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
          No testimonials found. Add your first testimonial above.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name}
                      className="h-16 w-16 rounded-full object-cover mr-4 border-2 border-primary"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/64';
                      }}
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-primary">{testimonial.name}</h3>
                      <p className="text-gray-500 text-sm">{testimonial.role}</p>
                      <div className="mt-1 flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star} 
                            className={
                              star <= (testimonial.rating || 5) 
                                ? "text-yellow-500" 
                                : "text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(testimonial)}
                      className="text-primary hover:text-primary-dark focus:outline-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(testimonial.id)}
                      disabled={deletingId === testimonial.id}
                      className="text-red-500 hover:text-red-700 focus:outline-none"
                    >
                      {deletingId === testimonial.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-gray-600 italic">{testimonial.content}</p>
                </div>
                
                <div className="mt-2 text-xs text-gray-400">
                  Added: {testimonial.createdAt?.toDate().toLocaleString() || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestimonialsManager; 