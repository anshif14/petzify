import React from 'react';

const About = () => {
  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute w-72 h-72 rounded-full bg-white opacity-10 -top-20 left-1/3 animate-pulse" style={{animationDuration: '3s'}}></div>
          <div className="absolute w-96 h-96 rounded-full bg-white opacity-5 -bottom-32 -right-32 animate-pulse" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 transform transition-transform duration-700 hover:scale-105">About Petzify</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Learn about our mission to revolutionize the pet industry and create a seamless experience for pet parents.
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-primary mb-6 relative">
                Our Story
                <div className="w-20 h-1 bg-primary mt-2"></div>
              </h2>
              <p className="text-gray-600 mb-4">
                Petzify was born from a simple observation: pet parents were spending too much time juggling between different services and products for their beloved companions. From finding trusted vets to sourcing quality food, the process was fragmented and frustrating.
              </p>
              <p className="text-gray-600 mb-4">
                Our founders, all passionate pet owners themselves, envisioned a unified platform that brings together all pet needs into one seamless experience. What started as a small idea quickly evolved into a comprehensive ecosystem designed to simplify the lives of pet parents.
              </p>
              <p className="text-gray-600">
                Today, Petzify stands as a testament to our commitment to pets and their owners. We've built a community where quality, trust, and convenience are the pillars of everything we do.
              </p>
            </div>
            
            <div className="lg:w-1/2">
              <div className="rounded-lg overflow-hidden shadow-xl transform transition-all duration-500 hover:scale-105 hover:shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1624&q=80" 
                  alt="Our Team" 
                  className="w-full h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="py-20 bg-primary-light relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-80 h-80 rounded-full bg-primary opacity-5 -top-40 -left-20"></div>
          <div className="absolute w-64 h-64 rounded-full bg-primary opacity-10 bottom-10 right-1/4"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-primary mb-6 relative">
                Our Mission
                <div className="w-20 h-1 bg-primary mt-2"></div>
              </h2>
              <p className="text-gray-600 mb-4">
                At Petzify, our mission is to revolutionize the pet industry by creating a connected ecosystem that places the wellbeing of pets at its center. We believe that every pet deserves the best care, and every pet parent deserves convenience and peace of mind.
              </p>
              <p className="text-gray-600 mb-4">
                We aim to bridge the gap between various pet services and products, offering a unified platform where quality is never compromised. Through technology, we're making pet care more accessible, efficient, and enjoyable.
              </p>
              <p className="text-gray-600">
                Our vision extends beyond commerce—we're building a community of passionate pet lovers, sharing knowledge, experiences, and support to enhance the lives of pets everywhere.
              </p>
            </div>
            
            <div className="lg:w-1/2">
              <div className="rounded-lg overflow-hidden shadow-xl transform transition-all duration-500 hover:scale-105 hover:shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80" 
                  alt="Our Mission" 
                  className="w-full h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary to-transparent opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary text-center mb-4">Our Core Values</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">The principles that guide everything we do at Petzify.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg shadow-md transform transition-all duration-300 hover:-translate-y-2 hover:shadow-lg group">
              <div className="text-4xl mb-4 text-primary bg-primary-light w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">🐾</div>
              <h3 className="text-xl font-semibold text-primary mb-3 group-hover:text-primary-dark transition-colors duration-300">Pet-First Approach</h3>
              <p className="text-gray-600">Every decision we make prioritizes the health, safety, and happiness of the pets we serve.</p>
              <div className="w-12 h-0.5 bg-primary mt-4 group-hover:w-20 transition-all duration-300"></div>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-lg shadow-md transform transition-all duration-300 hover:-translate-y-2 hover:shadow-lg group">
              <div className="text-4xl mb-4 text-primary bg-primary-light w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">🌟</div>
              <h3 className="text-xl font-semibold text-primary mb-3 group-hover:text-primary-dark transition-colors duration-300">Quality & Trust</h3>
              <p className="text-gray-600">We carefully vet all products and service providers to ensure only the best for your pets.</p>
              <div className="w-12 h-0.5 bg-primary mt-4 group-hover:w-20 transition-all duration-300"></div>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-lg shadow-md transform transition-all duration-300 hover:-translate-y-2 hover:shadow-lg group">
              <div className="text-4xl mb-4 text-primary bg-primary-light w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">🤝</div>
              <h3 className="text-xl font-semibold text-primary mb-3 group-hover:text-primary-dark transition-colors duration-300">Community</h3>
              <p className="text-gray-600">We're building a supportive network of pet parents, experts, and enthusiasts who share knowledge and experiences.</p>
              <div className="w-12 h-0.5 bg-primary mt-4 group-hover:w-20 transition-all duration-300"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary-light relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full bg-primary opacity-5 -top-40 right-1/3"></div>
          <div className="absolute w-64 h-64 rounded-full bg-primary opacity-10 -bottom-20 -left-20"></div>
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl font-bold text-primary mb-6">Join the Petzify Family</h2>
          <p className="text-lg text-gray-700 mb-8 max-w-3xl mx-auto">
            Be a part of our growing community of pet lovers. Download the app today and discover a whole new way to care for your pets.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://apps.apple.com"
              className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-md transition-all duration-300 inline-block hover:shadow-lg transform hover:-translate-y-1"
            >
              Download for iOS
            </a>
            <a
              href="https://play.google.com"
              className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-md transition-all duration-300 inline-block hover:shadow-lg transform hover:-translate-y-1"
            >
              Download for Android
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About; 