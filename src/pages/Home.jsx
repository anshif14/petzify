import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute w-64 h-64 rounded-full bg-white opacity-10 -top-10 -left-10 animate-pulse"></div>
          <div className="absolute w-96 h-96 rounded-full bg-white opacity-5 bottom-0 right-0 animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 transform transition-transform duration-700 hover:scale-105">
            Revolutionizing the Pet Industry
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            One-stop destination for pet products, services, and care.
          </p>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 justify-center">
            <Link
              to="/services"
              className="bg-white hover:bg-gray-100 text-primary px-8 py-3 rounded-md transition-all duration-300 font-semibold hover:shadow-lg transform hover:-translate-y-1"
            >
              Explore Our Services
            </Link>
            <a
              href="#download-app"
              className="bg-transparent hover:bg-white hover:bg-opacity-20 text-white border border-white px-8 py-3 rounded-md transition-all duration-300 font-semibold hover:shadow-lg transform hover:-translate-y-1"
            >
              Download the App
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary text-center mb-4">Why Choose Petzify?</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">Discover how our platform makes pet care easier and more enjoyable for you and your furry friends.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-gray-50 rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🛍️</div>
              <h3 className="text-xl font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors duration-300">All Pet Products</h3>
              <p className="text-gray-600">Find everything your pet needs in one place, from toys to accessories.</p>
              <div className="w-16 h-1 bg-primary mx-auto mt-4 group-hover:w-24 transition-all duration-300"></div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">✂️</div>
              <h3 className="text-xl font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors duration-300">Professional Services</h3>
              <p className="text-gray-600">Book grooming, training, and veterinary services with ease.</p>
              <div className="w-16 h-1 bg-primary mx-auto mt-4 group-hover:w-24 transition-all duration-300"></div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 shadow-md text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏠</div>
              <h3 className="text-xl font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors duration-300">Pet Care Solutions</h3>
              <p className="text-gray-600">Discover boarding options and care solutions for your pets.</p>
              <div className="w-16 h-1 bg-primary mx-auto mt-4 group-hover:w-24 transition-all duration-300"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Quotes Section */}
      <section className="py-20 bg-primary-light relative overflow-hidden">
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
                <a
                  href="https://apps.apple.com"
                  className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                >
                  <span>Download for iOS</span>
                </a>
                
                <a
                  href="https://play.google.com"
                  className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
                >
                  <span>Download for Android</span>
                </a>
              </div>
            </div>
            
            <div className="md:w-1/2 flex justify-center">
              <div className="w-64 h-96 bg-gradient-to-br from-primary-light to-secondary rounded-3xl flex items-center justify-center shadow-lg overflow-hidden relative transform transition-transform duration-500 hover:scale-105">
                <img 
                  src="https://images.unsplash.com/photo-1522276498395-f4f68f7f8454?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=749&q=80" 
                  alt="Pet app screenshot" 
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-30"></div>
                <span className="relative z-10 text-white text-lg font-bold">Petzify App</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 