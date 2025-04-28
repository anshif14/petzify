import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { toast } from 'react-toastify';
import './BoardingAdminDashboard.css'; // Import CSS file for custom styles
import { FiLoader } from 'react-icons/fi';
import { 
  FiCalendar, 
  FiClock, 
  FiCheck, 
  FiX, 
  FiStar, 
  FiUsers, 
  FiDollarSign,
  FiActivity,
  FiMessageSquare
} from 'react-icons/fi';
import { sendEmail } from '../../../utils/emailService';
import ReviewsManager from './ReviewsManager';

const BoardingAdminDashboard = ({ adminData }) => {
  // State for boarding centers data
  const [boardingCenters, setBoardingCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // State for add center form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCenter, setNewCenter] = useState({
    centerName: '',
    address: '',
    pricePerDay: '',
    petTypes: [],
    services: [],
    operatingDays: [],
    imageUrl: '',
    description: '',
    isAvailable: true
  });

  // State for edit center form
  const [editingCenter, setEditingCenter] = useState(null);
  const [editFormData, setEditFormData] = useState({
    centerName: '',
    address: '',
    city: '',
    pricePerDay: '',
    capacity: '',
    description: '',
    openingTime: '',
    closingTime: '',
    operatingDays: [],
    petTypes: [],
    imageUrl: '',
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    centerName: '',
    address: '',
    city: '',
    pricePerDay: '',
    capacity: '',
    imageUrl: '',
    openingTime: '',
    closingTime: '',
    description: '',
    petTypes: [],
    services: [],
    operatingDays: [],
  });
  const [centerAvailability, setCenterAvailability] = useState({});

  // State for center details view
  const [viewingCenter, setViewingCenter] = useState(null);

  // State for bookings management
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);
  
  // State for dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalBookings: 0,
    upcomingBookings: 0,
    todayBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    averageRating: 0
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [bookingUpdateLoading, setBookingUpdateLoading] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState(null);
  
  // State for reviews and review requests
  const [reviewRequests, setReviewRequests] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Fetch boarding centers data
  useEffect(() => {
    const fetchBoardingCenters = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Admin data:", adminData);
        
        if (!adminData?.email) {
          setError("Admin email not found. Please check your profile.");
          setLoading(false);
          return;
        }
        
        let centers = [];
        
        // Check if admin has a direct boardingCenterId reference (simplest approach)
        if (adminData.boardingCenterId) {
          console.log("Found boardingCenterId in admin data:", adminData.boardingCenterId);
          const centerRef = doc(db, 'petBoardingCenters', adminData.boardingCenterId);
          const centerSnap = await getDoc(centerRef);
          
          if (centerSnap.exists()) {
            const data = centerSnap.data();
            centers.push({
              id: centerSnap.id,
              ...data,
              name: data.centerName || '',
              pricePerDay: data.pricePerDay || 0,
              isAvailable: data.isAvailable !== false
            });
            console.log("Found center by ID:", centers);
          } else {
            console.log("No center found with ID:", adminData.boardingCenterId);
          }
        }
        
        // If no center found by ID, fallback to email search
        if (centers.length === 0) {
          console.log("Looking for centers with email:", adminData.email);
          const centersQuery = query(
            collection(db, 'petBoardingCenters'),
            where('email', '==', adminData.email)
          );
          
          const querySnapshot = await getDocs(centersQuery);
          console.log("Centers found by email:", querySnapshot.size);
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            centers.push({
              id: doc.id,
              ...data,
              name: data.centerName || '',
              pricePerDay: data.pricePerDay || 0,
              isAvailable: data.isAvailable !== false
            });
          });
        }
        
        console.log("Final centers to display:", centers);
        setBoardingCenters(centers);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching boarding centers:", err);
        setError(`Failed to load boarding centers: ${err.message}`);
        setLoading(false);
      }
    };

    if (adminData) {
      console.log("Fetching boarding centers for admin:", adminData);
      fetchBoardingCenters();
    } else {
      console.log("Admin data not available yet");
      setLoading(false);
    }
  }, [adminData]);

  // Toggle availability of a boarding center
  const toggleAvailability = async (centerId, currentStatus) => {
    try {
      const centerRef = doc(db, 'petBoardingCenters', centerId);
      await updateDoc(centerRef, {
        isAvailable: !currentStatus
      });
      
      // Update local state
      setBoardingCenters(prev => 
        prev.map(center => 
          center.id === centerId 
            ? { ...center, isAvailable: !currentStatus } 
            : center
        )
      );
      
      toast.success(`Center ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      console.error("Error toggling availability:", err);
      toast.error("Failed to update center status");
    }
  };

  // Handle input change for new center form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCenter(prev => ({ ...prev, [name]: value }));
  };

  // Handle checkbox change for arrays (petTypes, services, operatingDays)
  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target;
    setNewCenter(prev => {
      if (checked) {
        return { ...prev, [field]: [...prev[field], value] };
      } else {
        return { ...prev, [field]: prev[field].filter(item => item !== value) };
      }
    });
  };

  // Submit new center
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate form
      if (!newCenter.centerName || !newCenter.address || !newCenter.pricePerDay) {
        toast.error("Please fill all required fields");
        return;
      }

      // Add new boarding center to Firestore
      const centerData = {
        ...newCenter,
        email: adminData.email,
        perDayCharge: Number(newCenter.pricePerDay),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminCreated: true,
        city: "Kochi", // Default city, update as needed
        capacity: "10", // Default capacity, update as needed
        openingTime: "09:00", // Default opening time
        closingTime: "20:30", // Default closing time
        discounts: "",
        galleryImageURLs: newCenter.imageUrl ? [newCenter.imageUrl] : []
      };
      
      console.log("Adding new center with data:", centerData);
      
      const docRef = await addDoc(collection(db, 'petBoardingCenters'), centerData);
      console.log("Center added with ID:", docRef.id);
      
      // Update local state
      setBoardingCenters(prev => [
        ...prev, 
        { 
          id: docRef.id,
          ...centerData,
          name: centerData.centerName // For display purposes
        }
      ]);
      
      // Reset form and hide it
      setNewCenter({
        centerName: '',
        address: '',
        pricePerDay: '',
        petTypes: [],
        services: [],
        operatingDays: [],
        imageUrl: '',
        description: '',
        isAvailable: true
      });
      setShowAddForm(false);
      toast.success("Boarding center added successfully!");
    } catch (err) {
      console.error("Error adding boarding center:", err);
      toast.error("Failed to add boarding center: " + err.message);
    }
  };

  // Edit center functionality
  const handleEditClick = (center) => {
    setEditingCenter(center);
    setEditFormData({
      centerName: center.centerName || '',
      address: center.address || '',
      city: center.city || '',
      pricePerDay: center.perDayCharge || center.pricePerDay || '',
      capacity: center.capacity || '',
      description: center.description || '',
      openingTime: center.openingTime || '',
      closingTime: center.closingTime || '',
      operatingDays: Array.isArray(center.operatingDays) ? center.operatingDays : [],
      petTypes: Array.isArray(center.petTypes) ? center.petTypes : [],
      imageUrl: center.galleryImageURLs && center.galleryImageURLs.length > 0 ? center.galleryImageURLs[0] : (center.imageUrl || ''),
    });
  };

  // Fetch bookings for the boarding center
  const fetchBookings = async () => {
    if (!adminData || boardingCenters.length === 0) return;
    
    try {
      setBookingsLoading(true);
      setBookingsError(null);
      
      const centerIds = boardingCenters.map(center => center.id);
      
      // Query Firestore for bookings that match any of the center IDs
      const bookingsQuery = query(
        collection(db, 'petBoardingBookings'),
        where('centerId', 'in', centerIds)
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const bookingsList = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Safely handle createdAt date
          bookingDate: data.createdAt ? 
            (typeof data.createdAt === 'object' && data.createdAt.seconds ? 
              data.createdAt : new Date()) : 
            new Date(),
          // Safely handle dateFrom
          dateFrom: data.dateFrom ? 
            (typeof data.dateFrom === 'object' && data.dateFrom.seconds ? 
              data.dateFrom : data.dateFrom) : 
            null,
          // Safely handle dateTo
          dateTo: data.dateTo ? 
            (typeof data.dateTo === 'object' && data.dateTo.seconds ? 
              data.dateTo : data.dateTo) : 
            null
        };
      });
      
      console.log("Fetched bookings:", bookingsList);
      setBookings(bookingsList);
      
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setBookingsError("Failed to load bookings. Please try again.");
    } finally {
      setBookingsLoading(false);
    }
  };
  
  // Load bookings when the active section is 'bookings'
  useEffect(() => {
    if (activeSection === 'bookings') {
      fetchBookings();
    }
  }, [activeSection, boardingCenters]);

  // Function to load dashboard data
  const loadDashboardData = async () => {
    if (!adminData || boardingCenters.length === 0) return;
    
    try {
      setDashboardLoading(true);
      
      const centerIds = boardingCenters.map(center => center.id);
      
      // Query all bookings for the centers
      const bookingsQuery = query(
        collection(db, 'petBoardingBookings'),
        where('centerId', 'in', centerIds)
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const allBookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          bookingDate: data.createdAt ? 
            (typeof data.createdAt === 'object' && data.createdAt.seconds ? 
              new Date(data.createdAt.seconds * 1000) : new Date()) : 
            new Date(),
          dateFrom: data.dateFrom ? 
            (typeof data.dateFrom === 'object' && data.dateFrom.seconds ? 
              new Date(data.dateFrom.seconds * 1000) : new Date(data.dateFrom)) : 
            null,
          dateTo: data.dateTo ? 
            (typeof data.dateTo === 'object' && data.dateTo.seconds ? 
              new Date(data.dateTo.seconds * 1000) : new Date(data.dateTo)) : 
            null
        };
      });
      
      // Get today's date (start and end)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Categorize bookings
      const upcoming = [];
      const todayB = [];
      const past = [];
      let totalRevenue = 0;
      let completedCount = 0;
      let cancelledCount = 0;
      
      allBookings.forEach(booking => {
        // Calculate booking revenue
        if (booking.status === 'completed' && booking.totalAmount) {
          totalRevenue += parseFloat(booking.totalAmount);
          completedCount++;
        }
        
        if (booking.status === 'cancelled') {
          cancelledCount++;
        }
        
        // Categorize by date
        if (booking.dateFrom) {
          if (booking.dateFrom > endOfDay) {
            // Upcoming bookings (start date is in the future)
            upcoming.push(booking);
          } else if (booking.dateFrom <= endOfDay && booking.dateFrom >= startOfDay) {
            // Today's bookings (start date is today)
            todayB.push(booking);
          } else if (booking.dateFrom < startOfDay) {
            // Past bookings (start date is in the past)
            past.push(booking);
          }
        }
      });
      
      // Sort bookings by date
      upcoming.sort((a, b) => a.dateFrom - b.dateFrom);
      todayB.sort((a, b) => a.dateFrom - b.dateFrom);
      past.sort((a, b) => b.dateFrom - a.dateFrom); // Past bookings newest first
      
      // Limit to latest 5 for display
      const recentUpcoming = upcoming.slice(0, 5);
      const recentToday = todayB.slice(0, 5);
      const recentPast = past.slice(0, 5);
      
      // Query reviews for the centers
      try {
        const reviewsQuery = query(
          collection(db, 'boardingReviews'),
          where('centerId', 'in', centerIds),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviews = reviewsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? 
              (typeof data.createdAt === 'object' && data.createdAt.seconds ? 
                new Date(data.createdAt.seconds * 1000) : new Date()) : 
              new Date()
          };
        });
        
        // Also fetch review requests sent to customers
        const reviewRequestsQuery = query(
          collection(db, 'reviewRequests'),
          where('centerId', 'in', centerIds),
          orderBy('sentAt', 'desc'),
          limit(20)
        );
        
        const reviewRequestsSnapshot = await getDocs(reviewRequestsQuery);
        const requests = reviewRequestsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            sentAt: data.sentAt ? 
              (typeof data.sentAt === 'object' && data.sentAt.seconds ? 
                new Date(data.sentAt.seconds * 1000) : new Date()) : 
              new Date()
          };
        });
        
        setReviewRequests(requests);
        
        // Calculate average rating
        const totalRatings = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        const averageRating = reviews.length > 0 ? totalRatings / reviews.length : 0;
        
        setRecentReviews(reviews);
        
        // Update dashboard stats
        setDashboardStats({
          totalBookings: allBookings.length,
          upcomingBookings: upcoming.length,
          todayBookings: todayB.length,
          completedBookings: completedCount,
          cancelledBookings: cancelledCount,
          totalRevenue: totalRevenue,
          averageRating: averageRating
        });
        
      } catch (error) {
        console.error("Error fetching reviews:", error);
        // If reviews fail, still set the other data
        setDashboardStats({
          totalBookings: allBookings.length,
          upcomingBookings: upcoming.length,
          todayBookings: todayB.length,
          completedBookings: completedCount,
          cancelledBookings: cancelledCount,
          totalRevenue: totalRevenue,
          averageRating: 0
        });
      }
      
      // Update state
      setUpcomingBookings(recentUpcoming);
      setTodayBookings(recentToday);
      setPastBookings(recentPast);
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setDashboardLoading(false);
    }
  };
  
  // Function to fetch reviews for a specific center or all centers
  const fetchReviews = async (centerId = null) => {
    if (!adminData || boardingCenters.length === 0) return;
    
    try {
      setReviewsLoading(true);
      
      let reviewsQuery;
      
      if (centerId) {
        // Fetch reviews for a specific center
        reviewsQuery = query(
          collection(db, 'boardingReviews'),
          where('centerId', '==', centerId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } else {
        // Fetch reviews for all centers managed by this admin
        const centerIds = boardingCenters.map(center => center.id);
        
        reviewsQuery = query(
          collection(db, 'boardingReviews'),
          where('centerId', 'in', centerIds),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }
      
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviews = reviewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? 
            (typeof data.createdAt === 'object' && data.createdAt.seconds ? 
              new Date(data.createdAt.seconds * 1000) : new Date()) : 
            new Date()
        };
      });
      
      return reviews;
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
      return [];
    } finally {
      setReviewsLoading(false);
    }
  };
  
  // Load dashboard data when the dashboard section is active
  useEffect(() => {
    if (activeSection === 'dashboard' && boardingCenters.length > 0) {
      loadDashboardData();
    }
  }, [activeSection, boardingCenters]);

  // Function to update booking status
  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      setBookingUpdateLoading(true);
      setProcessingBookingId(bookingId);
      
      // Get the booking data
      const bookingRef = doc(db, 'petBoardingBookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error("Booking not found");
      }
      
      const bookingData = bookingDoc.data();
      
      // Update the booking status
      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      const centerData = boardingCenters.find(center => center.id === bookingData.centerId) || {};
      const logoUrl = "https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2FPetzify%20Logo-05%20(3).png?alt=media&token=d1cf79b7-2ae1-443b-8390-52938a60198d";
      
      // Format dates for email
      const formattedDateFrom = formatDate(
        bookingData.dateFrom?.seconds ? 
        new Date(bookingData.dateFrom.seconds * 1000) : 
        new Date(bookingData.dateFrom)
      );
      
      const formattedDateTo = formatDate(
        bookingData.dateTo?.seconds ? 
        new Date(bookingData.dateTo.seconds * 1000) : 
        new Date(bookingData.dateTo)
      );
      
      // If status is confirmed, send confirmation emails
      if (newStatus === 'confirmed') {
        // ... existing code for confirmed emails ...
        
        // 4. Schedule a rating request email to be sent after the booking check-in date
        try {
          const checkInDate = bookingData.dateFrom?.seconds ? 
            new Date(bookingData.dateFrom.seconds * 1000) : 
            new Date(bookingData.dateFrom);
            
          if (checkInDate && bookingData.userEmail) {
            // Store the rating request to be sent a day after check-in
            await addDoc(collection(db, 'scheduledEmails'), {
              to: bookingData.userEmail,
              subject: 'How was your Pet Boarding experience? Leave a rating!',
              bookingId: bookingId,
              centerId: bookingData.centerId,
              centerName: centerData.centerName,
              userName: bookingData.userName,
              scheduledFor: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000), // 1 day after check-in
              type: 'ratingRequest',
              status: 'pending',
              createdAt: serverTimestamp()
            });
            
            // For immediate testing, also send a rating request right away
            await sendRatingRequestEmail(bookingData, bookingId, centerData);
            
            console.log("Rating request email scheduled");
          }
        } catch (error) {
          console.error("Error scheduling rating request email:", error);
        }
        
        toast.success("Booking confirmed and notifications sent!");
      } 
      // If status is completed, send a completion and review request email
      else if (newStatus === 'completed') {
        try {
          if (bookingData.userEmail) {
            // Send completion email with review request
            await sendEmail({
              to: bookingData.userEmail,
              subject: 'Your Pet Boarding Stay is Complete - Share Your Experience!',
              html: `
                <html>
                <body style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.5;">
                  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
                    <img src="${logoUrl}" alt="Petzify Logo" style="max-width: 150px; margin-bottom: 10px;" />
                    <h2 style="color: #4f46e5; margin: 0;">Your Pet Boarding is Complete!</h2>
                  </div>
                  
                  <div style="padding: 20px 0;">
                    <p>Dear ${bookingData.userName || 'Customer'},</p>
                    <p>Thank you for choosing <strong>${centerData.centerName || 'our boarding center'}</strong> for your pet's stay from ${formattedDateFrom} to ${formattedDateTo}.</p>
                    <p>We hope your pet had a wonderful time with us and returned home happy and healthy!</p>
                    
                    <div style="background-color: #f9fafb; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
                      <h3 style="margin-top: 0; color: #4f46e5;">Your Feedback Matters!</h3>
                      <p>We'd love to hear about your experience. Please take a moment to rate our service and share your thoughts.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">How would you rate your overall experience?</p>
                      <div style="margin: 20px 0;">
                        <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=5" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                          <div style="background: #4f46e5; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">5</div>
                          <div style="margin-top: 5px; font-size: 12px;">Excellent</div>
                        </a>
                        <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=4" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                          <div style="background: #818cf8; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">4</div>
                          <div style="margin-top: 5px; font-size: 12px;">Good</div>
                        </a>
                        <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=3" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                          <div style="background: #93c5fd; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">3</div>
                          <div style="margin-top: 5px; font-size: 12px;">Average</div>
                        </a>
                        <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=2" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                          <div style="background: #fcd34d; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">2</div>
                          <div style="margin-top: 5px; font-size: 12px;">Fair</div>
                        </a>
                        <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=1" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                          <div style="background: #f87171; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">1</div>
                          <div style="margin-top: 5px; font-size: 12px;">Poor</div>
                        </a>
                      </div>
                      <p style="margin-top: 20px;">
                        <a href="https://petzify-49ed4.web.app/review-boarding?bookingId=${bookingId}&centerId=${bookingData.centerId}" 
                          style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                          Write a Review
                        </a>
                      </p>
                    </div>
                    
                    <p>Your feedback helps us improve our services and assists other pet owners in making informed decisions.</p>
                    <p>Thank you again for your trust. We hope to see you and your furry friend again soon!</p>
                    
                    <p style="margin-top: 20px;">Best regards,</p>
                    <p>The ${centerData.centerName || 'Petzify'} Team</p>
                  </div>
                  
                  <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #666; font-size: 12px;">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                  </div>
                </body>
                </html>
              `
            });
            
            // Create a record for admin to track review requests
            await addDoc(collection(db, 'reviewRequests'), {
              bookingId: bookingId,
              centerId: bookingData.centerId,
              centerName: centerData.centerName,
              userEmail: bookingData.userEmail,
              userName: bookingData.userName,
              dateFrom: bookingData.dateFrom,
              dateTo: bookingData.dateTo,
              sentAt: serverTimestamp(),
              status: 'sent',
              responded: false
            });
            
            console.log("Completion and review request email sent successfully");
          }
          
          toast.success("Booking marked as completed and review request sent!");
        } catch (error) {
          console.error("Error sending completion email:", error);
          toast.error("Booking marked as completed but failed to send email");
        }
      } else {
        toast.success(`Booking ${newStatus} successfully!`);
      }
      
      // Update local state to reflect the change
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        )
      );
      
      // Refresh dashboard data if we're on the dashboard
      if (activeSection === 'dashboard') {
        loadDashboardData();
      }
      
    } catch (err) {
      console.error("Error updating booking status:", err);
      toast.error("Failed to update booking status");
    } finally {
      setBookingUpdateLoading(false);
      setProcessingBookingId(null);
    }
  };
  
  // Function to send a rating request email
  const sendRatingRequestEmail = async (bookingData, bookingId, centerData) => {
    if (!bookingData.userEmail) return;
    
    const logoUrl = "https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2FPetzify%20Logo-05%20(3).png?alt=media&token=d1cf79b7-2ae1-443b-8390-52938a60198d";
    
    try {
      await sendEmail({
        to: bookingData.userEmail,
        subject: 'How was your Pet Boarding experience? Leave a rating!',
        html: `
          <html>
          <body style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.5;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
              <img src="${logoUrl}" alt="Petzify Logo" style="max-width: 150px; margin-bottom: 10px;" />
              <h2 style="color: #4f46e5; margin: 0;">Rate Your Experience</h2>
            </div>
            
            <div style="padding: 20px 0;">
              <p>Dear ${bookingData.userName || 'Customer'},</p>
              <p>Thank you for choosing <strong>${centerData.centerName || 'our boarding center'}</strong> for your pet's stay.</p>
              <p>We hope your pet had a comfortable and enjoyable time with us. Your feedback is valuable and helps us improve our services.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">How would you rate your experience?</p>
                <div style="margin: 20px 0;">
                  <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=5" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                    <div style="background: #4f46e5; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">5</div>
                    <div style="margin-top: 5px; font-size: 12px;">Excellent</div>
                  </a>
                  <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=4" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                    <div style="background: #818cf8; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">4</div>
                    <div style="margin-top: 5px; font-size: 12px;">Good</div>
                  </a>
                  <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=3" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                    <div style="background: #93c5fd; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">3</div>
                    <div style="margin-top: 5px; font-size: 12px;">Average</div>
                  </a>
                  <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=2" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                    <div style="background: #fcd34d; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">2</div>
                    <div style="margin-top: 5px; font-size: 12px;">Fair</div>
                  </a>
                  <a href="https://petzify-49ed4.web.app/rate-booking?bookingId=${bookingId}&rating=1" style="display: inline-block; margin: 0 5px; text-decoration: none;">
                    <div style="background: #f87171; color: white; width: 40px; height: 40px; line-height: 40px; text-align: center; border-radius: 50%; font-weight: bold;">1</div>
                    <div style="margin-top: 5px; font-size: 12px;">Poor</div>
                  </a>
                </div>
                <p style="margin-top: 20px;">
                  <a href="https://petzify-49ed4.web.app/review-boarding?bookingId=${bookingId}&centerId=${bookingData.centerId}" 
                     style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    Write a Review
                  </a>
                </p>
              </div>
              
              <p>Your feedback helps other pet owners make informed decisions and assists us in maintaining the highest quality of service.</p>
              <p>Thank you for being a valued customer!</p>
              
              <p style="margin-top: 20px;">Best regards,</p>
              <p>The Petzify Team</p>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #666; font-size: 12px;">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Petzify. All rights reserved.</p>
            </div>
          </body>
          </html>
        `
      });
      console.log("Rating request email sent successfully");
    } catch (error) {
      console.error("Error sending rating request email:", error);
    }
  };

  // Helper function to format dates
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firestore timestamp objects
      if (date && typeof date === 'object' && date.seconds) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(new Date(date.seconds * 1000));
      }
      
      // Handle string dates or invalid date objects
      if (date instanceof Date && !isNaN(date)) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);
      }
      
      // If it's a string, try to convert it to a date
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(parsedDate);
        }
      }
      
      // If we couldn't format it, return N/A
      return 'N/A';
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return 'N/A';
    }
  };

  // Delete center functionality
  const handleDelete = async (centerId) => {
    if (window.confirm("Are you sure you want to delete this boarding center? This action cannot be undone.")) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, "petBoardingCenters", centerId));
        
        // Update local state
        setBoardingCenters(prev => prev.filter(center => center.id !== centerId));
        
        toast.success("Boarding center deleted successfully!");
      } catch (error) {
        console.error("Error deleting boarding center:", error);
        toast.error("Failed to delete boarding center");
      } finally {
        setLoading(false);
      }
    }
  };

  // View center data functionality
  const viewCenterData = (center) => {
    setViewingCenter(center);
    console.log("Viewing Center Data:", center);
  };

  const closeViewDetails = () => {
    setViewingCenter(null);
  };

  const closeEditForm = () => {
    setEditingCenter(null);
    setEditFormData({
      centerName: '',
      address: '',
      city: '',
      pricePerDay: '',
      capacity: '',
      description: '',
      openingTime: '',
      closingTime: '',
      operatingDays: [],
      petTypes: [],
      imageUrl: '',
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    if (checked) {
      setEditFormData({
        ...editFormData,
        [name]: [...(editFormData[name] || []), value]
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: (editFormData[name] || []).filter(item => item !== value)
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingCenter) return;
    
    try {
      setLoading(true);
      
      const centerRef = doc(db, "petBoardingCenters", editingCenter.id);
      
      await updateDoc(centerRef, {
        centerName: editFormData.centerName,
        address: editFormData.address,
        city: editFormData.city,
        perDayCharge: Number(editFormData.pricePerDay),
        capacity: Number(editFormData.capacity),
        description: editFormData.description,
        openingTime: editFormData.openingTime,
        closingTime: editFormData.closingTime,
        operatingDays: editFormData.operatingDays,
        petTypes: editFormData.petTypes,
        galleryImageURLs: editFormData.imageUrl ? [editFormData.imageUrl] : [],
        updatedAt: serverTimestamp(),
      });
      
      toast.success("Boarding center updated successfully!");
      
      // Refresh boarding centers
      const updatedBoardingCenters = boardingCenters.map(center => {
        if (center.id === editingCenter.id) {
          return {
            ...center,
            centerName: editFormData.centerName,
            address: editFormData.address,
            city: editFormData.city,
            perDayCharge: Number(editFormData.pricePerDay),
            capacity: Number(editFormData.capacity),
            description: editFormData.description,
            openingTime: editFormData.openingTime,
            closingTime: editFormData.closingTime,
            operatingDays: editFormData.operatingDays,
            petTypes: editFormData.petTypes,
            galleryImageURLs: editFormData.imageUrl ? [editFormData.imageUrl] : [],
          };
        }
        return center;
      });
      
      setBoardingCenters(updatedBoardingCenters);
      closeEditForm();
    } catch (error) {
      console.error("Error updating boarding center: ", error);
      toast.error("Failed to update boarding center");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading boarding centers...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  // Sidebar navigation item component
  const NavItem = ({ icon, label, section }) => (
    <li 
      className={`px-4 py-3 flex items-center cursor-pointer transition-colors ${
        activeSection === section 
          ? "bg-blue-600 text-white" 
          : "text-gray-700 hover:bg-blue-50"
      }`}
      onClick={() => setActiveSection(section)}
    >
      <span className="mr-3">{icon}</span>
      <span className="font-medium">{label}</span>
    </li>
  );

  // Render the centers management UI
  const renderCentersManagement = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Your Boarding Centers</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add New Center'}
        </button>
      </div>

      {/* Add Center Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Boarding Center</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Center Name *
                </label>
                <input
                  type="text"
                  name="centerName"
                  value={newCenter.centerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={newCenter.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Per Day *
                </label>
                <input
                  type="number"
                  name="pricePerDay"
                  value={newCenter.pricePerDay}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  name="imageUrl"
                  value={newCenter.imageUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={newCenter.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="3"
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pet Types Accepted
              </label>
              <div className="flex flex-wrap gap-4">
                {['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map(type => (
                  <label key={type} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      value={type}
                      onChange={(e) => handleCheckboxChange(e, 'petTypes')}
                      checked={newCenter.petTypes.includes(type)}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services Offered
              </label>
              <div className="flex flex-wrap gap-4">
                {['Accommodation', 'Feeding', 'Walking', 'Grooming', 'Medical Care'].map(service => (
                  <label key={service} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      value={service}
                      onChange={(e) => handleCheckboxChange(e, 'services')}
                      checked={newCenter.services.includes(service)}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operating Days
              </label>
              <div className="flex flex-wrap gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <label key={day} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      value={day}
                      onChange={(e) => handleCheckboxChange(e, 'operatingDays')}
                      checked={newCenter.operatingDays.includes(day)}
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Center
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Center Modal */}
      {editingCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit Boarding Center</h2>
              <button
                onClick={closeEditForm}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Center Name*
                  </label>
                  <input
                    type="text"
                    name="centerName"
                    value={editFormData.centerName || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address*
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={editFormData.address || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City*
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={editFormData.city || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Per Day (₹)*
                  </label>
                  <input
                    type="number"
                    name="pricePerDay"
                    value={editFormData.pricePerDay || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity*
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={editFormData.capacity || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="text"
                    name="imageUrl"
                    value={editFormData.imageUrl || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    name="openingTime"
                    value={editFormData.openingTime || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    name="closingTime"
                    value={editFormData.closingTime || ""}
                    onChange={handleEditFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editFormData.description || ""}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Types Accepted
                </label>
                <div className="flex flex-wrap gap-3">
                  {["Dog", "Cat", "Bird", "Fish", "Small Mammal", "Reptile"].map((type) => (
                    <label key={type} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="petTypes"
                        value={type}
                        checked={editFormData.petTypes?.includes(type) || false}
                        onChange={handleEditCheckboxChange}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating Days
                </label>
                <div className="flex flex-wrap gap-3">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <label key={day} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="operatingDays"
                        value={day}
                        checked={editFormData.operatingDays?.includes(day) || false}
                        onChange={handleEditCheckboxChange}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Center"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* No Centers Found Message */}
      {boardingCenters.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No boarding centers</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new boarding center.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Boarding Center
            </button>
          </div>
        </div>
      )}

      {/* Centers List */}
      {boardingCenters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boardingCenters.map((center) => (
            <div key={center.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-48">
                <img
                  src={center.galleryImageURLs && center.galleryImageURLs.length > 0 
                    ? center.galleryImageURLs[0] 
                    : "https://via.placeholder.com/300x200?text=No+Image"}
                  alt={center.centerName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{center.centerName}</h3>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Location:</span> {center.address}, {center.city}
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Price:</span> ₹{center.perDayCharge || center.pricePerDay}/day
                </p>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Capacity:</span> {center.capacity} pets
                </p>
                
                {center.description && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Description:</span> {center.description}
                  </p>
                )}
                
                {center.openingTime && center.closingTime && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Hours:</span> {center.openingTime} - {center.closingTime}
                  </p>
                )}
                
                {center.operatingDays && center.operatingDays.length > 0 && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Operating Days:</span> {center.operatingDays.join(', ')}
                  </p>
                )}
                
                {center.petTypes && center.petTypes.length > 0 && (
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Pet Types:</span> {center.petTypes.join(', ')}
                  </p>
                )}
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditClick(center)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => viewCenterData(center)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      View Details
                    </button>
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={center.isAvailable}
                        onChange={() => toggleAvailability(center.id, center.isAvailable)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-xs font-medium text-gray-800 px-2 py-1 rounded">
                        {center.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Center Detail View Modal */}
      {viewingCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{viewingCenter.centerName}</h2>
              <button
                onClick={closeViewDetails}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Image Gallery */}
              <div className="h-64 overflow-hidden rounded-lg">
                <img 
                  src={viewingCenter.galleryImageURLs && viewingCenter.galleryImageURLs.length > 0 
                    ? viewingCenter.galleryImageURLs[0] 
                    : "https://via.placeholder.com/800x400?text=No+Image"} 
                  alt={viewingCenter.centerName}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`${viewingCenter.isAvailable ? 'text-green-600' : 'text-red-600'} font-medium`}>
                        {viewingCenter.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Address:</span> {viewingCenter.address}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">City:</span> {viewingCenter.city}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Price:</span> ₹{viewingCenter.perDayCharge || viewingCenter.pricePerDay}/day
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Capacity:</span> {viewingCenter.capacity} pets
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Operating Details</h3>
                  <div className="space-y-2">
                    {viewingCenter.openingTime && viewingCenter.closingTime && (
                      <p className="text-gray-700">
                        <span className="font-medium">Hours:</span> {viewingCenter.openingTime} - {viewingCenter.closingTime}
                      </p>
                    )}
                    
                    {viewingCenter.operatingDays && viewingCenter.operatingDays.length > 0 && (
                      <p className="text-gray-700">
                        <span className="font-medium">Operating Days:</span> {viewingCenter.operatingDays.join(', ')}
                      </p>
                    )}
                    
                    {viewingCenter.petTypes && viewingCenter.petTypes.length > 0 && (
                      <p className="text-gray-700">
                        <span className="font-medium">Pet Types Accepted:</span> {viewingCenter.petTypes.join(', ')}
                      </p>
                    )}
                    
                    {viewingCenter.services && viewingCenter.services.length > 0 && (
                      <p className="text-gray-700">
                        <span className="font-medium">Services Offered:</span> {viewingCenter.services.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              {viewingCenter.description && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700">{viewingCenter.description}</p>
                </div>
              )}
              
              {/* Contact & Admin Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Administrative Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span> {viewingCenter.email || 'Not provided'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">ID:</span> {viewingCenter.id}
                  </p>
                  {viewingCenter.createdAt && (
                    <p className="text-gray-700">
                      <span className="font-medium">Created:</span> {formatDate(viewingCenter.createdAt)}
                    </p>
                  )}
                  {viewingCenter.updatedAt && (
                    <p className="text-gray-700">
                      <span className="font-medium">Last Updated:</span> {formatDate(viewingCenter.updatedAt)}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeViewDetails}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closeViewDetails();
                    handleEditClick(viewingCenter);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Edit Center
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render the enquiries UI
  const renderEnquiries = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Booking Enquiries</h2>
      
      <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-yellow-700">
        <h3 className="font-medium mb-2">No enquiries yet</h3>
        <p>When customers make booking enquiries for your center, they will appear here.</p>
      </div>
    </div>
  );

  // Render bookings management UI
  const renderBookings = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Manage Bookings</h2>
      
      {bookingsLoading ? (
        <div className="flex justify-center items-center p-8">
          <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
          <span className="ml-2">Loading bookings...</span>
        </div>
      ) : bookingsError ? (
        <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
          <p>{bookingsError}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-yellow-700">
          <h3 className="font-medium mb-2">No bookings yet</h3>
          <p>When customers make bookings for your center, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Details</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{booking.userName || 'Unknown User'}</div>
                          <div className="text-sm text-gray-500">{booking.userEmail || 'No email provided'}</div>
                          <div className="text-sm text-gray-500">{booking.userPhone || 'No phone provided'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.centerName || 'Unknown Center'}</div>
                      <div className="text-sm text-gray-500">Pet: {booking.petType || 'Not specified'}</div>
                      <div className="text-sm text-gray-500">Booking ID: {booking.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <div>From: {formatDate(booking.dateFrom)}</div>
                        <div>To: {formatDate(booking.dateTo)}</div>
                        <div>Booked on: {formatDate(booking.bookingDate)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="text-green-600 hover:text-green-900 mr-3 disabled:opacity-50"
                            disabled={processingBookingId === booking.id}
                          >
                            {processingBookingId === booking.id ? (
                              <span className="flex items-center">
                                <FiLoader className="animate-spin mr-1" />
                                Confirming...
                              </span>
                            ) : (
                              'Confirm'
                            )}
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            disabled={processingBookingId === booking.id}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50"
                            disabled={processingBookingId === booking.id}
                          >
                            {processingBookingId === booking.id ? (
                              <span className="flex items-center">
                                <FiLoader className="animate-spin mr-1" />
                                Processing...
                              </span>
                            ) : (
                              'Complete'
                            )}
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            disabled={processingBookingId === booking.id}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Render the profile UI
  const renderProfile = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Settings</h2>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-5">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={adminData.name || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={adminData.email || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={adminData.username || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <input
                type="text"
                value={adminData.role || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );

  // Render the dashboard
  const renderDashboard = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Boarding Dashboard</h2>
      
      {dashboardLoading ? (
        <div className="flex justify-center items-center p-8">
          <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
          <span className="ml-2">Loading dashboard data...</span>
        </div>
      ) : boardingCenters.length === 0 ? (
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 mb-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No Boarding Centers</h3>
          <p className="text-yellow-700">You need to add a boarding center before you can see dashboard statistics.</p>
          <button
            onClick={() => setActiveSection('centers')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Go to Centers Management
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <FiCalendar size={24} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
                <p className="text-2xl font-semibold text-gray-800">{dashboardStats.totalBookings}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <FiClock size={24} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Upcoming Bookings</h3>
                <p className="text-2xl font-semibold text-gray-800">{dashboardStats.upcomingBookings}</p>
                <span className="text-xs text-green-600">{dashboardStats.todayBookings} today</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                <FiDollarSign size={24} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                <p className="text-2xl font-semibold text-gray-800">₹{dashboardStats.totalRevenue.toFixed(2)}</p>
                <span className="text-xs text-purple-600">{dashboardStats.completedBookings} completed bookings</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                <FiStar size={24} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
                <div className="flex items-center">
                  <p className="text-2xl font-semibold text-gray-800 mr-2">
                    {dashboardStats.averageRating.toFixed(1)}
                  </p>
                  <div className="flex text-yellow-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>
                        {star <= Math.round(dashboardStats.averageRating) ? (
                          <FiStar className="fill-current" />
                        ) : (
                          <FiStar />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-yellow-600">{recentReviews.length} reviews</span>
              </div>
            </div>
          </div>
          
          {/* Booking Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Today's Bookings */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                <h3 className="text-lg font-medium text-blue-800 flex items-center">
                  <FiClock className="mr-2" /> Today's Bookings
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {dashboardStats.todayBookings}
                  </span>
                </h3>
              </div>
              
              <div className="p-4">
                {todayBookings.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    No bookings scheduled for today
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {todayBookings.map(booking => (
                      <li key={booking.id} className="py-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{booking.userName || 'Unknown Customer'}</p>
                            <p className="text-xs text-gray-500">
                              {booking.petType && `${booking.petType} • `}
                              {formatDate(booking.dateFrom)} - {formatDate(booking.dateTo)}
                            </p>
                          </div>
                          <div>
                            <span 
                              className={`px-2 py-1 text-xs rounded-full 
                              ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'}`
                              }
                            >
                              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                
                {dashboardStats.todayBookings > todayBookings.length && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setActiveSection('bookings')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View all {dashboardStats.todayBookings} bookings for today
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Upcoming Bookings */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-green-50 border-b border-green-100">
                <h3 className="text-lg font-medium text-green-800 flex items-center">
                  <FiCalendar className="mr-2" /> Upcoming Bookings
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">
                    {dashboardStats.upcomingBookings}
                  </span>
                </h3>
              </div>
              
              <div className="p-4">
                {upcomingBookings.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    No upcoming bookings
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {upcomingBookings.map(booking => (
                      <li key={booking.id} className="py-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{booking.userName || 'Unknown Customer'}</p>
                            <p className="text-xs text-gray-500">
                              {booking.petType && `${booking.petType} • `}
                              {formatDate(booking.dateFrom)} - {formatDate(booking.dateTo)}
                            </p>
                          </div>
                          <div>
                            <span 
                              className={`px-2 py-1 text-xs rounded-full 
                              ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'}`
                              }
                            >
                              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                
                {dashboardStats.upcomingBookings > upcomingBookings.length && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setActiveSection('bookings')}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      View all {dashboardStats.upcomingBookings} upcoming bookings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Past Bookings and Reviews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Past Bookings */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-purple-50 border-b border-purple-100">
                <h3 className="text-lg font-medium text-purple-800 flex items-center">
                  <FiActivity className="mr-2" /> Past Bookings
                </h3>
              </div>
              
              <div className="p-4">
                {pastBookings.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    No past bookings
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {pastBookings.map(booking => (
                      <li key={booking.id} className="py-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{booking.userName || 'Unknown Customer'}</p>
                            <p className="text-xs text-gray-500">
                              {booking.petType && `${booking.petType} • `}
                              {formatDate(booking.dateFrom)} - {formatDate(booking.dateTo)}
                            </p>
                          </div>
                          <div>
                            <span 
                              className={`px-2 py-1 text-xs rounded-full 
                              ${booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'}`
                              }
                            >
                              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                
                {pastBookings.length > 0 && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setActiveSection('bookings')}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      View all past bookings
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recent Reviews */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-yellow-50 border-b border-yellow-100">
                <h3 className="text-lg font-medium text-yellow-800 flex items-center">
                  <FiStar className="mr-2" /> Recent Reviews
                </h3>
              </div>
              
              <div className="p-4">
                {recentReviews.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    No reviews yet
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {recentReviews.map(review => (
                      <li key={review.id} className="py-3">
                        <div>
                          <div className="flex items-center mb-1">
                            <p className="text-sm font-medium text-gray-900 mr-2">{review.userName || 'Anonymous'}</p>
                            <div className="flex text-yellow-500">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star}>
                                  {star <= review.rating ? (
                                    <FiStar className="fill-current h-3 w-3" />
                                  ) : (
                                    <FiStar className="h-3 w-3" />
                                  )}
                                </span>
                              ))}
                            </div>
                            <span className="ml-auto text-xs text-gray-500">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{review.comment || 'No comment provided'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          
          {/* Review Requests Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
              <h3 className="text-lg font-medium text-indigo-800 flex items-center">
                <FiStar className="mr-2" /> Review Requests Status
                <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full">
                  {reviewRequests.length}
                </span>
              </h3>
            </div>
            
            <div className="p-4">
              {reviewRequests.length === 0 ? (
                <div className="text-center p-4 text-gray-500">
                  No review requests have been sent yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking Period
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Request Sent
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reviewRequests.map(request => (
                        <tr key={request.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{request.userName || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{request.userEmail || 'No email'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(request.dateFrom)} - {formatDate(request.dateTo)}
                            </div>
                            <div className="text-sm text-gray-500">{request.centerName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatDate(request.sentAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${request.responded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {request.responded ? 'Reviewed' : 'Pending response'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render active section content
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'bookings':
        return renderBookings();
      case 'profile':
        return renderProfile();
      case 'centers':
        return renderCentersManagement();
      case 'enquiries':
        return renderEnquiries();
      case 'reviews':
        return (
          <ReviewsManager
            adminData={adminData}
            boardingCenters={boardingCenters}
          />
        );
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Boarding Admin</h2>
          <p className="text-sm text-gray-500">{adminData.name || adminData.username}</p>
        </div>
        <nav className="mt-4">
          <ul>
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              label="Dashboard"
              section="dashboard"
            />
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
              label="My Centers"
              section="centers"
            />
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              label="Booking Enquiries"
              section="enquiries"
            />
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              label="Bookings"
              section="bookings"
            />
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              label="Profile"
              section="profile"
            />
            <NavItem 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
              label="Reviews"
              section="reviews"
            />
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white shadow">
          <div className="px-4 py-6 sm:px-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              {activeSection === 'centers' && 'Boarding Centers Management'}
              {activeSection === 'enquiries' && 'Booking Enquiries'}
              {activeSection === 'bookings' && 'Manage Bookings'}
              {activeSection === 'profile' && 'Profile Settings'}
              {activeSection === 'dashboard' && 'Boarding Dashboard'}
              {activeSection === 'reviews' && 'Reviews'}
            </h1>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default BoardingAdminDashboard; 