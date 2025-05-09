/**
 * Test script for grooming email functions
 * 
 * This script uses the Firebase Admin SDK to create test documents in Firestore
 * to trigger and validate the email notification cloud functions.
 * 
 * To use:
 * 1. Make sure you have proper Firebase Admin credentials
 * 2. Run: node test_grooming_emails.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json'); // Replace with your service account file

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Sample booking data
const mockBooking = {
  userEmail: 'test-customer@example.com', // Replace with a real test email
  userName: 'Test Customer',
  userPhone: '+1234567890',
  centerId: 'test-center-id',
  centerName: 'Test Grooming Center',
  centerEmail: 'test-center@example.com', // Replace with a real test email
  date: '2023-06-15',
  time: '10:00 AM',
  petType: 'Dog',
  petName: 'Max',
  petBreed: 'Golden Retriever',
  petAge: '3',
  petWeight: '30',
  selectedServices: ['Bath & Brush', 'Nail Trimming', 'Ear Cleaning'],
  totalCost: 1500,
  status: 'pending',
  specialInstructions: 'Max is afraid of loud noises.',
  createdAt: admin.firestore.FieldValue.serverTimestamp()
};

// Test functions
async function testCreateBooking() {
  try {
    console.log('Creating test booking document...');
    const docRef = await db.collection('groomingBookings').add(mockBooking);
    console.log(`Test booking created with ID: ${docRef.id}`);
    console.log('This should trigger the onGroomingBookingCreated function');
    console.log(`Check email inbox for: ${mockBooking.userEmail} and ${mockBooking.centerEmail}`);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test booking:', error);
  }
}

async function testUpdateBookingStatus(bookingId, newStatus) {
  try {
    if (!bookingId) {
      console.error('Booking ID is required for status update test');
      return;
    }
    
    console.log(`Updating test booking ${bookingId} to status: ${newStatus}`);
    await db.collection('groomingBookings').doc(bookingId).update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Test booking ${bookingId} updated to ${newStatus}`);
    console.log('This should trigger the onGroomingBookingUpdated function');
    console.log(`Check email inbox for: ${mockBooking.userEmail}`);
  } catch (error) {
    console.error('Error updating test booking:', error);
  }
}

// Run the tests
async function runTests() {
  // Test creating a new booking
  const bookingId = await testCreateBooking();
  
  // Wait a few seconds before updating
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test updating to different statuses
  await testUpdateBookingStatus(bookingId, 'confirmed');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  await testUpdateBookingStatus(bookingId, 'arrived');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  await testUpdateBookingStatus(bookingId, 'completed');
  
  console.log('All tests completed! Check email inboxes for notifications.');
}

// Run tests
runTests().catch(console.error); 