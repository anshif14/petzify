/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define the logo URL as a constant for consistency
const PETZIFY_LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2FScreenshot_2025-04-05_at_9.17.07_AM-removebg-preview.png?alt=media&token=5b05265c-ce3b-444d-a8dc-b8e3a838a050";

// --- Email Config ---
const getEmailConfig = () => {
  const portalEmail = process.env.GMAIL_EMAIL || "petzifyonline@gmail.com";
  const portalPassword = process.env.GMAIL_PASSWORD;
  const businessEmail = process.env.BUSINESS_EMAIL || "petzify.business@gmail.com";
  
  if (!portalPassword) {
    throw new Error("Missing GMAIL_PASSWORD environment variable");
  }
  
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

// --- Email Templates ---
const getAppointmentCreatedTemplate = (appointment) => {
  const { patientName, doctorName, appointmentDate, startTime, endTime, petName } = appointment;
  const formattedDate = appointmentDate ? new Date(appointmentDate.seconds * 1000).toLocaleDateString('en-US', {
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
      <title>Petzify Appointment Confirmation</title>
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
        .appointment-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        .appointment-info p {
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
          <div class="title">APPOINTMENT BOOKED</div>
        </div>
        
        <div class="status-bar">
          Status: Pending Confirmation
        </div>
        
        <p>Dear ${patientName},</p>
        <p>Thank you for booking an appointment with Petzify. Your appointment has been received and is awaiting confirmation from the veterinarian.</p>
        
        <div class="section">
          <div class="section-title">Appointment Details</div>
          <div class="appointment-info">
            <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">What's Next?</div>
          <p>Our veterinarian will review your booking and confirm the appointment. You will receive another email notification once it's confirmed.</p>
          <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>
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

// Add reminder email templates
const getAppointmentReminderPatientTemplate = (appointment) => {
  const { patientName, doctorName, appointmentDate, startTime, endTime, petName } = appointment;
  const formattedDate = appointmentDate ? new Date(appointmentDate.seconds * 1000).toLocaleDateString('en-US', {
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
      <title>Petzify Appointment Reminder</title>
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
        .reminder-banner {
          background-color: #ffd700;
          color: #333;
          padding: 15px;
          text-align: center;
          border-radius: 5px;
          margin: 15px 0;
          font-weight: bold;
          font-size: 18px;
        }
        .appointment-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .appointment-info p {
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
          <div class="title">APPOINTMENT REMINDER</div>
        </div>
        
        <div class="reminder-banner">
          Your appointment is in 30 minutes!
        </div>
        
        <p>Dear ${patientName},</p>
        <p>This is a friendly reminder that your appointment with Dr. ${doctorName} is scheduled to begin in 30 minutes.</p>
        
        <div class="appointment-info">
          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Pet:</strong> ${petName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
        </div>
        
        <p>Please ensure that you arrive on time. If you need to reschedule, please contact us immediately.</p>
        
        <div class="footer">
          <p>If you have any questions, please contact our support team at <a href="mailto:support@petzify.com">support@petzify.com</a>.</p>
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getAppointmentReminderDoctorTemplate = (appointment) => {
  const { patientName, doctorName, appointmentDate, startTime, endTime, petName, petType } = appointment;
  const formattedDate = appointmentDate ? new Date(appointmentDate.seconds * 1000).toLocaleDateString('en-US', {
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
      <title>Petzify Appointment Reminder</title>
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
        .reminder-banner {
          background-color: #ffd700;
          color: #333;
          padding: 15px;
          text-align: center;
          border-radius: 5px;
          margin: 15px 0;
          font-weight: bold;
          font-size: 18px;
        }
        .appointment-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .appointment-info p {
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
          <div class="title">APPOINTMENT REMINDER</div>
        </div>
        
        <div class="reminder-banner">
          Upcoming appointment in 30 minutes!
        </div>
        
        <p>Dear Dr. ${doctorName},</p>
        <p>This is a reminder that you have an appointment scheduled to begin in 30 minutes.</p>
        
        <div class="appointment-info">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Pet:</strong> ${petName} (${petType || 'N/A'})</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          ${appointment.reason ? `<p><strong>Reason:</strong> ${appointment.reason}</p>` : ''}
        </div>
        
        <p>Please ensure that you are prepared for this appointment.</p>
        
        <div class="footer">
          <p>If you have any questions, please contact the administrative team at <a href="mailto:admin@petzify.com">admin@petzify.com</a>.</p>
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getAppointmentConfirmedTemplate = (appointment) => {
  const { patientName, doctorName, appointmentDate, startTime, endTime, petName } = appointment;
  const formattedDate = appointmentDate ? new Date(appointmentDate.seconds * 1000).toLocaleDateString('en-US', {
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
      <title>Petzify Appointment Confirmed</title>
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
          background-color: #14cca4;
          color: white;
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
        .appointment-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        .appointment-info p {
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
          <div class="title">APPOINTMENT CONFIRMED</div>
        </div>
        
        <div class="status-bar">
          Status: Confirmed
        </div>
        
        <p>Dear ${patientName},</p>
        <p>Great news! Your appointment with Dr. ${doctorName} has been confirmed. We're looking forward to seeing you and ${petName}.</p>
        
        <div class="section">
          <div class="section-title">Appointment Details</div>
          <div class="appointment-info">
            <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          </div>
        </div>
        
    <div class="section">
  <div class="section-title">Preparation Tips for Online Consultation</div>
  <ul>
    <li>Please log in 10 minutes before your scheduled consultation time</li>
    <li>Keep any previous medical records of your pet ready for reference</li>
    <li>Ensure your pet is nearby and visible during the call for proper assessment</li>
    <li>If your pet is on any medication, have it on hand to discuss with the vet</li>
    <li>Consider not feeding your pet 4–6 hours before the consultation (water is fine), unless advised otherwise</li>
  </ul>
</div>


        
        <div class="footer">
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance at <a href="mailto:support@petzify.com">support@petzify.com</a>.</p>
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getAppointmentCompletedTemplate = (appointment) => {
  const { patientName, doctorName, appointmentDate, petName } = appointment;
  const formattedDate = appointmentDate ? new Date(appointmentDate.seconds * 1000).toLocaleDateString('en-US', {
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
      <title>Petzify Appointment Completed</title>
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
          background-color: #3f51b5;
          color: white;
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
        .appointment-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        .appointment-info p {
          margin: 5px 0;
        }
        .feedback-button {
          display: inline-block;
          background-color: #14cca4;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
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
          <div class="title">APPOINTMENT COMPLETED</div>
        </div>
        
        <div class="status-bar">
          Status: Completed
        </div>
        
        <p>Dear ${patientName},</p>
        <p>Thank you for visiting Petzify! Your appointment with Dr. ${doctorName} on ${formattedDate} has been completed.</p>
        
        <div class="section">
          <div class="section-title">Next Steps</div>
          <p>If Dr. ${doctorName} prescribed any medications or treatments for ${petName}, you will receive a prescription notification soon.</p>
          <p>You can view your prescriptions in your account dashboard at any time.</p>
        </div>
        
        <div class="section">
          <div class="section-title">We Value Your Feedback</div>
          <p>How was your experience with us? Your feedback helps us improve our services.</p>
          <div style="text-align: center;">
            <a href="https://petzify.com/feedback" class="feedback-button">Leave Feedback</a>
          </div>
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

const getPrescriptionUploadedTemplate = (appointment, prescription) => {
  const { patientName, doctorName, petName } = appointment;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Petzify Prescription Ready</title>
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
          background-color: #4caf50;
          color: white;
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
        .prescription-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
        }
        .prescription-info p {
          margin: 5px 0;
        }
        .download-button {
          display: inline-block;
          background-color: #14cca4;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
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
          <div class="title">PRESCRIPTION READY</div>
        </div>
        
        <div class="status-bar">
          Status: Prescription Available
        </div>
        
        <p>Dear ${patientName},</p>
        <p>Your prescription for ${petName} from Dr. ${doctorName} is now available.</p>
        
        <div class="section">
          <div class="section-title">Prescription Details</div>
          <div class="prescription-info">
            <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Type:</strong> ${prescription.type === 'generated' ? 'Generated Prescription' : 'Uploaded Prescription'}</p>
            <p><strong>Date:</strong> ${prescription.createdAt ? new Date(prescription.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Download Your Prescription</div>
          <p>You can view and download your prescription from your Petzify account dashboard or by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${prescription.prescriptionURL}" class="download-button">Download Prescription</a>
          </div>
        </div>
        
        <div class="footer">
          <p>If you have any questions about your prescription, please contact Dr. ${doctorName} or our support team at <a href="mailto:support@petzify.com">support@petzify.com</a>.</p>
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// --- Cloud Functions for Appointment Notifications ---

// Function to trigger when a new appointment is created
exports.onAppointmentCreated = onDocumentCreated(
  "appointments/{appointmentId}",
  async (event) => {
    const appointmentData = event.data?.data();
    const appointmentId = event.params.appointmentId;
    
    if (!appointmentData || !appointmentData.patientEmail) {
      logger.error("Missing appointment data or patient email");
      return;
    }
    
    try {
      // Initialize reminderSent field for this appointment
      await db.collection('appointments').doc(appointmentId).update({
        reminderSent: false
      });
      
      // Send email to patient
      const patientHtml = getAppointmentCreatedTemplate(appointmentData);
      await sendEmail({
        to: appointmentData.patientEmail,
        subject: "Appointment Booked - Petzify",
        html: patientHtml
      });
      
      // Send email notification to doctor if doctor email is available
      if (appointmentData.doctorId) {
        try {
          const doctorDoc = await db.collection('doctors').doc(appointmentData.doctorId).get();
          const doctorData = doctorDoc.data();
          
          if (doctorData && doctorData.email) {
            const doctorHtml = `
              <html>
              <body>
                <div style="font-family: Arial; max-width: 600px; margin: auto;">
                  <h2>New Appointment Request</h2>
                  <p><strong>Appointment ID:</strong> ${appointmentId}</p>
                  <p><strong>Patient:</strong> ${appointmentData.patientName}</p>
                  <p><strong>Pet:</strong> ${appointmentData.petName} (${appointmentData.petType})</p>
                  <p><strong>Date:</strong> ${new Date(appointmentData.appointmentDate.seconds * 1000).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${appointmentData.startTime} - ${appointmentData.endTime}</p>
                  <p><strong>Reason:</strong> ${appointmentData.reason || 'Not specified'}</p>
                  <p>Please review this appointment request in your dashboard.</p>
                </div>
              </body>
              </html>
            `;
            
            await sendEmail({
              to: doctorData.email,
              subject: `New Appointment Request - ${appointmentData.patientName}`,
              html: doctorHtml
            });
          }
        } catch (error) {
          logger.error("Error sending doctor notification:", error);
        }
      }
      
      logger.info(`Appointment creation notification sent for appointment ${appointmentId}`);
    } catch (error) {
      logger.error("Error sending appointment creation notification:", error);
    }
  }
);

// Function to trigger when an appointment status is updated
exports.onAppointmentUpdated = onDocumentUpdated(
  "appointments/{appointmentId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const appointmentId = event.params.appointmentId;
    
    if (!beforeData || !afterData || !afterData.patientEmail) {
      logger.error("Missing appointment data or patient email");
      return;
    }
    
    try {
      // Check if appointment time changed (rescheduled)
      const timeChanged = beforeData.startTime !== afterData.startTime || 
                         beforeData.appointmentDate?.seconds !== afterData.appointmentDate?.seconds;
      
      if (timeChanged) {
        // Reset reminder for rescheduled appointments
        await db.collection('appointments').doc(appointmentId).update({
          reminderSent: false
        });
        logger.info(`Appointment ${appointmentId} was rescheduled, reset reminder flag`);
      }
      
      // Check if status has changed
      if (beforeData.status !== afterData.status) {
        // Handle status change based on new status
        switch (afterData.status) {
          case 'confirmed':
            const confirmedHtml = getAppointmentConfirmedTemplate(afterData);
            await sendEmail({
              to: afterData.patientEmail,
              subject: "Appointment Confirmed - Petzify",
              html: confirmedHtml
            });
            logger.info(`Appointment confirmation notification sent for appointment ${appointmentId}`);
            break;
            
          case 'completed':
            const completedHtml = getAppointmentCompletedTemplate(afterData);
            await sendEmail({
              to: afterData.patientEmail,
              subject: "Appointment Completed - Petzify",
              html: completedHtml
            });
            logger.info(`Appointment completion notification sent for appointment ${appointmentId}`);
            break;
            
          case 'cancelled':
            // Send cancellation email
            const cancelledHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Petzify Appointment Cancelled</title>
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
                    border-bottom: 2px solid #f44336;
                    margin-bottom: 20px;
                  }
                  .logo {
                    max-width: 180px;
                    margin-bottom: 10px;
                  }
                  .title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #f44336;
                    margin: 10px 0;
                  }
                  .status-bar {
                    background-color: #f44336;
                    color: white;
                    padding: 10px 15px;
                    text-align: center;
                    border-radius: 5px;
                    margin: 15px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: bold;
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
                    <div class="title">APPOINTMENT CANCELLED</div>
                  </div>
                  
                  <div class="status-bar">
                    Status: Cancelled
                  </div>
                  
                  <p>Dear ${afterData.patientName},</p>
                  <p>Your appointment with Dr. ${afterData.doctorName} scheduled for ${new Date(afterData.appointmentDate.seconds * 1000).toLocaleDateString()} at ${afterData.startTime} has been cancelled.</p>
                  <p>If you did not request this cancellation, please contact our support team for assistance.</p>
                  <p>You can schedule a new appointment at any time through the Petzify app or website.</p>
                  
                  <div class="footer">
                    <p>If you have any questions, please contact our support team at <a href="mailto:support@petzify.com">support@petzify.com</a>.</p>
                    <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `;
            
            await sendEmail({
              to: afterData.patientEmail,
              subject: "Appointment Cancelled - Petzify",
              html: cancelledHtml
            });
            logger.info(`Appointment cancellation notification sent for appointment ${appointmentId}`);
            break;
        }
      }
    } catch (error) {
      logger.error("Error sending appointment update notification:", error);
    }
  }
);

// Function to trigger when a new prescription is created
exports.onPrescriptionCreated = onDocumentCreated(
  "doctorPrescriptions/{prescriptionId}",
  async (event) => {
    const prescriptionData = event.data?.data();
    const prescriptionId = event.params.prescriptionId;
    
    if (!prescriptionData || !prescriptionData.appointmentId) {
      logger.error("Missing prescription data or appointment ID");
      return;
    }
    
    try {
      // Get the appointment data to get patient email
      const appointmentDoc = await db.collection('appointments').doc(prescriptionData.appointmentId).get();
      
      if (!appointmentDoc.exists) {
        logger.error(`Appointment ${prescriptionData.appointmentId} not found for prescription ${prescriptionId}`);
        return;
      }
      
      const appointmentData = appointmentDoc.data();
      
      if (!appointmentData.patientEmail) {
        logger.error(`Patient email missing for appointment ${prescriptionData.appointmentId}`);
        return;
      }
      
      // Send prescription notification to patient
      const patientHtml = getPrescriptionUploadedTemplate(appointmentData, prescriptionData);
      await sendEmail({
        to: appointmentData.patientEmail,
        subject: "Prescription Ready - Petzify",
        html: patientHtml
      });
      
      logger.info(`Prescription notification sent for prescription ${prescriptionId}`);
    } catch (error) {
      logger.error("Error sending prescription notification:", error);
    }
  }
);

// Function to send reminders for upcoming appointments
const { onSchedule } = require("firebase-functions/v2/scheduler");
// const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// Scheduled function to run every 5 minutes to check for upcoming appointments
exports.sendAppointmentReminders = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "Asia/Kolkata", // Adjust to your timezone
}, async (event) => {
  logger.info("Checking for upcoming appointments that need reminders...");
  
  try {
    // Calculate the time window for appointments happening in 30 minutes
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const thirtyFiveMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000); // 35 minutes from now (5-minute buffer)
    
    const startTimestamp = Timestamp.fromDate(thirtyMinutesFromNow);
    const endTimestamp = Timestamp.fromDate(thirtyFiveMinutesFromNow);
    
    // Get appointments that start approximately 30 minutes from now and are confirmed
    const appointmentsQuery = db.collection('appointments')
      .where('status', '==', 'confirmed')
      .where('appointmentDate', '>=', new Date(now.setHours(0, 0, 0, 0))) // Today or later
      .where('appointmentDate', '<=', new Date(now.setHours(23, 59, 59, 999))) // Until end of today
      .where('reminderSent', '==', false); // Only appointments that haven't received reminders
    
    const appointmentsSnapshot = await appointmentsQuery.get();
    
    if (appointmentsSnapshot.empty) {
      logger.info("No upcoming appointments found needing reminders");
      return;
    }
    
    logger.info(`Found ${appointmentsSnapshot.size} appointments to check for reminders`);
    
    // Filter appointments that start in 30 minutes manually (since we can't query by time)
    const appointmentsToRemind = [];
    
    appointmentsSnapshot.forEach(doc => {
      const appointment = doc.data();
      const appointmentId = doc.id;
      
      // Get appointment time as HH:MM
      const startTime = appointment.startTime.split(' ')[0]; // Remove any AM/PM
      const [startHour, startMinute] = startTime.split(':').map(Number);
      
      // Get appointment date
      const appointmentDate = appointment.appointmentDate.toDate();
      
      // Create a Date object for the appointment
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(startHour, startMinute, 0, 0);
      
      // Check if this appointment is ~30 minutes away
      const timeDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60); // Difference in minutes
      
      if (timeDiff >= 25 && timeDiff <= 35) { // Within a 10-minute window around the 30-minute mark
        appointmentsToRemind.push({
          id: appointmentId,
          ...appointment
        });
      }
    });
    
    logger.info(`Found ${appointmentsToRemind.length} appointments to send reminders for`);
    
    // Send reminders for each applicable appointment
    for (const appointment of appointmentsToRemind) {
      try {
        // Send reminder to patient
        if (appointment.patientEmail) {
          const patientReminderHtml = getAppointmentReminderPatientTemplate(appointment);
          await sendEmail({
            to: appointment.patientEmail,
            subject: "Reminder: Your Appointment in 30 Minutes - Petzify",
            html: patientReminderHtml
          });
          logger.info(`Sent reminder to patient for appointment ${appointment.id}`);
        }
        
        // Send reminder to doctor
        if (appointment.doctorId) {
          try {
            const doctorDoc = await db.collection('doctors').doc(appointment.doctorId).get();
            const doctorData = doctorDoc.data();
            
            if (doctorData && doctorData.email) {
              const doctorReminderHtml = getAppointmentReminderDoctorTemplate(appointment);
              await sendEmail({
                to: doctorData.email,
                subject: `Reminder: Appointment with ${appointment.patientName} in 30 Minutes`,
                html: doctorReminderHtml
              });
              logger.info(`Sent reminder to doctor for appointment ${appointment.id}`);
            }
          } catch (error) {
            logger.error(`Error sending doctor reminder for appointment ${appointment.id}:`, error);
          }
        }
        
        // Update the appointment to mark reminder as sent
        await db.collection('appointments').doc(appointment.id).update({
          reminderSent: true
        });
        
      } catch (error) {
        logger.error(`Error sending reminders for appointment ${appointment.id}:`, error);
      }
    }
    
    logger.info("Completed sending appointment reminders");
    
  } catch (error) {
    logger.error("Error in appointment reminder function:", error);
  }
});
