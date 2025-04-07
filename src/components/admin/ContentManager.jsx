import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../../firebase/config';
import { useAlert } from '../../context/AlertContext';
import PageLoader from '../common/PageLoader';

const ContentManager = () => {
  const { showSuccess, showError } = useAlert();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [contentData, setContentData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  // Define the default sections of the site that can be customized
  const defaultSections = [
    {
      id: 'home_hero',
      name: 'Home Page Hero',
      description: 'The main banner on the homepage',
      fields: [
        { name: 'title', type: 'text', label: 'Title' },
        { name: 'subtitle', type: 'textarea', label: 'Subtitle' },
        { name: 'cta_text', type: 'text', label: 'Button Text' },
        { name: 'cta_link', type: 'text', label: 'Button Link' },
        { name: 'background_image', type: 'image', label: 'Background Image' }
      ]
    },
    {
      id: 'about_section',
      name: 'About Section',
      description: 'The about us section on the homepage',
      fields: [
        { name: 'title', type: 'text', label: 'Title' },
        { name: 'content', type: 'richtext', label: 'Content' },
        { name: 'image', type: 'image', label: 'Image' }
      ]
    },
    {
      id: 'services_banner',
      name: 'Services Banner',
      description: 'The main banner on the services page',
      fields: [
        { name: 'title', type: 'text', label: 'Title' },
        { name: 'subtitle', type: 'textarea', label: 'Subtitle' },
        { name: 'background_image', type: 'image', label: 'Background Image' }
      ]
    },
    {
      id: 'testimonials',
      name: 'Testimonials Section',
      description: 'Customer testimonials that appear on multiple pages',
      fields: [
        { name: 'title', type: 'text', label: 'Section Title' },
        { name: 'subtitle', type: 'textarea', label: 'Section Subtitle' },
        { name: 'testimonials', type: 'array', label: 'Testimonials',
          fields: [
            { name: 'name', type: 'text', label: 'Customer Name' },
            { name: 'role', type: 'text', label: 'Customer Role' },
            { name: 'content', type: 'textarea', label: 'Testimonial Text' },
            { name: 'image', type: 'image', label: 'Customer Image' }
          ]
        }
      ]
    },
    {
      id: 'contact_info',
      name: 'Contact Information',
      description: 'Contact details shown in the footer and contact page',
      fields: [
        { name: 'address', type: 'textarea', label: 'Address' },
        { name: 'phone', type: 'text', label: 'Phone Number' },
        { name: 'email', type: 'text', label: 'Email Address' },
        { name: 'hours', type: 'textarea', label: 'Business Hours' }
      ]
    },
    {
      id: 'home_gallery',
      name: 'Home Gallery',
      description: 'The image gallery displayed on the homepage',
      fields: [
        { name: 'title', type: 'text', label: 'Gallery Title' },
        { name: 'subtitle', type: 'textarea', label: 'Gallery Subtitle' },
        { name: 'images', type: 'images', label: 'Gallery Images (up to 8)' }
      ]
    }
  ];

  // Load content data from Firestore
  useEffect(() => {
    const loadContentData = async () => {
      setLoading(true);
      try {
        const db = getFirestore(app);
        setSections(defaultSections);
        
        // Check if the content collection exists
        const contentRef = collection(db, 'site_content');
        const contentSnapshot = await getDocs(contentRef);
        
        const contentObj = {};
        contentSnapshot.forEach((doc) => {
          contentObj[doc.id] = doc.data();
        });
        
        // Initialize with default data if sections don't exist
        defaultSections.forEach(section => {
          if (!contentObj[section.id]) {
            const defaultData = {};
            section.fields.forEach(field => {
              if (field.type === 'array' || field.type === 'images') {
                defaultData[field.name] = [];
              } else {
                defaultData[field.name] = '';
              }
            });
            contentObj[section.id] = defaultData;
          }
        });
        
        setContentData(contentObj);
        
        // Set first section as active if none selected
        if (!activeSection && defaultSections.length > 0) {
          setActiveSection(defaultSections[0].id);
        }
      } catch (error) {
        console.error('Error loading content data:', error);
        showError('Failed to load content data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadContentData();
  }, []);

  // Handle input changes
  const handleInputChange = (sectionId, fieldName, value, arrayIndex = null, arrayFieldName = null) => {
    if (arrayIndex !== null && arrayFieldName !== null) {
      // Handle array field changes
      setContentData(prevData => {
        const newData = { ...prevData };
        if (!newData[sectionId][fieldName]) {
          newData[sectionId][fieldName] = [];
        }
        
        if (!newData[sectionId][fieldName][arrayIndex]) {
          newData[sectionId][fieldName][arrayIndex] = {};
        }
        
        newData[sectionId][fieldName][arrayIndex][arrayFieldName] = value;
        return newData;
      });
    } else {
      // Handle regular field changes
      setContentData(prevData => ({
        ...prevData,
        [sectionId]: {
          ...prevData[sectionId],
          [fieldName]: value
        }
      }));
    }
  };

  // Handle image upload
  const handleImageUpload = async (sectionId, fieldName, file, arrayIndex = null, arrayFieldName = null) => {
    if (!file) return;
    
    try {
      const storage = getStorage(app);
      const timestamp = new Date().getTime();
      const storagePath = arrayIndex !== null 
        ? `content/${sectionId}/${fieldName}/${arrayIndex}/${arrayFieldName}_${timestamp}`
        : `content/${sectionId}/${fieldName}_${timestamp}`;
      
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      
      if (arrayIndex !== null && arrayFieldName !== null) {
        // Handle array field image
        handleInputChange(sectionId, fieldName, downloadURL, arrayIndex, arrayFieldName);
      } else {
        // Handle regular field image
        handleInputChange(sectionId, fieldName, downloadURL);
      }
      
      showSuccess('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Failed to upload image. Please try again.');
    }
  };

  // Handle multiple image uploads
  const handleMultipleImageUpload = async (sectionId, fieldName, files) => {
    if (!files || files.length === 0) return;
    
    try {
      const storage = getStorage(app);
      const timestamp = new Date().getTime();
      
      // Create a temporary array to hold the current images
      let currentImages = [...(contentData[sectionId][fieldName] || [])];
      
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storagePath = `content/${sectionId}/${fieldName}/${timestamp}_${i}`;
        const imageRef = ref(storage, storagePath);
        
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);
        
        // Add to the current images array
        currentImages.push({
          url: downloadURL,
          path: storagePath
        });
      }
      
      // Update the state with all images
      setContentData(prevData => ({
        ...prevData,
        [sectionId]: {
          ...prevData[sectionId],
          [fieldName]: currentImages
        }
      }));
      
      showSuccess('Images uploaded successfully!');
    } catch (error) {
      console.error('Error uploading images:', error);
      showError('Failed to upload images. Please try again.');
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (sectionId, fieldName, imagePath, arrayIndex = null, arrayFieldName = null) => {
    try {
      const storage = getStorage(app);
      const imageRef = ref(storage, imagePath);
      
      await deleteObject(imageRef);
      
      if (arrayIndex !== null && arrayFieldName !== null) {
        // Handle array field image deletion
        handleInputChange(sectionId, fieldName, '', arrayIndex, arrayFieldName);
      } else if (fieldName === 'images' || (contentData[sectionId][fieldName] && Array.isArray(contentData[sectionId][fieldName]))) {
        // Handle multiple images deletion
        setContentData(prevData => {
          const newData = { ...prevData };
          const images = [...newData[sectionId][fieldName]];
          const filteredImages = images.filter(img => img.path !== imagePath);
          newData[sectionId][fieldName] = filteredImages;
          return newData;
        });
      } else {
        // Handle regular field image deletion
        handleInputChange(sectionId, fieldName, '');
      }
      
      showSuccess('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      showError('Failed to delete image. Please try again.');
    }
  };

  // Add new array item
  const handleAddArrayItem = (sectionId, fieldName) => {
    setContentData(prevData => {
      const newData = { ...prevData };
      if (!newData[sectionId][fieldName]) {
        newData[sectionId][fieldName] = [];
      }
      newData[sectionId][fieldName].push({});
      return newData;
    });
  };

  // Remove array item
  const handleRemoveArrayItem = (sectionId, fieldName, index) => {
    setContentData(prevData => {
      const newData = { ...prevData };
      const items = [...newData[sectionId][fieldName]];
      items.splice(index, 1);
      newData[sectionId][fieldName] = items;
      return newData;
    });
  };

  // Save content to Firestore
  const handleSaveContent = async () => {
    setIsSaving(true);
    try {
      const db = getFirestore(app);
      
      for (const sectionId in contentData) {
        await setDoc(doc(db, 'site_content', sectionId), contentData[sectionId]);
      }
      
      showSuccess('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      showError('Failed to save content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render field based on its type
  const renderField = (section, field, sectionData) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={sectionData[field.name] || ''}
            onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={`Enter ${field.label}`}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={sectionData[field.name] || ''}
            onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-32"
            placeholder={`Enter ${field.label}`}
          />
        );
      
      case 'richtext':
        return (
          <textarea
            value={sectionData[field.name] || ''}
            onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-64"
            placeholder={`Enter ${field.label}`}
          />
        );
      
      case 'image':
        return (
          <div>
            <div className="flex items-center mb-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && e.target.files[0] && 
                  handleImageUpload(section.id, field.name, e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {sectionData[field.name] && (
              <div className="relative w-full h-40 mt-2">
                <img 
                  src={sectionData[field.name]} 
                  alt={field.label} 
                  className="w-full h-full object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(section.id, field.name, sectionData[field.name])}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        );
      
      case 'images':
        return (
          <div>
            <div className="flex items-center mb-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && e.target.files.length > 0 && 
                  handleMultipleImageUpload(section.id, field.name, e.target.files)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {sectionData[field.name] && sectionData[field.name].length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {sectionData[field.name].map((image, index) => (
                  <div key={index} className="relative h-24">
                    <img 
                      src={image.url} 
                      alt={`Gallery image ${index + 1}`} 
                      className="w-full h-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(section.id, field.name, image.path)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'array':
        return (
          <div className="border border-gray-200 rounded-md p-4 mb-3">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium">{field.label}</h4>
              <button
                type="button"
                onClick={() => handleAddArrayItem(section.id, field.name)}
                className="bg-primary text-white px-4 py-1 rounded-md text-sm hover:bg-primary-dark"
              >
                Add Item
              </button>
            </div>
            
            {(!sectionData[field.name] || sectionData[field.name].length === 0) && (
              <p className="text-gray-500 text-sm italic">No items added yet.</p>
            )}
            
            {sectionData[field.name] && sectionData[field.name].map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-sm font-medium">Item {index + 1}</h5>
                  <button
                    type="button"
                    onClick={() => handleRemoveArrayItem(section.id, field.name, index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                
                {field.fields && field.fields.map((subfield) => (
                  <div key={subfield.name} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {subfield.label}
                    </label>
                    
                    {subfield.type === 'text' && (
                      <input
                        type="text"
                        value={item[subfield.name] || ''}
                        onChange={(e) => handleInputChange(
                          section.id, field.name, e.target.value, index, subfield.name
                        )}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={`Enter ${subfield.label}`}
                      />
                    )}
                    
                    {subfield.type === 'textarea' && (
                      <textarea
                        value={item[subfield.name] || ''}
                        onChange={(e) => handleInputChange(
                          section.id, field.name, e.target.value, index, subfield.name
                        )}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20"
                        placeholder={`Enter ${subfield.label}`}
                      />
                    )}
                    
                    {subfield.type === 'image' && (
                      <div>
                        <div className="flex items-center mb-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files && e.target.files[0] && 
                              handleImageUpload(
                                section.id, field.name, e.target.files[0], index, subfield.name
                              )}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        
                        {item[subfield.name] && (
                          <div className="relative w-full h-32 mt-2">
                            <img 
                              src={item[subfield.name]} 
                              alt={subfield.label} 
                              className="w-full h-full object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => handleInputChange(
                                section.id, field.name, '', index, subfield.name
                              )}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <PageLoader message="Loading content manager..." size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Content Management</h2>
        <button
          onClick={handleSaveContent}
          disabled={isSaving}
          className={`px-4 py-2 rounded-md text-white ${isSaving ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'}`}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex">
          {/* Section Navigation */}
          <div className="w-64 bg-gray-50 p-4 border-r border-gray-200">
            <h3 className="text-lg font-medium mb-4">Page Sections</h3>
            <ul>
              {sections.map((section) => (
                <li key={section.id} className="mb-2">
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {section.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Section Editor */}
          <div className="flex-1 p-6">
            {activeSection && sections.find(s => s.id === activeSection) && (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">
                    {sections.find(s => s.id === activeSection).name}
                  </h3>
                  <p className="text-gray-500">
                    {sections.find(s => s.id === activeSection).description}
                  </p>
                </div>
                
                <div className="space-y-6">
                  {sections.find(s => s.id === activeSection).fields.map((field) => (
                    <div key={field.name} className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      {renderField(
                        sections.find(s => s.id === activeSection),
                        field,
                        contentData[activeSection] || {}
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {!activeSection && (
              <div className="text-center py-12 text-gray-500">
                <p>Select a section to edit from the sidebar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManager; 