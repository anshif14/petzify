import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { useUser } from '../context/UserContext';
import AuthModal from '../components/auth/AuthModal';
import { sendEmail } from '../utils/emailService';

const BoardingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    dateFrom: '',
    dateTo: '',
    timeFrom: '10:00',
    timeTo: '10:00',
    petType: '',
    petSize: '',
    petName: '',
    notes: ''
  });
  const [totalDays, setTotalDays] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Use useUser hook instead of UserContext
  const { currentUser, isAuthenticated } = useUser();

  // Fetch boarding center details
  useEffect(() => {
    const fetchBoardingCenter = async () => {
      try {
        setLoading(true);
        const centerRef = doc(db, 'petBoardingCenters', id);
        const centerSnap = await getDoc(centerRef);
        
        if (centerSnap.exists()) {
          const centerData = { id: centerSnap.id, ...centerSnap.data() };
          setCenter(centerData);
          
          // Pre-fill pet type and size if available in URL params
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('dateFrom')) {
            setBookingDetails(prev => ({ ...prev, dateFrom: urlParams.get('dateFrom') }));
          }
          if (urlParams.has('dateTo')) {
            setBookingDetails(prev => ({ ...prev, dateTo: urlParams.get('dateTo') }));
          }
          if (urlParams.has('petType')) {
            setBookingDetails(prev => ({ ...prev, petType: urlParams.get('petType') }));
          }
          if (urlParams.has('petSize')) {
            setBookingDetails(prev => ({ ...prev, petSize: urlParams.get('petSize') }));
          }
        } else {
          setError('Boarding center not found');
        }
      } catch (err) {
        console.error('Error fetching boarding center:', err);
        setError('Failed to load boarding center details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBoardingCenter();
      getUserLocation();
    }
    
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, [id]);

  // Function to calculate distance between two coordinates using the Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };

  // Update the getUserLocation function
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(locationData);
          
          // Calculate distance if center coordinates are available
          if (center && center.latitude && center.longitude) {
            const distance = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              parseFloat(center.latitude),
              parseFloat(center.longitude)
            );
            
            // Store the distance in the center object
            setCenter(prevCenter => ({
              ...prevCenter,
              distance: distance
            }));
          }
        },
        (error) => {
          console.log('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };
  
  // Add useEffect to call getUserLocation when center data changes
  useEffect(() => {
    if (center) {
      getUserLocation();
    }
  }, [center]);

  // Calculate booking days and total cost when dates change
  useEffect(() => {
    calculateBookingCost();
  }, [bookingDetails.dateFrom, bookingDetails.dateTo, bookingDetails.petSize, center]);

  const calculateBookingCost = () => {
    if (!bookingDetails.dateFrom || !bookingDetails.dateTo || !center) {
      setTotalDays(0);
      setTotalCost(0);
      return;
    }

    const startDate = new Date(bookingDetails.dateFrom);
    const endDate = new Date(bookingDetails.dateTo);
    
    // Calculate days difference
    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (days <= 0) {
      setTotalDays(0);
      setTotalCost(0);
      return;
    }
    
    setTotalDays(days);
    
    // Use the perDayCharge field for pricing
    const baseRate = center.perDayCharge || 0;
    setTotalCost(baseRate * days);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({ ...prev, [name]: value }));
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    // Retrieve stored form data and proceed with booking
    const storedForm = localStorage.getItem('tempBookingForm');
    if (storedForm) {
      try {
        const parsedForm = JSON.parse(storedForm);
        setBookingDetails(prevForm => ({
          ...prevForm,
          dateFrom: parsedForm.dateFrom || prevForm.dateFrom,
          dateTo: parsedForm.dateTo || prevForm.dateTo,
          timeFrom: parsedForm.timeFrom || prevForm.timeFrom,
          timeTo: parsedForm.timeTo || prevForm.timeTo,
          petType: parsedForm.petType || prevForm.petType,
          petSize: parsedForm.petSize || prevForm.petSize,
          petName: parsedForm.petName || prevForm.petName,
          notes: parsedForm.notes || prevForm.notes
        }));
        localStorage.removeItem('tempBookingForm');
        
        // Process booking after a short delay to ensure currentUser is available
        setTimeout(() => {
          processBooking();
        }, 1000);
      } catch (error) {
        console.error('Error parsing stored form data:', error);
        localStorage.removeItem('tempBookingForm');
      }
    }
  };

  // Update the handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!isAuthenticated()) {
      // Store form data temporarily and show auth modal
      localStorage.setItem('tempBookingForm', JSON.stringify(bookingDetails));
      setShowAuthModal(true);
      return;
    }
    
    // Continue with booking process
    await processBooking();
  };

  // Add the processing booking function
  const processBooking = async () => {
    setLoading(true);
    try {
      // Create a booking document in Firestore
      const bookingData = {
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.fullName || currentUser?.displayName || currentUser?.name || 'Unknown User',
        userPhone: currentUser?.phone || '',
        centerId: center.id,
        centerName: center.centerName,
        centerEmail: center.email || '',
        centerAddress: `${center.address}, ${center.city}, ${center.pincode}`,
        dateFrom: bookingDetails.dateFrom,
        dateTo: bookingDetails.dateTo,
        timeFrom: bookingDetails.timeFrom,
        timeTo: bookingDetails.timeTo,
        petType: bookingDetails.petType,
        petSize: bookingDetails.petSize,
        petName: bookingDetails.petName,
        notes: bookingDetails.notes,
        totalDays,
        perDayCharge: center.perDayCharge,
        totalCost,
        status: 'pending',
        createdAt: serverTimestamp(),
        paymentStatus: 'pending'
      };
      
      console.log('Attempting to create booking with data:', bookingData);
      console.log('Current user object:', currentUser);
      
      // Add booking to the pet boarding bookings collection
      const bookingsRef = collection(db, 'petBoardingBookings');
      const docRef = await addDoc(bookingsRef, bookingData);
      
      console.log('Booking created successfully with ID:', docRef.id);
      
      // Send email to the user
      await sendEmailNotifications(bookingData, docRef.id);
      
      // Show success message
      alert('Booking request submitted successfully! You can check the status in My Bookings.');
      
      // Clear any stored pending booking
      localStorage.removeItem('tempBookingForm');
      
      // Redirect to My Bookings page
      navigate('/my-bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      console.error('Error details:', error.message, error.code);
      alert(`Failed to create booking: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Function to send email notifications
  const sendEmailNotifications = async (bookingData, bookingId) => {
    try {
      const logoUrl = "https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2FPetzify%20Logo-05%20(3).png?alt=media&token=d1cf79b7-2ae1-443b-8390-52938a60198d";
      const labelUrl = "https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2FScreenshot_2025-04-05_at_9.17.07_AM-removebg-preview.png?alt=media&token=5b05265c-ce3b-444d-a8dc-b8e3a838a050";
      const businessEmail = process.env.REACT_APP_ADMIN_EMAIL || 'petzify.business@gmail.com';
      
      // Format dates for email display
      const formatDate = (date, time) => {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return `${formattedDate} at ${time}`;
      };
      
      const checkInDateTime = formatDate(bookingData.dateFrom, bookingData.timeFrom);
      const checkOutDateTime = formatDate(bookingData.dateTo, bookingData.timeTo);
      
      // Email to the user
      const userEmailHtml = `
        <html>
        <body style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.5;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <img src="${logoUrl}" alt="Petzify Logo" style="max-width: 150px;" />
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #4f46e5; margin-top: 0; font-weight: 600; font-size: 24px;">Booking Confirmation</h2>
            <p style="margin-bottom: 20px; font-size: 16px;">Dear ${bookingData.userName},</p>
            <p style="margin-bottom: 20px; font-size: 16px;">Thank you for choosing Petzify for your pet's boarding needs. We're pleased to confirm your booking request has been successfully received.</p>
            
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking Reference:</td>
                  <td style="padding: 8px 0;">#${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Boarding Center:</td>
                  <td style="padding: 8px 0;">${bookingData.centerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                  <td style="padding: 8px 0;">${bookingData.centerAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
                  <td style="padding: 8px 0;">${checkInDateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
                  <td style="padding: 8px 0;">${checkOutDateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Pet Name:</td>
                  <td style="padding: 8px 0;">${bookingData.petName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Pet Type/Size:</td>
                  <td style="padding: 8px 0;">${bookingData.petType}, ${bookingData.petSize} size</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
                  <td style="padding: 8px 0;">${bookingData.totalDays} days</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Total Cost:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">₹${bookingData.totalCost}</td>
                </tr>
                ${bookingData.notes ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Special Instructions:</td>
                  <td style="padding: 8px 0;">${bookingData.notes}</td>
                </tr>` : ''}
              </table>
            </div>
            
            <div style="background-color: #f0f7ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #2563eb; margin-top: 0; font-size: 18px;">Important Information</h3>
              <ul style="padding-left: 20px; margin-top: 10px;">
                <li style="margin-bottom: 8px;">Your booking is currently pending confirmation from the boarding center.</li>
                <li style="margin-bottom: 8px;">You will receive a notification once the center confirms your booking.</li>
                <li style="margin-bottom: 8px;">Please bring your pet's vaccination records on the check-in date.</li>
                <li style="margin-bottom: 8px;">You can view or manage your booking by logging into your Petzify account.</li>
              </ul>
            </div>
            
            <p style="margin: 20px 0; font-size: 16px;">If you have any questions or need to make changes to your booking, please contact us or reach out to the boarding center directly.</p>
            <p style="margin-bottom: 30px; font-size: 16px;">Thank you for choosing Petzify!</p>
            <p style="font-size: 16px;">Warm regards,</p>
            <p style="font-weight: bold; font-size: 16px;">The Petzify Team</p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #666; font-size: 12px;">
            <p>This is an automated message, please do not reply to this email.</p>
            <img src="${labelUrl}" alt="Petzify Label" style="max-width: 100px; margin-top: 10px;" />
            <p>&copy; ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
      
      // Email to the boarding center
      const centerEmailHtml = `
        <html>
        <body style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.5;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <img src="${logoUrl}" alt="Petzify Logo" style="max-width: 150px;" />
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #4f46e5; margin-top: 0; font-weight: 600; font-size: 24px;">New Boarding Request</h2>
            <p style="margin-bottom: 20px; font-size: 16px;">Dear ${center.centerName} Team,</p>
            <p style="margin-bottom: 20px; font-size: 16px;">You have received a new pet boarding request through Petzify. Please review the details below and confirm or decline this booking at your earliest convenience.</p>
            
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking Reference:</td>
                  <td style="padding: 8px 0;">#${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
                  <td style="padding: 8px 0;">${checkInDateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
                  <td style="padding: 8px 0;">${checkOutDateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
                  <td style="padding: 8px 0;">${bookingData.totalDays} days</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Customer Information</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td>
                  <td style="padding: 8px 0;">${bookingData.userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                  <td style="padding: 8px 0;">${bookingData.userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                  <td style="padding: 8px 0;">${bookingData.userPhone || 'Not provided'}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Pet Information</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 40%;">Pet Name:</td>
                  <td style="padding: 8px 0;">${bookingData.petName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Type:</td>
                  <td style="padding: 8px 0;">${bookingData.petType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Size:</td>
                  <td style="padding: 8px 0;">${bookingData.petSize}</td>
                </tr>
                ${bookingData.notes ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Special Instructions:</td>
                  <td style="padding: 8px 0;">${bookingData.notes}</td>
                </tr>` : ''}
              </table>
            </div>
            
            <div style="background-color: #f0f7ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #2563eb; margin-top: 0; font-size: 18px;">Action Required</h3>
              <p style="margin-top: 10px;">Please log in to your Petzify dashboard to confirm or decline this booking. The customer will be notified of your decision automatically.</p>
              <p style="margin-top: 10px;">Remember to update the booking status promptly to maintain good service standards.</p>
            </div>
            
            <p style="margin: 20px 0; font-size: 16px;">If you have any questions or concerns, please contact Petzify support.</p>
            <p style="margin-bottom: 30px; font-size: 16px;">Thank you for your partnership!</p>
            <p style="font-size: 16px;">Best regards,</p>
            <p style="font-weight: bold; font-size: 16px;">The Petzify Team</p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #666; font-size: 12px;">
            <p>This is an automated message, please do not reply to this email.</p>
            <img src="${labelUrl}" alt="Petzify Label" style="max-width: 100px; margin-top: 10px;" />
            <p>&copy; ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
      
      // Email to the business
      const businessEmailHtml = `
        <html>
        <body style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.5;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
            <img src="${logoUrl}" alt="Petzify Logo" style="max-width: 150px;" />
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #4f46e5; margin-top: 0; font-weight: 600; font-size: 24px;">New Boarding Booking Alert</h2>
            <p style="margin-bottom: 20px; font-size: 16px;">A new pet boarding booking has been created in the Petzify system.</p>
            
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; font-size: 18px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Transaction Summary</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking Reference:</td>
                  <td style="padding: 8px 0;">#${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Center:</td>
                  <td style="padding: 8px 0;">${bookingData.centerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Customer:</td>
                  <td style="padding: 8px 0;">${bookingData.userName} (${bookingData.userEmail})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Check-in:</td>
                  <td style="padding: 8px 0;">${checkInDateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Check-out:</td>
                  <td style="padding: 8px 0;">${checkOutDateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Pet:</td>
                  <td style="padding: 8px 0;">${bookingData.petName} (${bookingData.petType}, ${bookingData.petSize} size)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
                  <td style="padding: 8px 0;">${bookingData.totalDays} days</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #f59e0b;">Pending confirmation</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Total Revenue:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">₹${bookingData.totalCost}</td>
                </tr>
              </table>
            </div>
            
            <p style="margin: 20px 0; font-size: 16px;">You can view the complete booking details in the admin dashboard.</p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #666; font-size: 12px;">
            <p>This is an automated system notification from Petzify.</p>
            <img src="${labelUrl}" alt="Petzify Label" style="max-width: 100px; margin-top: 10px;" />
            <p>&copy; ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
      
      // Send email to user
      if (bookingData.userEmail) {
        await sendEmail({
          to: bookingData.userEmail,
          subject: `Petzify Boarding Booking Confirmation - #${bookingId}`,
          html: userEmailHtml
        });
        console.log(`Confirmation email sent to user: ${bookingData.userEmail}`);
      }
      
      // Send email to boarding center if email is available
      if (center && center.email) {
        await sendEmail({
          to: center.email,
          subject: `New Petzify Boarding Request - #${bookingId}`,
          html: centerEmailHtml
        });
        console.log(`Notification email sent to boarding center: ${center.email}`);
      } else if (bookingData.centerEmail) {
        await sendEmail({
          to: bookingData.centerEmail,
          subject: `New Petzify Boarding Request - #${bookingId}`,
          html: centerEmailHtml
        });
        console.log(`Notification email sent to boarding center: ${bookingData.centerEmail}`);
      } else {
        console.log('No boarding center email available, skipping center notification');
      }
      
      // Send email to business
      await sendEmail({
        to: businessEmail,
        subject: `New Pet Boarding Booking - #${bookingId}`,
        html: businessEmailHtml
      });
      console.log(`Notification email sent to business: ${businessEmail}`);
      
      console.log('All email notifications sent successfully');
    } catch (error) {
      console.error('Error sending email notifications:', error);
      // Don't throw the error here, we want to continue even if email fails
    }
  };

  const formatTime = (time) => {
    if (!time) return 'Not specified';
    
    try {
      const [hours, minutes] = time.split(':');
      const parsedHours = parseInt(hours, 10);
      const period = parsedHours >= 12 ? 'PM' : 'AM';
      const displayHours = parsedHours > 12 ? parsedHours - 12 : parsedHours === 0 ? 12 : parsedHours;
      return `${displayHours}:${minutes} ${period}`;
    } catch (err) {
      return time;
    }
  };

  // Add this near the beginning of the component
  useEffect(() => {
    // Check if user is logged in when component mounts
    const checkAuth = () => {
      // User would be redirected to login page if not authenticated
      if (!isAuthenticated() && localStorage.getItem('redirectToLogin') === 'true') {
        localStorage.removeItem('redirectToLogin');
        navigate('/login', { 
          state: { 
            returnUrl: `/services/boarding/${id}` 
          } 
        });
      }
    };
    
    checkAuth();
  }, [isAuthenticated, navigate, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Loading</h3>
          <p className="text-gray-600">Please wait while we fetch the boarding center details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">Boarding Center Not Found</h3>
          <p className="text-gray-600 mb-6">The boarding center you're looking for doesn't exist or may have been removed.</p>
          <Link
            to="/services/boarding"
            className="inline-block px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Browse All Boarding Centers
          </Link>
        </div>
      </div>
    );
  }

  if (!center) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Center Image */}
      <div className="relative h-64 md:h-80">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 to-primary/20 z-10"></div>
        <img 
          src={center.galleryImageURLs?.[0] || center.profilePictureURL || 'https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg'} 
          alt={center.centerName} 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Boarding Center Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center mb-4">
                {center.profilePictureURL && (
                  <img 
                    src={center.profilePictureURL} 
                    alt={center.centerName} 
                    className="w-16 h-16 rounded-full mr-4 object-cover border-2 border-primary"
                  />
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{center.centerName}</h1>
                  <p className="text-sm text-gray-500">Owned by {center.ownerName || 'Not specified'}</p>
                </div>
              </div>
              
              {/* Status badge */}
              <div className="mb-4">
                {center.isAvailable ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                    Available for Booking
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <span className="w-2 h-2 mr-1 bg-red-500 rounded-full"></span>
                    Currently Unavailable
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 py-4 border-t border-b border-gray-200 mb-6">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Price</p>
                  <p className="font-semibold text-lg">₹{center.perDayCharge || 0}/day</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Capacity</p>
                  <p className="font-medium">{center.capacity || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Hours</p>
                  <p className="font-medium">{formatTime(center.openingTime)} - {formatTime(center.closingTime)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Age Limit</p>
                  <p className="font-medium">{center.petAgeLimit || 'No limit'}</p>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-3">About</h2>
              <p className="text-gray-700 mb-6">
                {center.description || 'No description available for this boarding center.'}
              </p>
              
              {center.holidayNotice && (
                <div className="bg-yellow-50 p-4 rounded-md mb-6">
                  <h3 className="font-medium text-yellow-800 mb-1">Holiday Notice</h3>
                  <p className="text-yellow-700 text-sm">{center.holidayNotice}</p>
                </div>
              )}

              <h2 className="text-xl font-semibold mb-3">Pets Accepted</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {center.petTypesAccepted && Object.entries(center.petTypesAccepted)
                  .filter(([_, accepted]) => accepted)
                  .map(([type]) => (
                    <span key={type} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))
                }
                {(!center.petTypesAccepted || Object.values(center.petTypesAccepted).every(v => !v)) && (
                  <span className="text-gray-500">No pet types specified</span>
                )}
              </div>

              {center.petSizeLimit && center.petSizeLimit.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Accepted Pet Sizes</h3>
                  <div className="flex flex-wrap gap-2">
                    {center.petSizeLimit.map(size => (
                      <span key={size} className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-xl font-semibold mb-3">Services Offered</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {center.servicesOffered && Object.entries(center.servicesOffered)
                  .filter(([_, offered]) => offered)
                  .map(([service]) => (
                    <div key={service} className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                  ))
                }
              </div>

              <h2 className="text-xl font-semibold mb-3">Requirements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="flex items-center">
                  <svg className={`h-5 w-5 ${center.vaccinationRequired ? 'text-green-500' : 'text-red-500'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {center.vaccinationRequired 
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  <span>Vaccination {center.vaccinationRequired ? 'Required' : 'Not Required'}</span>
                </div>
                <div className="flex items-center">
                  <svg className={`h-5 w-5 ${center.petFoodProvided ? 'text-green-500' : 'text-red-500'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {center.petFoodProvided 
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  <span>Food {center.petFoodProvided ? 'Provided' : 'Not Provided'}</span>
                </div>
                <div className="flex items-center">
                  <svg className={`h-5 w-5 ${center.pickupDropAvailable ? 'text-green-500' : 'text-red-500'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {center.pickupDropAvailable 
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  <span>Pickup/Drop {center.pickupDropAvailable ? 'Available' : 'Not Available'}</span>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-3">Location</h2>
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="font-medium mb-2">
                  {center.address}, {center.city}, {center.pincode}
                </p>
                
                {center.distance && (
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="inline-flex items-center">
                      <svg className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      Approximately {center.distance.toFixed(1)} km from your location
                    </span>
                  </p>
                )}
                
                {center.latitude && center.longitude && (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Get Directions
                  </a>
                )}
              </div>

              <h2 className="text-xl font-semibold mb-3">Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {center.phoneNumber && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${center.phoneNumber}`} className="text-primary hover:underline">{center.phoneNumber}</a>
                  </div>
                )}
                {center.email && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${center.email}`} className="text-primary hover:underline">{center.email}</a>
                  </div>
                )}
                {center.website && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <a href={`https://${center.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{center.website}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Gallery */}
            {center.galleryImageURLs && center.galleryImageURLs.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Photo Gallery</h2>
                
                {/* Main Image */}
                <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-100 h-64 md:h-80">
                  <img 
                    src={center.galleryImageURLs[activeImageIndex]}
                    alt={`${center.centerName} - Gallery ${activeImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Navigation arrows */}
                  {center.galleryImageURLs.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev === 0 ? center.galleryImageURLs.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev === center.galleryImageURLs.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                
                {/* Thumbnails */}
                <div className="grid grid-cols-5 gap-2">
                  {center.galleryImageURLs.map((image, index) => (
                    <img 
                      key={index}
                      src={image}
                      alt={`${center.centerName} - Thumbnail ${index + 1}`}
                      className={`w-full h-16 object-cover rounded-md cursor-pointer transition-all ${activeImageIndex === index ? 'border-2 border-primary ring-2 ring-primary ring-opacity-50' : 'border border-gray-200 opacity-70 hover:opacity-100'}`}
                      onClick={() => setActiveImageIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Book This Center</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Login Required:</strong> You must be logged in to book a boarding service.
                      {!isAuthenticated() && (
                        <button 
                          onClick={() => setShowAuthModal(true)}
                          className="ml-2 font-medium text-yellow-700 underline hover:text-yellow-600"
                        >
                          Login Now
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              {!isAuthenticated() ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Login Required</h3>
                  <p className="text-gray-600 mb-4">You need to be logged in to book this boarding service. Please login to continue.</p>
                  <button 
                    onClick={() => {
                      // Store booking details in local storage for auth modal
                      localStorage.setItem('tempBookingForm', JSON.stringify({
                        centerId: id,
                        centerName: center.centerName,
                        dateFrom: bookingDetails.dateFrom,
                        dateTo: bookingDetails.dateTo,
                        timeFrom: bookingDetails.timeFrom,
                        timeTo: bookingDetails.timeTo,
                        petType: bookingDetails.petType,
                        petSize: bookingDetails.petSize,
                        petName: bookingDetails.petName,
                        notes: bookingDetails.notes,
                        totalDays,
                        totalCost
                      }));
                      
                      // Show auth modal
                      setShowAuthModal(true);
                    }}
                    className="w-full py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
                  >
                    Sign in to Book
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                    <input
                      type="date"
                      id="dateFrom"
                      name="dateFrom"
                      value={bookingDetails.dateFrom}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="timeFrom" className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                    <input
                      type="time"
                      id="timeFrom"
                      name="timeFrom"
                      value={bookingDetails.timeFrom}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Please choose a time within the boarding center's operating hours</p>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                    <input
                      type="date"
                      id="dateTo"
                      name="dateTo"
                      value={bookingDetails.dateTo}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      min={bookingDetails.dateFrom || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="timeTo" className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                    <input
                      type="time"
                      id="timeTo"
                      name="timeTo"
                      value={bookingDetails.timeTo}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Please choose a time within the boarding center's operating hours</p>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="petType" className="block text-sm font-medium text-gray-700 mb-1">Pet Type</label>
                    <select
                      id="petType"
                      name="petType"
                      value={bookingDetails.petType}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      required
                    >
                      <option value="">Select pet type</option>
                      {center.petTypesAccepted?.dog && <option value="dog">Dog</option>}
                      {center.petTypesAccepted?.cat && <option value="cat">Cat</option>}
                      {center.petTypesAccepted?.bird && <option value="bird">Bird</option>}
                      {center.petTypesAccepted?.rabbit && <option value="rabbit">Rabbit</option>}
                      {center.petTypesAccepted?.other && <option value="other">Other</option>}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Please confirm with the boarding center if they accommodate your specific pet type</p>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="petSize" className="block text-sm font-medium text-gray-700 mb-1">Pet Size</label>
                    <select
                      id="petSize"
                      name="petSize"
                      value={bookingDetails.petSize}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      required
                    >
                      <option value="">Select pet size</option>
                      {center.petSizeLimit?.includes('small') && <option value="small">Small (up to 10kg)</option>}
                      {center.petSizeLimit?.includes('medium') && <option value="medium">Medium (10-25kg)</option>}
                      {center.petSizeLimit?.includes('large') && <option value="large">Large (25kg+)</option>}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">For appropriate accommodation arrangement</p>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-1">Pet Name</label>
                    <input
                      type="text"
                      id="petName"
                      name="petName"
                      value={bookingDetails.petName}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={bookingDetails.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Any special needs, dietary requirements, etc."
                    ></textarea>
                  </div>
                  
                  {totalDays > 0 && (
                    <div className="bg-gray-50 p-4 rounded-md mb-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-700">Duration:</span>
                        <span className="font-medium">{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold">
                        <span className="text-gray-700">Total Cost:</span>
                        <span>₹{totalCost}</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Book Now
                  </button>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <p>By booking, you agree to our terms and cancellation policy.</p>
                  </div>
                  
                  {/* Add booking process information */}
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <h3 className="font-semibold text-gray-700 mb-2">What happens next?</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Your booking request will be sent to the boarding center</li>
                      <li>The center will review your request and confirm availability</li>
                      <li>You'll receive a confirmation notification</li>
                      <li>You can track all your bookings in <Link to="/my-bookings" className="text-primary hover:underline">My Bookings</Link></li>
                    </ol>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default BoardingDetail; 