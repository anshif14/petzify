/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore(); 

// --- Cloud Functions ---
// Function to send email when a new appointment is created
exports.onAppointmentCreated = functions.firestore
  .document('appointments/{appointmentId}')
  .onCreate(async (snapshot, context) => {
    const appointmentData = snapshot.data();
    const appointmentId = context.params.appointmentId;
    
    if (!appointmentData || !appointmentData.patientEmail) {
      logger.error("Missing appointment data or patient email");
      return;
    }
    
    try {
      // Send email to patient
      const patientHtml = getAppointmentCreatedTemplate({ ...appointmentData, id: appointmentId });
      await sendEmail({
        to: appointmentData.patientEmail,
        subject: "Appointment Booked - Petzify",
        html: patientHtml
      });
      
      // Update appointment with emailSent flag
      await db.collection('appointments').doc(appointmentId).update({
        appointmentCreatedEmailSent: true,
        appointmentCreatedEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      logger.info(`Appointment creation email sent for appointment ${appointmentId}`);
    } catch (error) {
      logger.error("Error sending appointment creation email:", error);
    }
  });

// Function to trigger when an appointment status is updated
exports.onAppointmentUpdated = functions.firestore
  .document('appointments/{appointmentId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const appointmentId = context.params.appointmentId;
    
    // Skip sending notifications if email is missing
    if (!afterData || !afterData.patientEmail) {
      logger.error(`Missing patient email for appointment ${appointmentId}`);
      return;
    }
    
    // Check if status was changed to "confirmed"
    if (afterData.status === 'confirmed' && beforeData.status !== 'confirmed') {
      try {
        // Send confirmation email to patient
        const patientHtml = getAppointmentConfirmedTemplate({ ...afterData, id: appointmentId });
        await sendEmail({
          to: afterData.patientEmail,
          subject: "Appointment Confirmed - Petzify",
          html: patientHtml
        });
        
        // Update appointment with emailSent flag
        await db.collection('appointments').doc(appointmentId).update({
          confirmationEmailSent: true,
          confirmationEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info(`Confirmation email sent for appointment ${appointmentId}`);
      } catch (error) {
        logger.error("Error sending confirmation email:", error);
      }
    }
    
    // Check if status was changed to "completed"
    if (afterData.status === 'completed' && beforeData.status !== 'completed') {
      try {
        // Send completion email to patient
        const patientHtml = getAppointmentCompletedTemplate({ ...afterData, id: appointmentId });
        await sendEmail({
          to: afterData.patientEmail,
          subject: "Appointment Completed - Petzify",
          html: patientHtml
        });
        
        // Update appointment with emailSent flag
        await db.collection('appointments').doc(appointmentId).update({
          completionEmailSent: true,
          completionEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info(`Completion email sent for appointment ${appointmentId}`);
      } catch (error) {
        logger.error("Error sending completion email:", error);
      }
    }
  });

// Function to trigger when a new prescription is created
exports.onPrescriptionCreated = functions.firestore
  .document('doctorPrescriptions/{prescriptionId}')
  .onCreate(async (snapshot, context) => {
    const prescriptionData = snapshot.data();
    const prescriptionId = context.params.prescriptionId;
    
    if (!prescriptionData || !prescriptionData.appointmentId) {
      logger.error("Missing prescription data or appointment ID");
      return;
    }
    
    try {
      // Get appointment details to get patient email
      const appointmentDoc = await db.collection('appointments').doc(prescriptionData.appointmentId).get();
      const appointmentData = appointmentDoc.data();
      
      if (!appointmentData || !appointmentData.patientEmail) {
        logger.error("Missing appointment data or patient email");
        return;
      }
      
      // Send prescription notification to patient
      const patientHtml = getPrescriptionUploadedTemplate(appointmentData, prescriptionData);
      await sendEmail({
        to: appointmentData.patientEmail,
        subject: "Prescription Available - Petzify",
        html: patientHtml
      });
      
      // Update prescription with emailSent flag
      await db.collection('doctorPrescriptions').doc(prescriptionId).update({
        notificationSent: true,
        notificationSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      logger.info(`Prescription notification sent for prescription ${prescriptionId}`);
    } catch (error) {
      logger.error("Error sending prescription notification:", error);
    }
  }); 