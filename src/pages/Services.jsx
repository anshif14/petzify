import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ComingSoon from '../components/common/ComingSoon';
import MobileBottomNav from '../components/common/MobileBottomNav';
import Footer from '../components/common/Footer';

const Services = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [selectedService, setSelectedService] = useState(null);
  
  const services = [
    {
      id: 7,
      title: 'Veterinary Services',
      description: 'Connect with qualified veterinarians for regular check-ups, vaccinations, and medical care.',
      icon: '🩺',
      link: '/book-appointment',
      linkText: 'Book Your Slots',
      image: 'https://plus.unsplash.com/premium_photo-1661961347317-41f7a010a441?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
      id: 1,
      title: 'Pet Transportation',
      description: 'Safe and reliable transportation services for your pets to vet appointments, grooming sessions, or any destination.',
      icon: '🚗',
      link: '/services/transportation',
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'
    },
    {
      id: 9,
      title: 'Pet Boarding',
      linkText: 'Book Your Boarding Centre',
      description: 'Safe and comfortable accommodation for your pets when you\'re away for longer periods.',
      icon: '🏨',
      link: '/services/boarding',
      image: 'https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg'
    },
    // {
    //   id: 2,
    //   title: 'Find Your Furry Soulmate',
    //   description: 'Discover and welcome a loving companion into your family through our trusted pet adoption network.',
    //   icon: '❤️',
    //   link: '/find-furry-soulmate',
    //   image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1450&q=80'
    // },
    // {
    //   id: 3,
    //   title: 'Pet Rehoming',
    //   description: 'Help find a new loving home for pets that need to be rehomed, ensuring they continue to receive the care they deserve.',
    //   icon: '🏠',
    //   comingSoon: true,
    //   image: 'https://images.unsplash.com/photo-1494947665470-20322015e3a8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
    // },
    {
      id: 4,
      title: 'Pet Funeral Services',
      description: 'Pet Funeral Services offer compassionate support and dignified arrangements to help pet owners honor and remember their beloved companions.',
      icon: '🏠',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1450&q=80'
    },
    {
      id: 5,
      title: 'Dog Walking',
      description: 'Regular exercise for your dog with our experienced dog walkers who provide fun and safe outings.',
      icon: '🦮',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1494947665470-20322015e3a8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
    },
    {
      id: 6,
      title: 'Pet Grooming',
      description: 'Complete grooming services from baths and haircuts to nail trimming and ear cleaning.',
      icon: '✂️',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'
    },

    {
      id: 8,
      title: 'Pet Training',
      description: 'Professional trainers to help with obedience training, behavior modification, and specialized skill training.',
      icon: '🏆',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80'
    },

    {
      id: 10,
      title: 'Pet Mating',
      description: 'Connect with compatible pets for breeding purposes with our carefully curated matching service.',
      icon: '❤️',
      comingSoon: true,
      image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
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
      'Pet Transportation': "Our pet transportation service is coming soon! We're partnering with experienced pet transporters to provide safe, comfortable rides for your pets to vet appointments, grooming sessions, or any destination you need.",
      'Pet Mating': "We're developing a carefully curated matching service for pet breeding. Soon you'll be able to connect with compatible pets, view detailed profiles, and arrange safe, responsible breeding through our platform."
    };
    
    return messages[service.title] || `We're working hard to bring you our ${service.title.toLowerCase()} service. Stay tuned for updates!`;
  };

  return (
    <>
      <main className="min-h-screen bg-gray-50 py-8 md:pt-8 pt-4 pb-24 md:pb-8">
        {/* Hero Section for Become a Pet Parent */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary to-primary-dark">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1886&q=80"
              alt="Happy pets"
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          <div className="relative max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in">
                  Become a Pet Parent
                </h1>
                <p className="text-xl text-white/90 mb-8 animate-slide-up">
                  Give a loving home to a pet in need. Experience the joy and unconditional love of pet parenthood.
                </p>
                <div className="space-y-4 sm:space-y-0 sm:space-x-4">
                  <Link
                    to="/find-furry-soulmate"
                    className="inline-block px-8 py-4 bg-white text-primary rounded-full font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 animate-bounce-subtle"
                  >
                    Find Your Furry Soulmate
                  </Link>
                  <Link
                    to="/rehome"
                    className="inline-block px-8 py-4 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-all animate-fade-in"
                  >
                    Pet Rehoming
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute -inset-4">
                    <div className="w-full h-full mx-auto rotate-3 bg-gradient-to-r from-primary-light to-primary opacity-30 blur-lg">
                    </div>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80"
                    alt="Happy dog"
                    className="relative rounded-lg shadow-xl transform -rotate-3 transition-transform hover:rotate-0 duration-300"
                  />
                </div>
              </div>
            </div>
            
            {/* Statistics */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2 animate-count">1000+</div>
                <div className="text-white/80">Pets Adopted</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2 animate-count">500+</div>
                <div className="text-white/80">Happy Families</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2 animate-count">50+</div>
                <div className="text-white/80">Partner Shelters</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2 animate-count">24/7</div>
                <div className="text-white/80">Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Services Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Other Services</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative h-48">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  {service.title === 'Pet Transportation' ? (
                    <Link
                      to={service.link}
                      className="inline-flex items-center px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded transition-colors"
                    >
                      Book Transportation
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : service.comingSoon ? (
                    <button 
                      onClick={() => handleServiceClick(service)}
                      className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded transition-colors"
                    >
                      Coming Soon
                    </button>
                  ) : service.link && (
                    <Link
                      to={service.link}
                      className="inline-flex items-center px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded transition-colors"
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

        {/* Coming Soon Section */}
        {selectedService && (
          <div id="coming-soon-section" className="max-w-5xl mx-auto px-4 py-10">
            <ComingSoon service={selectedService} />
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
};

export default Services;

// Add these styles to your CSS/Tailwind config
const styles = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.animate-fade-in {
  animation: fade-in 1s ease-out;
}

.animate-slide-up {
  animation: slide-up 1s ease-out;
}

.animate-bounce-subtle {
  animation: bounce-subtle 2s infinite;
}

.animate-count {
  animation: count 2s ease-out forwards;
}
`; 