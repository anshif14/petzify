import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../../../context/UserContext';
import { toast } from 'react-toastify';
import AuthModal from '../../auth/AuthModal';
import GoogleMapSelector from './GoogleMapSelector';
import CustomFeatureInput from './CustomFeatureInput';

const GroomingRegistrationForm = ({ userLocation, onSubmitSuccess }) => {
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    serviceType: 'Grooming Center',
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    baseLocation: '',
    serviceRadius: '5',
    description: '',
    services: {
      bathing: false,
      haircut: false,
      nailTrimming: false,
      earCleaning: false,
      teethBrushing: false,
      deShedding: false,
      flea: false,
      specialty: false
    },
    customServices: [],
    facilities: [],
    website: '',
    operatingHours: {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: true }
    },
    location: {
      latitude: userLocation?.latitude || '',
      longitude: userLocation?.longitude || ''
    }
  });
  
  const [images, setImages] = useState([]);
  const [imagesPreview, setImagesPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Check if user is authenticated
  useEffect(() => {
    if (authInitialized && !isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, [authInitialized, isAuthenticated]);
  
  // Update location when userLocation prop changes
  useEffect(() => {
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      setFormData(prev => ({
        ...prev,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        }
      }));
    }
  }, [userLocation]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle nested form data changes (for services)
  const handleServiceChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [name]: checked
      }
    }));
  };
  
  // Handle changes to operating hours
  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: field === 'closed' ? value : value
        }
      }
    }));
  };
  
  // Handle image selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 3 images
    if (files.length + images.length > 3) {
      toast.error('Maximum 3 images allowed', {
        position: 'top-right',
        autoClose: 3000
      });
      return;
    }
    
    // Preview images
    const newImagesPreview = files.map(file => URL.createObjectURL(file));
    setImagesPreview(prev => [...prev, ...newImagesPreview]);
    
    // Store image files
    setImages(prev => [...prev, ...files]);
  };
  
  // Remove image from selection
  const handleRemoveImage = (index) => {
    setImagesPreview(prev => prev.filter((_, i) => i !== index));
    setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Upload images to Firebase Storage
  const uploadImages = async () => {
    if (images.length === 0) return [];
    
    const storage = getStorage();
    const uploadPromises = images.map(async (image, index) => {
      const filename = `grooming_centers/${Date.now()}_${index}_${image.name}`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, image);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    });
    
    return Promise.all(uploadPromises);
  };
  
  // Handle custom services change
  const handleCustomServicesChange = (updatedServices) => {
    setFormData(prev => ({
      ...prev,
      customServices: updatedServices
    }));
  };
  
  // Handle facilities change
  const handleFacilitiesChange = (updatedFacilities) => {
    setFormData(prev => ({
      ...prev,
      facilities: updatedFacilities
    }));
  };
  
  // Handle map location selection
  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      location
    }));
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    // Start loading state
    setLoading(true);
    
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address', {
          position: 'top-right',
          autoClose: 3000
        });
        setLoading(false);
        return;
      }
      
      // Upload images first
      const imageUrls = await uploadImages();
      
      // Prepare services list including both checkboxes and custom ones
      const standardServices = Object.keys(formData.services).filter(key => formData.services[key]);
      const allServices = [...standardServices, ...formData.customServices];
      
      // Prepare data based on service type
      let submissionData = {
        name: formData.name,
        description: formData.description,
        type: formData.serviceType,
        phone: formData.phone,
        email: formData.email,
        website: formData.website || '',
        services: allServices,
        facilities: formData.facilities,
        images: imageUrls,
        submittedBy: currentUser.email,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add type-specific fields
      if (formData.serviceType === 'Grooming Center') {
        submissionData = {
          ...submissionData,
          address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
          location: {
            latitude: parseFloat(formData.location.latitude),
            longitude: parseFloat(formData.location.longitude)
          },
          operatingHours: formData.operatingHours
        };
      } else {
        // Mobile Grooming
        submissionData = {
          ...submissionData,
          baseLocation: formData.baseLocation,
          serviceRadius: parseInt(formData.serviceRadius, 10),
          location: {
            latitude: parseFloat(formData.location.latitude),
            longitude: parseFloat(formData.location.longitude)
          }
        };
      }
      
      // Save to Firestore
      await addDoc(collection(db, 'groomingCenters'), submissionData);
      
      // Send email notification to admin and owner
      await sendEmailNotifications(submissionData);
      
      // Success message and form reset
      toast.success('Registration submitted successfully!', {
        position: 'top-right',
        autoClose: 3000
      });
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      // Reset form
      setFormData({
        serviceType: 'Grooming Center',
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        baseLocation: '',
        serviceRadius: '5',
        description: '',
        services: {
          bathing: false,
          haircut: false,
          nailTrimming: false,
          earCleaning: false,
          teethBrushing: false,
          deShedding: false,
          flea: false,
          specialty: false
        },
        website: '',
        operatingHours: {
          monday: { open: '08:00', close: '18:00', closed: false },
          tuesday: { open: '08:00', close: '18:00', closed: false },
          wednesday: { open: '08:00', close: '18:00', closed: false },
          thursday: { open: '08:00', close: '18:00', closed: false },
          friday: { open: '08:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '09:00', close: '17:00', closed: true }
        },
        location: {
          latitude: userLocation?.latitude || '',
          longitude: userLocation?.longitude || ''
        }
      });
      setImages([]);
      setImagesPreview([]);
    } catch (error) {
      console.error('Error submitting grooming center registration:', error);
      toast.error('Failed to submit registration. Please try again later.', {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to send email notifications
  const sendEmailNotifications = async (data) => {
    try {
      // You could implement this using your existing email system or cloud functions
      console.log('Would send email notification for:', data);
      // In a real implementation, you might call an API or cloud function
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't fail the entire submission if just the email fails
    }
  };

  return (
    <>
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
          initialMode="signin"
          message="Please sign in to register your grooming center"
        />
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Type Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Type of Service</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition ${
                formData.serviceType === 'Grooming Center' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleInputChange({ target: { name: 'serviceType', value: 'Grooming Center' } })}
            >
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  name="serviceType"
                  value="Grooming Center"
                  checked={formData.serviceType === 'Grooming Center'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary focus:ring-primary-light"
                />
                <label className="ml-2 block text-lg font-medium text-gray-900">
                  Grooming Center
                </label>
              </div>
              <p className="text-gray-500 text-sm ml-6">
                A physical location where pet owners can bring their pets for grooming services
              </p>
            </div>
            
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition ${
                formData.serviceType === 'Mobile Grooming' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleInputChange({ target: { name: 'serviceType', value: 'Mobile Grooming' } })}
            >
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  name="serviceType"
                  value="Mobile Grooming"
                  checked={formData.serviceType === 'Mobile Grooming'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary focus:ring-primary-light"
                />
                <label className="ml-2 block text-lg font-medium text-gray-900">
                  Mobile Grooming
                </label>
              </div>
              <p className="text-gray-500 text-sm ml-6">
                A service that travels to pet owners' homes to provide grooming services
              </p>
            </div>
          </div>
        </div>
        
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Business Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                required
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website (Optional)
              </label>
              <input
                type="url"
                name="website"
                id="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Business Description *
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              required
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your grooming services, specialties, and what makes your business unique..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        
        {/* Location Information - Conditional based on service type */}
        {formData.serviceType === 'Grooming Center' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State/Province *
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                    ZIP/Postal Code *
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    id="zipCode"
                    required
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="block text-sm font-medium text-gray-700 mb-2">
                  Mark Your Location on Google Maps *
                </h4>
                <GoogleMapSelector 
                  initialLocation={formData.location}
                  onLocationSelect={handleLocationSelect}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Service Area Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="baseLocation" className="block text-sm font-medium text-gray-700">
                  Base Location/Area *
                </label>
                <input
                  type="text"
                  name="baseLocation"
                  id="baseLocation"
                  required
                  value={formData.baseLocation}
                  onChange={handleInputChange}
                  placeholder="e.g., Manhattan, NYC"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label htmlFor="serviceRadius" className="block text-sm font-medium text-gray-700">
                  Service Radius (km) *
                </label>
                <select
                  name="serviceRadius"
                  id="serviceRadius"
                  required
                  value={formData.serviceRadius}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="15">15 km</option>
                  <option value="20">20 km</option>
                  <option value="25">25 km</option>
                  <option value="30">30 km</option>
                </select>
              </div>
              
              <div className="md:col-span-2 mt-4">
                <h4 className="block text-sm font-medium text-gray-700 mb-2">
                  Mark Your Base Location on Google Maps *
                </h4>
                <GoogleMapSelector 
                  initialLocation={formData.location}
                  onLocationSelect={handleLocationSelect}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Services Offered */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Services Offered</h3>
          <p className="text-sm text-gray-500">Select all services that apply or add your own</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="bathing"
                id="bathing"
                checked={formData.services.bathing}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="bathing" className="ml-2 block text-sm text-gray-700">
                Bathing & Brushing
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="haircut"
                id="haircut"
                checked={formData.services.haircut}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="haircut" className="ml-2 block text-sm text-gray-700">
                Haircuts & Styling
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="nailTrimming"
                id="nailTrimming"
                checked={formData.services.nailTrimming}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="nailTrimming" className="ml-2 block text-sm text-gray-700">
                Nail Trimming
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="earCleaning"
                id="earCleaning"
                checked={formData.services.earCleaning}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="earCleaning" className="ml-2 block text-sm text-gray-700">
                Ear Cleaning
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="teethBrushing"
                id="teethBrushing"
                checked={formData.services.teethBrushing}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="teethBrushing" className="ml-2 block text-sm text-gray-700">
                Teeth Brushing
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="deShedding"
                id="deShedding"
                checked={formData.services.deShedding}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="deShedding" className="ml-2 block text-sm text-gray-700">
                De-shedding Treatments
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="flea"
                id="flea"
                checked={formData.services.flea}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="flea" className="ml-2 block text-sm text-gray-700">
                Flea & Tick Treatments
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="specialty"
                id="specialty"
                checked={formData.services.specialty}
                onChange={handleServiceChange}
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
              <label htmlFor="specialty" className="ml-2 block text-sm text-gray-700">
                Specialty Breed Grooming
              </label>
            </div>
          </div>
          
          {/* Custom Services */}
          <div className="mt-6">
            <CustomFeatureInput
              initialFeatures={formData.customServices}
              onChange={handleCustomServicesChange}
            />
          </div>
        </div>
        
        {/* Facilities Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Facilities</h3>
          <p className="text-sm text-gray-500">Add the facilities and amenities you offer</p>
          
          <CustomFeatureInput
            initialFeatures={formData.facilities}
            onChange={handleFacilitiesChange}
          />
        </div>
        
        {/* Business Hours - Only for Grooming Centers */}
        {formData.serviceType === 'Grooming Center' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Business Hours</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(formData.operatingHours).map(([day, hours]) => (
                    <tr key={day}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {day}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          disabled={hours.closed}
                          className={`border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-primary focus:border-primary ${hours.closed ? 'bg-gray-100' : ''}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                          disabled={hours.closed}
                          className={`border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-primary focus:border-primary ${hours.closed ? 'bg-gray-100' : ''}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) => handleHoursChange(day, 'closed', e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary-light rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Image Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Photos</h3>
          <p className="text-sm text-gray-500">Upload up to 3 photos of your grooming facility or mobile setup</p>
          
          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                  <span>Upload a file</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
          
          {/* Image Preview */}
          {imagesPreview.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {imagesPreview.map((preview, index) => (
                <div key={index} className="relative">
                  <img 
                    src={preview} 
                    alt={`Preview ${index}`} 
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Terms and Submission */}
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary focus:ring-primary-light rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700">I agree to the terms and conditions</label>
              <p className="text-gray-500">I confirm that all information provided is accurate and that I am authorized to register this business.</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className={`px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </div>
              ) : 'Submit Registration'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default GroomingRegistrationForm; 