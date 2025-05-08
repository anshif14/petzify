import React, { useState, useEffect } from 'react';
import { calculateDistance } from '../../../utils/locationService';
import { Link } from 'react-router-dom';

// Dummy grooming centers data
const dummyGroomingCenters = [
  {
    id: 'kWMvaCAHcWJyALyFyGmi',
    name: 'PetPamper Grooming Spa',
    description: 'Luxurious grooming for all breeds with specialized treatments and spa services.',
    type: 'Grooming Center',
    address: '123 Pet Avenue, New York, NY',
    phone: '+1 (212) 555-1234',
    email: 'info@petpamper.com',
    website: 'https://petpamper.com',
    images: ['https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'],
    location: {
      latitude: 40.712776,
      longitude: -74.005974
    },
    services: ['Bathing', 'Trimming', 'De-shedding', 'Nail clipping', 'Ear cleaning'],
    rating: 4.8,
    reviewCount: 124,
    openHours: {
      monday: '8:00 AM - 6:00 PM',
      tuesday: '8:00 AM - 6:00 PM',
      wednesday: '8:00 AM - 6:00 PM',
      thursday: '8:00 AM - 6:00 PM',
      friday: '8:00 AM - 6:00 PM',
      saturday: '9:00 AM - 5:00 PM',
      sunday: 'Closed'
    }
  },
  {
    id: 'gc2',
    name: 'Mobile Pet Groomers',
    description: 'We come to you! Professional grooming services in the comfort of your home.',
    type: 'Mobile Grooming',
    baseLocation: 'Brooklyn, NY',
    serviceRadius: 15, // in km
    phone: '+1 (718) 555-7890',
    email: 'service@mobilepetgroomers.com',
    website: 'https://mobilepetgroomers.com',
    images: ['https://images.unsplash.com/photo-1583512603806-077998240c7a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80'],
    location: {
      latitude: 40.678177,
      longitude: -73.944160
    },
    services: ['Full grooming', 'Bath & brush', 'Nail trimming', 'Ear cleaning', 'Teeth brushing'],
    rating: 4.9,
    reviewCount: 87,
    availability: 'Monday to Saturday, 8:00 AM - 7:00 PM'
  },
  {
    id: 'gc3',
    name: 'Fluffy Friends Grooming',
    description: 'Friendly and gentle grooming services for all pets, specializing in anxious and senior animals.',
    type: 'Grooming Center',
    address: '456 Dogwood Street, Queens, NY',
    phone: '+1 (347) 555-4321',
    email: 'care@fluffyfriends.com',
    website: 'https://fluffyfriends.com',
    images: ['https://images.unsplash.com/photo-1518155317743-a8ff43ea6a5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'],
    location: {
      latitude: 40.742054,
      longitude: -73.769417
    },
    services: ['Senior pet care', 'Anxious pet care', 'Bathing', 'Trimming', 'Full grooming'],
    rating: 4.7,
    reviewCount: 112,
    openHours: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 5:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed'
    }
  },
  {
    id: 'gc4',
    name: 'Paws & Claws Mobile Grooming',
    description: 'Expert mobile grooming service with state-of-the-art mobile grooming vans.',
    type: 'Mobile Grooming',
    baseLocation: 'Manhattan, NY',
    serviceRadius: 10, // in km
    phone: '+1 (212) 555-9876',
    email: 'booking@pawsandclaws.com',
    website: 'https://pawsandclawsgrooming.com',
    images: ['https://images.unsplash.com/photo-1607425293902-d2c547f74fcc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'],
    location: {
      latitude: 40.783060,
      longitude: -73.971249
    },
    services: ['Premium grooming', 'Express service', 'Breed-specific styling', 'De-matting', 'Flea treatments'],
    rating: 4.6,
    reviewCount: 95,
    availability: 'Monday to Sunday, 7:00 AM - 8:00 PM'
  }
];

const NearbyGroomingList = ({ groomingCenters, userLocation, loading }) => {
  const [centers, setCenters] = useState([]);
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    type: 'all', // 'all', 'center', 'mobile'
    sortBy: 'distance', // 'distance', 'rating'
    searchQuery: ''
  });
  
  useEffect(() => {
    // If there are centers from props, use those, otherwise use dummy data
    const centerData = groomingCenters.length > 0 ? groomingCenters : dummyGroomingCenters;
    
    // Calculate distances if user location is available
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      const centersWithDistance = centerData.map(center => {
        // Calculate distance between user and center
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          center.location.latitude,
          center.location.longitude
        );
        
        return {
          ...center,
          distance: parseFloat(distance.toFixed(1))
        };
      });
      
      setCenters(centersWithDistance);
    } else {
      setCenters(centerData);
    }
  }, [groomingCenters, userLocation]);
  
  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...centers];
    
    // Filter by type
    if (activeFilters.type !== 'all') {
      const filterType = activeFilters.type === 'center' ? 'Grooming Center' : 'Mobile Grooming';
      filtered = filtered.filter(center => center.type === filterType);
    }
    
    // Filter by search query
    if (activeFilters.searchQuery) {
      const query = activeFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(center => 
        center.name.toLowerCase().includes(query) || 
        center.description.toLowerCase().includes(query) ||
        (center.address && center.address.toLowerCase().includes(query))
      );
    }
    
    // Sort by selected criteria
    if (activeFilters.sortBy === 'distance' && userLocation) {
      filtered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    } else if (activeFilters.sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }
    
    setFilteredCenters(filtered);
  }, [centers, activeFilters, userLocation]);

  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Placeholder for actual booking logic
  const handleBookNow = (centerId) => {
    // This function is no longer needed as we'll use Link component
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            {/* Type Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 font-medium">Type:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  className={`px-3 py-1 rounded-md text-sm ${activeFilters.type === 'all' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => handleFilterChange('type', 'all')}
                >
                  All
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${activeFilters.type === 'center' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => handleFilterChange('type', 'center')}
                >
                  Centers
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${activeFilters.type === 'mobile' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => handleFilterChange('type', 'mobile')}
                >
                  Mobile
                </button>
              </div>
            </div>
            
            {/* Sort Order */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 font-medium">Sort by:</span>
              <select
                className="bg-gray-100 border-0 rounded-md px-3 py-1.5 text-sm text-gray-600 focus:ring-primary focus:border-primary"
                value={activeFilters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="distance">Distance</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search grooming centers..."
              className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-primary focus:border-primary"
              value={activeFilters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Results Count */}
      <div className="mb-4 text-gray-600">
        Found {filteredCenters.length} grooming services {userLocation ? 'near you' : ''}
      </div>
      
      {/* Grooming Centers List */}
      {filteredCenters.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grooming centers found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCenters.map((center) => (
            <div key={center.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-48">
                <img
                  src={center.images?.[0] || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'}
                  alt={center.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${center.type === 'Mobile Grooming' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                    {center.type}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{center.name}</h3>
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                    </svg>
                    <span className="ml-1 text-gray-700">{center.rating} ({center.reviewCount})</span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-5">{center.description}</p>
                
                {/* Location and Distance */}
                <div className="flex items-center text-gray-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {center.type === 'Grooming Center' ? center.address : `Based in ${center.baseLocation}`}
                  {center.distance && (
                    <span className="ml-2 text-primary font-medium">{center.distance} km away</span>
                  )}
                </div>
                
                {/* Services */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Services:</h4>
                  <div className="flex flex-wrap gap-2">
                    {center.services.slice(0, 3).map((service, index) => (
                      <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        {service}
                      </span>
                    ))}
                    {center.services.length > 3 && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        +{center.services.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Contact and Book Button */}
                <div className="flex items-center justify-between mt-4">
                  <a
                    href={`tel:${center.phone}`}
                    className="text-sm text-primary hover:text-primary-dark flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Contact
                  </a>
                  <Link
                    to={`/services/grooming/${center.id}`}
                    className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NearbyGroomingList; 