import React from 'react';
import { Link } from 'react-router-dom';

const Services = () => {
  const services = [
    {
      id: 1,
      title: 'Pet Sitting',
      description: 'Professional pet sitters who provide care for your pets in the comfort of your own home while you\'re away.',
      icon: '🏠',
      link: '/services/pet-sitting',
      image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1450&q=80'
    },
    {
      id: 2,
      title: 'Dog Walking',
      description: 'Regular exercise for your dog with our experienced dog walkers who provide fun and safe outings.',
      icon: '🦮',
      link: '/services/dog-walking',
      image: 'https://images.unsplash.com/photo-1494947665470-20322015e3a8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
    },
    {
      id: 3,
      title: 'Pet Grooming',
      description: 'Complete grooming services from baths and haircuts to nail trimming and ear cleaning.',
      icon: '✂️',
      link: '/services/grooming',
      image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'
    },
    {
      id: 4,
      title: 'Veterinary Services',
      description: 'Connect with qualified veterinarians for regular check-ups, vaccinations, and medical care.',
      icon: '🩺',
      link: '/book-appointment',
      image: 'https://images.unsplash.com/photo-1584873603799-39114ed0f28d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1476&q=80'
    },
    {
      id: 5,
      title: 'Pet Training',
      description: 'Professional trainers to help with obedience training, behavior modification, and specialized skill training.',
      icon: '🏆',
      link: '/services/training',
      image: 'https://images.unsplash.com/photo-1541690090176-17d35a190b6c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1473&q=80'
    },
    {
      id: 6,
      title: 'Pet Boarding',
      description: 'Safe and comfortable accommodation for your pets when you\'re away for longer periods.',
      icon: '🏨',
      link: '/services/boarding',
      image: 'https://images.unsplash.com/photo-1575467678930-c7acd65d2c23?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
    }
  ];

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

      {/* Services Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div 
                key={service.id}
                className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <div className="absolute top-4 left-4 bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                    {service.icon}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-primary mb-3 group-hover:text-primary-dark transition-colors duration-300">{service.title}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <Link 
                      to={service.link}
                      className="inline-block bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark transition-colors duration-300 transform hover:translate-x-1"
                    >
                      {service.id === 4 ? 'Book Now' : 'Learn More'}
                    </Link>
                    <div className="w-8 h-0.5 bg-primary-light transition-all duration-300 group-hover:w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            <a 
              href="https://apps.apple.com" 
              className="bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-md font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              Download for iOS
            </a>
            <a 
              href="https://play.google.com" 
              className="bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-md font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              Download for Android
            </a>
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