import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatisticsCounter from '../components/StatisticsCounter';
import TestimonialsSection from '../components/TestimonialsSection';
import CountdownTimer from '../components/home/CountdownTimer';
import { initializeTestimonials } from '../firebase/seedTestimonials';
import { sendTestEmail } from '../utils/emailService';
import MobileBottomNav from '../components/common/MobileBottomNav';
import Footer from '../components/common/Footer';


const Home = () => {
  useEffect(() => {
    console.log('Home component mounted');
    
    // Initialize testimonials in Firestore
    initializeTestimonials()
      .then(() => console.log("Testimonials initialization check complete"))
      .catch(error => console.error("Error checking/initializing testimonials:", error));
  }, []);

  const handleSendTestEmail = async () => {
    try {
      const response = await sendTestEmail();
      if (response.ok) {
        alert('Test email sent successfully!');
      } else {
        alert('Failed to send test email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Error sending test email: ' + error.message);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Section with Background Image */}
      <section className="relative h-screen bg-center bg-cover bg-no-repeat text-white" style={{ backgroundImage: 'url("https://images.pexels.com/photos/1378849/pexels-photo-1378849.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2")' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/30 to-primary/50"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute w-64 h-64 rounded-full bg-secondary-light opacity-10 -top-10 -left-10 animate-pulse"></div>
          <div className="absolute w-96 h-96 rounded-full bg-secondary-light opacity-10 bottom-0 right-0 animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="container mx-auto px-6 h-full flex flex-col justify-center items-center text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 transform transition-transform duration-700 hover:scale-105">
            Revolutionizing the Pet Industry
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            One-stop Solution for all your pet needs.
          </p>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 justify-center">
            <Link
              to="/services"
              className="bg-white hover:bg-gray-100 text-primary px-8 py-3 rounded-md transition-all duration-300 font-semibold hover:shadow-lg transform hover:-translate-y-1"
            >
              Explore Petzify
            </Link>
            <Link
              to="https://luna-pets-anywhere.web.app/"
              className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white border border-white px-8 py-3 rounded-md transition-all duration-300 font-semibold hover:shadow-lg transform hover:-translate-y-1"
            >
              Explore Petzify App
            </Link>
          </div>
        </div>
      </section>

      {/* Countdown Timer Section */}
      {/*<CountdownTimer />*/}

      {/* Statistics Counter Section */}
      <StatisticsCounter />

      {/* Showcase/Gallery Section */}
      {/*<section className="py-16 bg-white">*/}
      {/*  <div className="container mx-auto px-6">*/}
      {/*    <h2 className="text-3xl font-bold text-primary text-center mb-4">Pet Care Reimagined</h2>*/}
      {/*    <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">Discover the Petzify experience through the eyes of our happy pets and owners.</p>*/}
      {/*    */}
      {/*    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">*/}
      {/*      <div className="overflow-hidden rounded-lg h-64 transition-all duration-500 hover:shadow-xl transform hover:scale-105">*/}
      {/*        <img src="https://images.pexels.com/photos/2253275/pexels-photo-2253275.jpeg?auto=compress&cs=tinysrgb&w=1200"*/}
      {/*            alt="Happy dog" className="w-full h-full object-cover" />*/}
      {/*      </div>*/}
      {/*      <div className="overflow-hidden rounded-lg h-64 transition-all duration-500 hover:shadow-xl transform hover:scale-105">*/}
      {/*        <img src="https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1548&q=80" */}
      {/*            alt="Cat grooming" className="w-full h-full object-cover" />*/}
      {/*      </div>*/}
      {/*      <div className="overflow-hidden rounded-lg h-64 transition-all duration-500 hover:shadow-xl transform hover:scale-105">*/}
      {/*        <img src="https://images.unsplash.com/photo-1542736143-29a8432162bc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80" */}
      {/*            alt="Pet accessories" className="w-full h-full object-cover" />*/}
      {/*      </div>*/}
      {/*      <div className="overflow-hidden rounded-lg h-64 transition-all duration-500 hover:shadow-xl transform hover:scale-105">*/}
      {/*        <img src="https://images.unsplash.com/photo-1598875184988-5e67b1a874b8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80" */}
      {/*            alt="Dog walking" className="w-full h-full object-cover" />*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</section>*/}

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary text-center mb-4">Why Choose Petzify?</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Discover how our platform makes pet care easier and more enjoyable for you and your furry friends.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🛍️</div>
              <h3 className="text-xl font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors duration-300">All Pet Products</h3>
              <p className="text-gray-600">Find everything your pet needs in one place, from toys to accessories.</p>
              <div className="w-16 h-1 bg-primary mx-auto mt-4 group-hover:w-24 transition-all duration-300"></div>
              <div className="mt-4 h-40 overflow-hidden rounded-lg">
                <img src="https://images.unsplash.com/photo-1516750105099-4b8a83e217ee?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
                    alt="Pet products" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">✂️</div>
              <h3 className="text-xl font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors duration-300">Professional Services</h3>
              <p className="text-gray-600">Book grooming, training, and veterinary services with ease.</p>
              <div className="w-16 h-1 bg-primary mx-auto mt-4 group-hover:w-24 transition-all duration-300"></div>
              <div className="mt-4 h-40 overflow-hidden rounded-lg">
                <img src="https://images.pexels.com/photos/19145878/pexels-photo-19145878/free-photo-of-dog-groomer-brushing-a-dog.jpeg?auto=compress&cs=tinysrgb&w=1200"
                    alt="Pet grooming" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏠</div>
              <h3 className="text-xl font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors duration-300">Pet Care Solutions</h3>
              <p className="text-gray-600">Discover boarding options and care solutions for your pets.</p>
              <div className="w-16 h-1 bg-primary mx-auto mt-4 group-hover:w-24 transition-all duration-300"></div>
              <div className="mt-4 h-40 overflow-hidden rounded-lg">
                <img src="https://www.offermaids.com/blog/wp-content/uploads/2022/09/o3.jpg"
                    alt="Pet care" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Quotes Section */}
      <section className="py-20 bg-secondary-light relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute w-64 h-64 rounded-full bg-primary opacity-10 top-20 left-20"></div>
          <div className="absolute w-96 h-96 rounded-full bg-primary opacity-5 -bottom-20 -right-20"></div>
          <div className="absolute w-32 h-32 rounded-full bg-primary opacity-5 top-40 right-40"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Words of Wisdom</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <p className="text-xl text-gray-700 italic mb-4">
                "The purity of a person's heart can be quickly measured by how they regard animals."
              </p>
              <div className="w-16 h-0.5 bg-primary my-4"></div>
              <p className="text-right text-primary font-semibold">— Anonymous</p>
            </div>
            
            <div className="bg-white p-10 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <p className="text-xl text-gray-700 italic mb-4">
                "Pets are humanizing. They remind us we have an obligation and responsibility to preserve and nurture and care for all life."
              </p>
              <div className="w-16 h-0.5 bg-primary my-4"></div>
              <p className="text-right text-primary font-semibold">— James Cromwell</p>
            </div>
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section id="download-app" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h2 className="text-3xl font-bold text-primary mb-4">Get the Petzify App</h2>
              <p className="text-lg text-gray-600 mb-8">
                Download our mobile app for a seamless experience. Access all pet services, products, and care options right from your smartphone.
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/download/ios"
                  className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                >
                  <span>Download for iOS</span>
                </Link>
                
                <Link
                  to="/download/android"
                  className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                >
                  <span>Download for Android</span>
                </Link>
              </div>
            </div>
            
            <div className="md:w-1/2 grid grid-cols-2 gap-4">
              <div className="h-64 bg-gradient-to-br from-secondary-light to-primary rounded-3xl flex items-center justify-center shadow-lg overflow-hidden relative transform transition-transform duration-500 hover:scale-105">
                <img 
                  src="https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1365&q=80" 
                  alt="Pet app screenshot" 
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-30"></div>
                <span className="relative z-10 text-white text-lg font-bold">Petzify App</span>
              </div>
              <div className="h-64 bg-gradient-to-br from-secondary-light to-primary rounded-3xl flex items-center justify-center shadow-lg overflow-hidden relative transform transition-transform duration-500 hover:scale-105">
                <img 
                  src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1364&q=80" 
                  alt="Pet app features" 
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-30"></div>
                <span className="relative z-10 text-white text-lg font-bold">Easy Booking</span>
              </div>
              <div className="h-64 bg-gradient-to-br from-secondary-light to-primary rounded-3xl flex items-center justify-center shadow-lg overflow-hidden relative transform transition-transform duration-500 hover:scale-105 col-span-2">
                <img 
                  src="https://images.pexels.com/photos/6214568/pexels-photo-6214568.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Mobile app interface" 
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-30"></div>
                <span className="relative z-10 text-white text-lg font-bold">All Services in One App</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to care for your pet?</h2>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Schedule a veterinary appointment today or explore our premium pet products and services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/book-appointment"
              className="px-8 py-3 bg-white text-primary font-bold rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              Book Vet Appointment
            </Link>
            <Link
              to="/products"
              className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:bg-opacity-10 transition-colors"
            >
              Shop Pet Products
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="py-20 bg-secondary-light">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary text-center mb-4">Contact Us</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Have questions or need support? We're here to help with all your pet needs.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4 text-primary">📍</div>
              <h3 className="text-xl font-semibold text-primary mb-2">Our Location</h3>
              <p className="text-gray-600">
                Kochi, Kerala<br />
                India
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4 text-primary">📧</div>
              <h3 className="text-xl font-semibold text-primary mb-2">Email Us</h3>
              <p className="text-gray-600">petzify.business@gmail.com</p>
              <Link 
                to="/contact" 
                className="inline-block mt-4 text-primary hover:text-primary-dark font-medium transition-colors"
              >
                Send us a message
              </Link>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4 text-primary">📱</div>
              <h3 className="text-xl font-semibold text-primary mb-2">Call Us</h3>
              <p className="text-gray-600">+91 94976 72523</p>
              <div className="flex justify-center space-x-4 mt-4">
                <a 
                  href="https://www.linkedin.com/company/petzifyinofficial/posts/?feedView=all" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Home; 