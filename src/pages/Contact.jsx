import React, { useState } from 'react';

const faqs = [
  {
    id: 1,
    question: 'How do I download the Petzify app?',
    answer: 'The Petzify app is available on both iOS and Android platforms. You can download it from the App Store or Google Play Store by searching for "Petzify".'
  },
  {
    id: 2,
    question: 'What services does Petzify offer?',
    answer: 'Petzify offers a wide range of services including pet products, grooming, training, boarding, food & nutrition, and veterinary care.'
  },
  {
    id: 3,
    question: 'How do I book a service through Petzify?',
    answer: 'You can book any service directly through the Petzify app. Simply select the service you need, choose your preferred date and time, and confirm your booking.'
  },
  {
    id: 4,
    question: 'Is Petzify available in my area?',
    answer: 'Petzify is currently expanding its services across major cities. Please download the app to check service availability in your specific location.'
  },
  {
    id: 5,
    question: 'What payment methods are accepted?',
    answer: 'Petzify accepts all major credit cards, debit cards, and digital wallets for payments. All transactions are processed securely within the app.'
  }
];

const Contact = () => {
  const [openFaqId, setOpenFaqId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, you would process the form submission here
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="bg-primary-light py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">Contact Us</h1>
          <p className="text-xl text-primary-dark max-w-2xl mx-auto">
            Have questions or need support? We're here to help you with anything related to your pet's needs.
          </p>
        </div>
      </section>

      {/* Contact Form and Info */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Contact Information */}
            <div className="lg:w-1/3">
              <h2 className="text-2xl font-bold text-primary mb-6">Get in Touch</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-primary-dark mb-2">Email Us</h3>
                <p className="text-primary-dark">support@petzify.com</p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-primary-dark mb-2">Call Us</h3>
                <p className="text-primary-dark">+1 (800) PET-ZIFY</p>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-primary-dark mb-2">Our Office</h3>
                <p className="text-primary-dark">
                  123 Pet Street<br />
                  San Francisco, CA 94158<br />
                  United States
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-primary-dark mb-2">Connect With Us</h3>
                <div className="flex space-x-4">
                  <a 
                    href="https://facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://twitter.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 9.99 9.99 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.21 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="lg:w-2/3">
              <h2 className="text-2xl font-bold text-primary mb-6">Send Us a Message</h2>
              
              <form onSubmit={handleSubmit} className="bg-secondary p-8 rounded-lg shadow-md">
                <div className="mb-6">
                  <label htmlFor="name" className="block text-primary-dark text-sm font-semibold mb-2">Your Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="email" className="block text-primary-dark text-sm font-semibold mb-2">Your Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="subject" className="block text-primary-dark text-sm font-semibold mb-2">Subject</label>
                  <input 
                    type="text" 
                    id="subject" 
                    name="subject" 
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="message" className="block text-primary-dark text-sm font-semibold mb-2">Your Message</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows="5" 
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-colors duration-300"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-primary-light">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="max-w-3xl mx-auto">
            {faqs.map((faq) => (
              <div 
                key={faq.id}
                className="mb-4 bg-white rounded-lg shadow-md overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex justify-between items-center"
                  onClick={() => toggleFaq(faq.id)}
                >
                  <span className="font-semibold text-primary-dark">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-primary transition-transform duration-300 ${openFaqId === faq.id ? 'transform rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {openFaqId === faq.id && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <p className="text-primary-dark">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <p className="text-primary-dark mb-4">Still have questions?</p>
            <a 
              href="mailto:support@petzify.com" 
              className="text-primary hover:text-primary-dark font-semibold transition-colors duration-300"
            >
              Email our support team
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact; 