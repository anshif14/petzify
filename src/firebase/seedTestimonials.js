import { db } from './config';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

// Initial testimonials data
const initialTestimonials = [
  {
    name: "Sarah Johnson",
    role: "Dog Owner",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    content: "Petzify has completely transformed how I care for my dogs. Finding reliable dog walkers used to be so stressful, but now it's just a few taps away!",
    rating: 5
  },
  {
    name: "Michael Rodriguez",
    role: "Cat Owner",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80",
    content: "As someone with three cats, finding quality products and care has never been easier. The veterinary teleconsultation feature saved us during the pandemic.",
    rating: 5
  },
  {
    name: "Emily Chen",
    role: "Pet Shop Owner",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1361&q=80",
    content: "Being a partner on the Petzify platform has grown my small pet supply business exponentially. The customer base and support are unmatched!",
    rating: 5
  },
  {
    name: "David Wilson",
    role: "Bird Enthusiast",
    image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1528&q=80",
    content: "Finding specialized bird supplies used to be a challenge, but Petzify has everything my feathered friends need. The avian vet consultation feature is superb!",
    rating: 4
  },
  {
    name: "Sophia Patel",
    role: "Veterinarian",
    image: "https://images.unsplash.com/photo-1563306406-e66174fa3787?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80",
    content: "As a vet, I'm impressed with Petzify's commitment to animal welfare. The platform connects pet parents with qualified professionals and quality products.",
    rating: 5
  }
];

/**
 * Initialize testimonials in Firestore
 * Only adds testimonials if they don't already exist
 */
export const initializeTestimonials = async () => {
  try {
    // Check if testimonials collection has any documents
    const testimonialsCollection = collection(db, 'testimonials');
    const existingTestimonials = await getDocs(testimonialsCollection);
    
    if (existingTestimonials.empty) {
      console.log('No testimonials found. Initializing testimonials collection...');
      
      // Add each testimonial with a server timestamp
      const addedTestimonials = await Promise.all(
        initialTestimonials.map(async (testimonial) => {
          const docRef = await addDoc(testimonialsCollection, {
            ...testimonial,
            createdAt: serverTimestamp()
          });
          return docRef.id;
        })
      );
      
      console.log(`Successfully added ${addedTestimonials.length} testimonials.`);
      return addedTestimonials;
    } else {
      console.log('Testimonials collection already initialized.');
      return [];
    }
  } catch (error) {
    console.error('Error initializing testimonials:', error);
    throw error;
  }
};

export default initializeTestimonials; 