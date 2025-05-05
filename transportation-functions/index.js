/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Load environment variables from .env file
require('dotenv').config();

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Define the logo URL as a constant for consistency
const PETZIFY_LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2FScreenshot_2025-04-05_at_9.17.07_AM-removebg-preview.png?alt=media&token=5b05265c-ce3b-444d-a8dc-b8e3a838a050";

// --- Email Config ---
const getEmailConfig = () => {
  // Access environment variables directly from process.env
  const portalEmail = process.env.GMAIL_EMAIL || "petzifyonline@gmail.com";
  const portalPassword = process.env.GMAIL_PASSWORD;
  const businessEmail = process.env.BUSINESS_EMAIL || "petzify.business@gmail.com";
  
  if (!portalPassword) {
    throw new Error("Missing GMAIL_PASSWORD environment variable");
  }
  
  logger.info(`Email config loaded: ${portalEmail}, business: ${businessEmail}`);
  
  return { portalEmail, portalPassword, businessEmail };
};

// --- Email Utility Function ---
const sendEmail = async ({ to, subject, html }) => {
  const config = getEmailConfig();
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.portalEmail,
      pass: config.portalPassword
    }
  });
  
  try {
    await transporter.sendMail({
      from: `Petzify <${config.portalEmail}>`,
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}`);
    return true;
  } catch (error) {
    logger.error(`Email failed: ${error}`);
    throw new Error(`Email failed: ${error.message}`);
  }
};

// --- Email Template for Pet Boarding Booking ---
const getPetBoardingBookedTemplate = (booking) => {
  const { customerName, petName, centerName, checkInDate, checkOutDate, petType, centerAddress } = booking;
  
  // Format dates
  const formattedCheckInDate = checkInDate ? new Date(checkInDate.seconds * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';
  
  const formattedCheckOutDate = checkOutDate ? new Date(checkOutDate.seconds * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Petzify Boarding Request Confirmation</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #14cca4;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 180px;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #14cca4;
          margin: 10px 0;
        }
        .status-bar {
          background-color: #ffcc00;
          color: #333;
          padding: 10px 15px;
          text-align: center;
          border-radius: 5px;
          margin: 15px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: bold;
        }
        .section {
          margin-bottom: 25px;
          border-bottom: 1px solid #eee;
          padding-bottom: 20px;
        }
        .section:last-child {
          border-bottom: none;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #14cca4;
          margin-bottom: 15px;
        }
        .booking-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        .booking-info p {
          margin: 5px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #777;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${PETZIFY_LOGO_URL}" alt="Petzify Logo" class="logo">
          <div class="title">PET BOARDING REQUEST</div>
        </div>
        
        <div class="status-bar">
          Status: Request Received
        </div>
        
        <p>Dear ${customerName},</p>
        <p>Thank you for choosing Petzify for your pet boarding needs. Your boarding request has been received and is being processed.</p>
        
        <div class="section">
          <div class="section-title">Boarding Details</div>
          <div class="booking-info">
            <p><strong>Boarding Center:</strong> ${centerName}</p>
            <p><strong>Center Address:</strong> ${centerAddress || 'Please contact center for address details'}</p>
            <p><strong>Pet:</strong> ${petName} (${petType || 'Pet'})</p>
            <p><strong>Check-in Date:</strong> ${formattedCheckInDate}</p>
            <p><strong>Check-out Date:</strong> ${formattedCheckOutDate}</p>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">What's Next?</div>
          <p>Our team will review your booking and contact you shortly to confirm your reservation and discuss any specific requirements for your pet's stay.</p>
          <p>If you need to modify or cancel your booking, please contact us as soon as possible.</p>
        </div>
        
        <div class="footer">
          <p>If you have any questions, please contact our support team at <a href="mailto:support@petzify.com">support@petzify.com</a>.</p>
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Business notification template
const getBusinessNotificationTemplate = (booking) => {
  const { customerName, customerEmail, customerPhone, petName, centerName, checkInDate, checkOutDate, petType, petSize, notes } = booking;
  
  // Format dates
  const formattedCheckInDate = checkInDate ? new Date(checkInDate.seconds * 1000).toLocaleDateString() : 'N/A';
  const formattedCheckOutDate = checkOutDate ? new Date(checkOutDate.seconds * 1000).toLocaleDateString() : 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Pet Boarding Request</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          padding-bottom: 15px;
          border-bottom: 2px solid #14cca4;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #14cca4;
          margin: 10px 0;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #14cca4;
          margin-bottom: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        table td:first-child {
          font-weight: bold;
          width: 40%;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">NEW PET BOARDING REQUEST</div>
        </div>
        
        <div class="section">
          <div class="section-title">Boarding Center</div>
          <p>${centerName}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Customer Information</div>
          <table>
            <tr>
              <td>Name</td>
              <td>${customerName}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>${customerEmail}</td>
            </tr>
            <tr>
              <td>Phone</td>
              <td>${customerPhone || 'Not provided'}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Booking Details</div>
          <table>
            <tr>
              <td>Pet Name</td>
              <td>${petName}</td>
            </tr>
            <tr>
              <td>Pet Type</td>
              <td>${petType || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Pet Size</td>
              <td>${petSize || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Check-in Date</td>
              <td>${formattedCheckInDate}</td>
            </tr>
            <tr>
              <td>Check-out Date</td>
              <td>${formattedCheckOutDate}</td>
            </tr>
            <tr>
              <td>Special Notes</td>
              <td>${notes || 'None'}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <p>Please contact the customer to confirm this booking request.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// --- Cloud Function for Pet Boarding Notifications ---
exports.onPetBoardingBooked = onDocumentCreated("boardingBookings/{bookingId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("No data associated with the event");
    return;
  }
  
  const bookingData = snapshot.data();
  const bookingId = event.params.bookingId;
  
  if (!bookingData || !bookingData.customerEmail) {
    logger.error("Missing booking data or customer email");
    return;
  }
  
  try {
    // Send email to customer
    const customerHtml = getPetBoardingBookedTemplate(bookingData);
    await sendEmail({
      to: bookingData.customerEmail,
      subject: "Pet Boarding Request Received - Petzify",
      html: customerHtml
    });
    
    // Send email notification to business
    const config = getEmailConfig();
    const businessHtml = getBusinessNotificationTemplate(bookingData);
    await sendEmail({
      to: config.businessEmail,
      subject: `New Pet Boarding Request - ${bookingData.petName}`,
      html: businessHtml
    });
    
    // Update booking with emailSent flag
    await db.collection('boardingBookings').doc(bookingId).update({
      emailSent: true,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`Pet boarding notification emails sent for booking ${bookingId}`);
  } catch (error) {
    logger.error("Error sending pet boarding notification emails:", error);
  }
});

// --- Email Template for Pet Transportation Booking ---
const getPetTransportationBookedTemplate = (booking) => {
  const { customerName, petName, pickupAddress, dropoffAddress, pickupDate, transportType, petType } = booking;
  
  // Format date
  const formattedPickupDate = pickupDate ? new Date(pickupDate.seconds * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Petzify Transportation Request Confirmation</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #14cca4;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 180px;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #14cca4;
          margin: 10px 0;
        }
        .status-bar {
          background-color: #ffcc00;
          color: #333;
          padding: 10px 15px;
          text-align: center;
          border-radius: 5px;
          margin: 15px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: bold;
        }
        .section {
          margin-bottom: 25px;
          border-bottom: 1px solid #eee;
          padding-bottom: 20px;
        }
        .section:last-child {
          border-bottom: none;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #14cca4;
          margin-bottom: 15px;
        }
        .booking-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        .booking-info p {
          margin: 5px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #777;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${PETZIFY_LOGO_URL}" alt="Petzify Logo" class="logo">
          <div class="title">PET TRANSPORTATION REQUEST</div>
        </div>
        
        <div class="status-bar">
          Status: Request Received
        </div>
        
        <p>Dear ${customerName},</p>
        <p>Thank you for choosing Petzify for your pet transportation needs. Your transportation request has been received and is being processed.</p>
        
        <div class="section">
          <div class="section-title">Transportation Details</div>
          <div class="booking-info">
            <p><strong>Pet:</strong> ${petName} (${petType || 'Pet'})</p>
            <p><strong>Transport Type:</strong> ${transportType || 'Standard'}</p>
            <p><strong>Pickup Address:</strong> ${pickupAddress}</p>
            <p><strong>Dropoff Address:</strong> ${dropoffAddress}</p>
            <p><strong>Pickup Date:</strong> ${formattedPickupDate}</p>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">What's Next?</div>
          <p>Our team will review your transportation request and contact you shortly to confirm your booking and discuss any specific requirements for your pet's journey.</p>
          <p>If you need to modify or cancel your booking, please contact us as soon as possible.</p>
        </div>
        
        <div class="footer">
          <p>If you have any questions, please contact our support team at <a href="mailto:support@petzify.com">support@petzify.com</a>.</p>
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Business notification template for transportation
const getTransportationBusinessNotificationTemplate = (booking) => {
  const { customerName, customerEmail, customerPhone, petName, pickupAddress, dropoffAddress, pickupDate, transportType, petType, petSize, notes } = booking;
  
  // Format date
  const formattedPickupDate = pickupDate ? new Date(pickupDate.seconds * 1000).toLocaleDateString() : 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Pet Transportation Request</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          padding-bottom: 15px;
          border-bottom: 2px solid #14cca4;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #14cca4;
          margin: 10px 0;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #14cca4;
          margin-bottom: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        table td:first-child {
          font-weight: bold;
          width: 40%;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">NEW PET TRANSPORTATION REQUEST</div>
        </div>
        
        <div class="section">
          <div class="section-title">Customer Information</div>
          <table>
            <tr>
              <td>Name</td>
              <td>${customerName}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>${customerEmail}</td>
            </tr>
            <tr>
              <td>Phone</td>
              <td>${customerPhone || 'Not provided'}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Transportation Details</div>
          <table>
            <tr>
              <td>Pet Name</td>
              <td>${petName}</td>
            </tr>
            <tr>
              <td>Pet Type</td>
              <td>${petType || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Pet Size</td>
              <td>${petSize || 'Not specified'}</td>
            </tr>
            <tr>
              <td>Transport Type</td>
              <td>${transportType || 'Standard'}</td>
            </tr>
            <tr>
              <td>Pickup Address</td>
              <td>${pickupAddress}</td>
            </tr>
            <tr>
              <td>Dropoff Address</td>
              <td>${dropoffAddress}</td>
            </tr>
            <tr>
              <td>Pickup Date</td>
              <td>${formattedPickupDate}</td>
            </tr>
            <tr>
              <td>Special Notes</td>
              <td>${notes || 'None'}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <p>Please contact the customer to confirm this transportation request.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// --- Cloud Function for Pet Transportation Notifications ---
exports.onPetTransportationBooked = onDocumentCreated("petTransportation/{bookingId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("No data associated with the event");
    return;
  }
  
  const bookingData = snapshot.data();
  const bookingId = event.params.bookingId;
  
  if (!bookingData || !bookingData.customerEmail) {
    logger.error("Missing transportation booking data or customer email");
    return;
  }
  
  try {
    // Send email to customer
    const customerHtml = getPetTransportationBookedTemplate(bookingData);
    await sendEmail({
      to: bookingData.customerEmail,
      subject: "Pet Transportation Request Received - Petzify",
      html: customerHtml
    });
    
    // Send email notification to business
    const config = getEmailConfig();
    const businessHtml = getTransportationBusinessNotificationTemplate(bookingData);
    await sendEmail({
      to: config.businessEmail,
      subject: `New Pet Transportation Request - ${bookingData.petName}`,
      html: businessHtml
    });
    
    // Update booking with emailSent flag
    await db.collection('petTransportation').doc(bookingId).update({
      emailSent: true,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`Pet transportation notification emails sent for booking ${bookingId}`);
  } catch (error) {
    logger.error("Error sending pet transportation notification emails:", error);
  }
});
