import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        const testimonialsQuery = query(
          collection(db, 'testimonials'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        
        const querySnapshot = await getDocs(testimonialsQuery);
        
        if (querySnapshot.empty) {
          // If no testimonials exist in the database, use fallback data
          setTestimonials(getFallbackTestimonials());
        } else {
          const fetchedTestimonials = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTestimonials(fetchedTestimonials);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
        setError("Failed to load testimonials. Using default testimonials instead.");
        // Use fallback data in case of error
        setTestimonials(getFallbackTestimonials());
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Fallback testimonials data in case of empty collection or error
  const getFallbackTestimonials = () => [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Dog Owner",
      image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
      content: "Petzify has completely transformed how I care for my dogs. Finding reliable dog walkers used to be so stressful, but now it's just a few taps away!",
      rating: 5
    },
    {
      id: 2,
      name: "Michael Rodriguez",
      role: "Cat Owner",
      image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80",
      content: "As someone with three cats, finding quality products and care has never been easier. The veterinary teleconsultation feature saved us during the pandemic.",
      rating: 5
    },
    {
      id: 3,
      name: "Emily Chen",
      role: "Pet Shop Owner",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1361&q=80",
      content: "Being a partner on the Petzify platform has grown my small pet supply business exponentially. The customer base and support are unmatched!",
      rating: 5
    }
  ];

  // Generate star rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= (rating || 5) ? "text-primary" : "text-gray-300"}>
          ★
        </span>
      );
    }
    return <div className="flex">{stars}</div>;
  };

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">What Our Users Say</h2>
          <p className="text-gray-600 mb-8">Loading testimonials...</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold text-primary text-center mb-4">What Our Users Say</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Discover why pet owners and care providers love Petzify.
        </p>
        
        {error && (
          <div className="text-yellow-600 text-center mb-8">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-gray-50 rounded-lg p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center mb-4">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-primary"
                />
                <div>
                  <h3 className="text-lg font-semibold text-primary">{testimonial.name}</h3>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-600 italic">{testimonial.content}</p>
              <div className="mt-4 flex">
                {renderStars(testimonial.rating)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection; 