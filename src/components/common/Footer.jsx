import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import logoImage from '../../assets/images/logo.png';
import logoText from '../../assets/images/logo_white_text.png';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-primary-dark to-primary text-white py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-white opacity-5 -top-40 -left-40"></div>
        <div className="absolute w-64 h-64 rounded-full bg-white opacity-5 bottom-0 right-20"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="transform transition duration-500 hover:translate-y-[-8px]">
            <div className="flex items-center mb-4">
              {/*<img src={logoImage} alt="Petzify Logo" className="h-10 w-auto mr-2" />*/}
              <img src={logoText} alt="Petzify" className="h-8 w-auto" />
            </div>
            <p className="mb-4">
              Making pet care simple and accessible for everyone. Connect with pet lovers and providers in your area.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-secondary-light transition-all duration-300 transform hover:scale-125">
                <FaFacebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-secondary-light transition-all duration-300 transform hover:scale-125">
                <FaTwitter size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-secondary-light transition-all duration-300 transform hover:scale-125">
                <FaInstagram size={20} />
              </a>
              <a href="https://www.linkedin.com/company/petzifyinofficial/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="hover:text-secondary-light transition-all duration-300 transform hover:scale-125">
                <FaLinkedin size={20} />
              </a>
            </div>
          </div>
          
          <div className="transform transition duration-500 hover:translate-y-[-8px]">
            <h3 className="text-xl font-bold mb-4 relative inline-block">
              Quick Links
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary-light"></div>
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Services
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="transform transition duration-500 hover:translate-y-[-8px]">
            <h3 className="text-xl font-bold mb-4 relative inline-block">
              Services
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary-light"></div>
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services/pet-sitting" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Pet Sitting
                </Link>
              </li>
              <li>
                <Link to="/services/dog-walking" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Dog Walking
                </Link>
              </li>
              <li>
                <Link to="/services/grooming" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Pet Grooming
                </Link>
              </li>
              <li>
                <Link to="/services/veterinary" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Veterinary Services
                </Link>
              </li>
              <li>
                <Link to="/services/training" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Pet Training
                </Link>
              </li>
              <li>
                <Link to="/services/transportation" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Pet Transportation
                </Link>
              </li>
              <li>
                <Link to="/services/mating" className="hover:text-secondary-light transition-colors duration-300 flex items-center group">
                  <span className="w-0 h-0.5 bg-secondary-light mr-0 transition-all duration-300 group-hover:w-2 group-hover:mr-2"></span>
                  Pet Mating
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="transform transition duration-500 hover:translate-y-[-8px]">
            <h3 className="text-xl font-bold mb-4 relative inline-block">
              Contact Us
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary-light"></div>
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-secondary-light mr-2">📍</span>
                Kochi, Kerala, India
              </li>
              <li className="flex items-center">
                <span className="text-secondary-light mr-2">📞</span>
                Phone: +91 94976 72523
              </li>
              <li className="flex items-center">
                <span className="text-secondary-light mr-2">✉️</span>

                <a href="mailto:petzify.business@gmail.com">
                  Email: petzify.business@gmail.com
                </a>


              </li>
              <li className="flex items-center">
                <span className="text-secondary-light mr-2">💼</span>
                <a href="https://www.linkedin.com/company/petzifyinofficial/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="hover:text-secondary-light transition-colors duration-300">
                  LinkedIn: @petzifyinofficial
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white border-opacity-20 mt-8 pt-6 text-center">
          <p>© {new Date().getFullYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 