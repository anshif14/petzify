import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ComingSoon from '../components/common/ComingSoon';

const Services = () => {
  const [selectedService, setSelectedService] = useState(null);
  
  const services = [
    {
      id: 1,
      title: 'Pet Sitting',
      description: 'Professional pet sitters who provide care for your pets in the comfort of your own home while you\'re away.',
      icon: '🏠',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1450&q=80'
    },
    {
      id: 2,
      title: 'Dog Walking',
      description: 'Regular exercise for your dog with our experienced dog walkers who provide fun and safe outings.',
      icon: '🦮',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1494947665470-20322015e3a8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
    },
    {
      id: 3,
      title: 'Pet Grooming',
      description: 'Complete grooming services from baths and haircuts to nail trimming and ear cleaning.',
      icon: '✂️',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'
    },
    {
      id: 4,
      title: 'Veterinary Services',
      description: 'Connect with qualified veterinarians for regular check-ups, vaccinations, and medical care.',
      icon: '🩺',
      link: '/book-appointment',
      image: 'https://plus.unsplash.com/premium_photo-1661961347317-41f7a010a441?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
      id: 5,
      title: 'Pet Training',
      description: 'Professional trainers to help with obedience training, behavior modification, and specialized skill training.',
      icon: '🏆',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1541690090176-17d35a190b6c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1473&q=80'
    },
    {
      id: 6,
      title: 'Pet Boarding',
      description: 'Safe and comfortable accommodation for your pets when you\'re away for longer periods.',
      icon: '🏨',
      comingSoon: true,
      image: 'https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg'
    }
  ];

  // Function to handle service selection
  const handleServiceClick = (service) => {
    if (service.comingSoon) {
      setSelectedService(service);
      // Scroll to the coming soon component
      setTimeout(() => {
        const element = document.getElementById('coming-soon-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Function to close the coming soon section
  const handleClose = () => {
    setSelectedService(null);
  };

  const getServiceMessage = (service) => {
    const messages = {
      'Pet Sitting': "We're building a network of reliable pet sitters to care for your pets in the comfort of your home. You'll be able to view profiles, read reviews, and book trusted sitters directly through our platform.",
      'Dog Walking': "Our dog walking service is almost ready! Soon you'll be able to schedule regular walks with experienced dog walkers who will provide exercise, companionship, and fun for your furry friend.",
      'Pet Grooming': "We're putting the finishing touches on our grooming service. Soon you'll be able to book professional groomers for everything from baths and haircuts to nail trimming and specialized treatments.",
      'Pet Training': "Our team of certified trainers is preparing to offer personalized training programs for your pets, including obedience training, behavior modification, and specialized skills. Stay tuned!",
      'Pet Boarding': "We're carefully selecting partner facilities to provide safe, comfortable accommodation for your pets when you're away. You'll soon be able to browse boarding options and book stays directly through our platform."
    };
    
    return messages[service.title] || `We're working hard to bring you our ${service.title.toLowerCase()} service. Stay tuned for updates!`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-64 h-64 rounded-full bg-white opacity-10 -top-20 left-1/4 animate-pulse" style={{animationDuration: '3s'}}></div>
          <div className="absolute w-80 h-80 rounded-full bg-white opacity-5 bottom-0 -right-20 animate-pulse" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 transform transition-transform duration-700 hover:scale-105">Our Services</h1>
          <p className="text-xl max-w-2xl mx-auto mb-6">
            Comprehensive pet care services designed to keep your furry friends happy, healthy, and thriving.
          </p>
          <Link 
            to="/book-appointment" 
            className="inline-block bg-white text-primary font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-100 transform transition-all duration-300 hover:scale-105"
          >
            Book a Vet Appointment
          </Link>
        </div>
      </section>

      {/* Coming Soon Section - Only shown when a coming soon service is selected */}
      {selectedService && (
        <div id="coming-soon-section" className="max-w-5xl mx-auto px-4 py-10">
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-10">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <h3 className="text-xl font-semibold">{selectedService.title}</h3>
              <button onClick={handleClose} className="text-white hover:text-gray-200">
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="p-6">
              <ComingSoon 
                title={`${selectedService.title} Coming Soon!`} 
                message={getServiceMessage(selectedService)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Featured Service - Pet Veterinary Care */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl shadow-lg overflow-hidden mb-16">
          <div className="md:flex">
            <div className="md:w-1/2 p-8 md:p-12">
              <h2 className="text-3xl font-bold mb-4">Pet Veterinary Care</h2>
              <p className="text-lg mb-6">
                Our experienced veterinarians provide comprehensive healthcare for your pets. Book an appointment today for checkups, vaccinations, treatments, and more.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/book-appointment"
                  className="inline-block bg-white text-primary font-medium px-6 py-3 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                >
                  Book Appointment
                </Link>
                <a href="#all-services-section" className="inline-block bg-primary-light bg-opacity-30 text-white border border-white font-medium px-6 py-3 rounded-lg hover:bg-opacity-40 transition-colors">
                  View All Services
                </a>
              </div>
            </div>
            <div className="md:w-1/2 bg-primary-light">
              <img
                src="/images/services/vet-service.jpg"
                alt="Veterinary Care"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1583336663277-620dc1996580?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8dmV0ZXJpbmFyaWFufGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=800&q=60';
                }}
              />
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div id="all-services-section" className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We offer a comprehensive range of services to care for your beloved pets
            </p>
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/640x360?text=Service+Image';
                    }}
                  />
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  
                  {service.comingSoon ? (
                    <button 
                      onClick={() => handleServiceClick(service)}
                      className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded transition-colors"
                    >
                      Coming Soon
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : service.link && (
                    <Link
                      to={service.link}
                      className={`inline-flex items-center px-4 py-2 ${
                        service.featured 
                          ? 'bg-primary text-white hover:bg-primary-dark' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      } rounded transition-colors`}
                    >
                      {service.linkText || 'Learn More'}
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Book Appointment Banner */}
      <section className="bg-primary text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Veterinary Services?</h2>
          <p className="text-lg mb-6 max-w-2xl mx-auto">
            Our qualified veterinarians are available for appointments. Book a consultation today for your pet's health needs.
          </p>
          <Link 
            to="/book-appointment" 
            className="inline-block bg-white text-primary font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-100 transform transition-all duration-300 hover:scale-105"
          >
            Book an Appointment
          </Link>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-primary-light py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full bg-primary opacity-5 -top-20 -right-20"></div>
          <div className="absolute w-64 h-64 rounded-full bg-primary opacity-10 bottom-0 left-1/4"></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl font-bold text-primary mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">
            Join thousands of pet owners who trust Petzify for all their pet care needs. 
            Download our app today and connect with quality pet service providers in your area.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link 
              to="/download/ios" 
              className="bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-md font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              Download for iOS
            </Link>
            <Link 
              to="/download/android" 
              className="bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-md font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              Download for Android
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-primary mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Find answers to common questions about our services and how to get started.</p>
          
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <span className="text-primary-light mr-2">Q:</span>
                How do I book a service?
              </h3>
              <p className="text-gray-600 pl-6">
                Download our app, create an account, browse available services in your area, and book directly through the app.
              </p>
            </div>
            <div className="mb-6 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <span className="text-primary-light mr-2">Q:</span>
                Are all service providers vetted?
              </h3>
              <p className="text-gray-600 pl-6">
                Yes, all service providers on our platform undergo background checks and must provide references before being approved.
              </p>
            </div>
            <div className="mb-6 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <span className="text-primary-light mr-2">Q:</span>
                What if I need to cancel a booking?
              </h3>
              <p className="text-gray-600 pl-6">
                You can cancel or reschedule bookings through the app. Please refer to our cancellation policy for more details.
              </p>
            </div>
            <div className="mb-6 bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <span className="text-primary-light mr-2">Q:</span>
                Do you offer emergency services?
              </h3>
              <p className="text-gray-600 pl-6">
                Yes, we have emergency services available in most areas. Please check the app for availability in your location.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services; 