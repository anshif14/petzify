/**
 * Test script for grooming email functions
 * 
 * To use:
 * 1. Install the Firebase Admin SDK: npm install firebase-admin
 * 2. Download your Firebase Admin service account key
 * 3. Update the path to your service account key below
 * 4. Update the test email addresses
 * 5. Run: node test-grooming-emails.js
 */

const admin = require('firebase-admin');

// Path to your service account key
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test data - update with your test emails
const testData = {
  userEmail: 'your-test-customer@example.com',  // Change to your test email
  userName: 'Test Customer',
  userPhone: '+1234567890',
  centerId: 'test-center-id',
  centerName: 'Test Grooming Center',
  centerEmail: 'your-test-center@example.com',  // Change to your test email
  date: new Date().toISOString().split('T')[0],
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

// Create a test booking
async function createTestBooking() {
  try {
    console.log('Creating test booking document...');
    const docRef = await db.collection('groomingBookings').add(testData);
    console.log(`Test booking created with ID: ${docRef.id}`);
    console.log('This should trigger the onGroomingBookingCreated function');
    console.log(`Check email inbox for: ${testData.userEmail} and ${testData.centerEmail}`);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test booking:', error);
  }
}

// Update a booking status
async function updateBookingStatus(bookingId, newStatus) {
  try {
    console.log(`Updating test booking ${bookingId} to status: ${newStatus}`);
    await db.collection('groomingBookings').doc(bookingId).update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Test booking ${bookingId} updated to ${newStatus}`);
    console.log('This should trigger the onGroomingBookingUpdated function');
    console.log(`Check email inbox for: ${testData.userEmail}`);
  } catch (error) {
    console.error('Error updating test booking:', error);
  }
}

// Run the tests
async function runTests() {
  try {
    // Create a new booking first
    const bookingId = await createTestBooking();
    
    // Wait for 15 seconds before updating status
    console.log('Waiting 15 seconds before updating status...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Update status to confirmed
    await updateBookingStatus(bookingId, 'confirmed');
    
    // Wait for 5 seconds before next update
    console.log('Waiting 5 seconds before next update...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update status to arrived
    await updateBookingStatus(bookingId, 'arrived');
    
    // Wait for 5 seconds before next update
    console.log('Waiting 5 seconds before next update...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update status to completed
    await updateBookingStatus(bookingId, 'completed');
    
    console.log('\nAll tests completed! Check email inboxes for notifications.');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests().catch(console.error); 