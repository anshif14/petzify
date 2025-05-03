/**
 * Email templates for appointment status updates and prescriptions
 */

/**
 * Generate the email template for new appointment booking
 * @param {Object} appointment - Appointment data
 * @returns {string} - HTML email template for patient
 */
export const generateNewAppointmentPatientTemplate = (appointment) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmation</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333333;
          line-height: 1.6;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 25px 20px;
          background-color: #14cca4;
        }
        .logo {
          max-width: 180px;
        }
        .main-content {
          padding: 30px 25px;
        }
        .heading {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 20px 0;
          color: #0c7c74;
          text-align: center;
        }
        .appointment-info {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
        }
        .info-label {
          width: 140px;
          font-weight: 600;
          color: #555;
        }
        .info-value {
          flex: 1;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          background-color: #fff5e6;
          color: #ff9500;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f8f9fa;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
        </div>
        <div class="main-content">
          <h1 class="heading">Appointment Booked Successfully</h1>
          
          <p>Dear ${appointment.patientName},</p>
          
          <p>Thank you for booking an appointment with us. Your appointment has been registered and is awaiting confirmation by the doctor.</p>
          
          <div class="appointment-info">
            <div class="info-row">
              <div class="info-label">Doctor:</div>
              <div class="info-value">Dr. ${appointment.doctorName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Date:</div>
              <div class="info-value">${new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Time:</div>
              <div class="info-value">${appointment.startTime} - ${appointment.endTime}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Pet:</div>
              <div class="info-value">${appointment.petName} (${appointment.petType})</div>
            </div>
            <div class="info-row">
              <div class="info-label">Status:</div>
              <div class="info-value">
                <span class="status-badge">Pending</span>
              </div>
            </div>
          </div>
          
          <p>You will receive a confirmation email once the doctor confirms your appointment. You can also check the status of your appointment in the "My Appointments" section of your account.</p>
          
          <p>If you need to cancel or reschedule your appointment, please do so at least 24 hours in advance.</p>
          
          <p>Best regards,<br>The Petzify Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate the email template for new appointment booking - for doctor
 * @param {Object} appointment - Appointment data
 * @returns {string} - HTML email template for doctor
 */
export const generateNewAppointmentDoctorTemplate = (appointment) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Appointment Request</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333333;
          line-height: 1.6;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 25px 20px;
          background-color: #14cca4;
        }
        .logo {
          max-width: 180px;
        }
        .main-content {
          padding: 30px 25px;
        }
        .heading {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 20px 0;
          color: #0c7c74;
          text-align: center;
        }
        .appointment-info {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
        }
        .info-label {
          width: 140px;
          font-weight: 600;
          color: #555;
        }
        .info-value {
          flex: 1;
        }
        .cta-button {
          display: inline-block;
          background-color: #14cca4;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: 600;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f8f9fa;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
        </div>
        <div class="main-content">
          <h1 class="heading">New Appointment Request</h1>
          
          <p>Dear Dr. ${appointment.doctorName},</p>
          
          <p>You have received a new appointment request. Please review and confirm this appointment at your earliest convenience.</p>
          
          <div class="appointment-info">
            <div class="info-row">
              <div class="info-label">Patient:</div>
              <div class="info-value">${appointment.patientName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Contact:</div>
              <div class="info-value">${appointment.patientPhone}<br>${appointment.patientEmail}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Date:</div>
              <div class="info-value">${new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Time:</div>
              <div class="info-value">${appointment.startTime} - ${appointment.endTime}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Pet:</div>
              <div class="info-value">${appointment.petName} (${appointment.petType}${appointment.petBreed ? ` - ${appointment.petBreed}` : ''})</div>
            </div>
            <div class="info-row">
              <div class="info-label">Pet Age:</div>
              <div class="info-value">${appointment.petAge || 'Not specified'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Reason:</div>
              <div class="info-value">${appointment.reason || 'Not specified'}</div>
            </div>
            ${appointment.notes ? `
            <div class="info-row">
              <div class="info-label">Notes:</div>
              <div class="info-value">${appointment.notes}</div>
            </div>
            ` : ''}
          </div>
          
          <p>Please log in to your doctor dashboard to confirm or manage this appointment.</p>
          
          <a href="https://petzify-49ed4.web.app/admin-login" class="cta-button">Go to Dashboard</a>
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <p>Best regards,<br>The Petzify Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate the email template for appointment confirmation
 * @param {Object} appointment - Appointment data
 * @returns {string} - HTML email template
 */
export const generateAppointmentConfirmedTemplate = (appointment) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Confirmed</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333333;
          line-height: 1.6;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 25px 20px;
          background-color: #14cca4;
        }
        .logo {
          max-width: 180px;
        }
        .main-content {
          padding: 30px 25px;
        }
        .heading {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 20px 0;
          color: #0c7c74;
          text-align: center;
        }
        .appointment-info {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
        }
        .info-label {
          width: 140px;
          font-weight: 600;
          color: #555;
        }
        .info-value {
          flex: 1;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          background-color: #e3fcef;
          color: #0cce6b;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f8f9fa;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
        </div>
        <div class="main-content">
          <h1 class="heading">Appointment Confirmed</h1>
          
          <p>Dear ${appointment.patientName},</p>
          
          <p>Great news! Your appointment with Dr. ${appointment.doctorName} has been confirmed.</p>
          
          <div class="appointment-info">
            <div class="info-row">
              <div class="info-label">Doctor:</div>
              <div class="info-value">Dr. ${appointment.doctorName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Date:</div>
              <div class="info-value">${new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Time:</div>
              <div class="info-value">${appointment.startTime} - ${appointment.endTime}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Pet:</div>
              <div class="info-value">${appointment.petName} (${appointment.petType})</div>
            </div>
            <div class="info-row">
              <div class="info-label">Status:</div>
              <div class="info-value">
                <span class="status-badge">Confirmed</span>
              </div>
            </div>
          </div>
          
          <p><strong>Important:</strong> Please arrive at least 10 minutes before your scheduled appointment time. If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
          
          <p>You can view or manage your appointment in the "My Appointments" section of your account.</p>
          
          <p>We look forward to seeing you and ${appointment.petName}!</p>
          
          <p>Best regards,<br>The Petzify Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate the email template for completed appointment
 * @param {Object} appointment - Appointment data
 * @returns {string} - HTML email template
 */
export const generateAppointmentCompletedTemplate = (appointment) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Completed</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333333;
          line-height: 1.6;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 25px 20px;
          background-color: #14cca4;
        }
        .logo {
          max-width: 180px;
        }
        .main-content {
          padding: 30px 25px;
        }
        .heading {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 20px 0;
          color: #0c7c74;
          text-align: center;
        }
        .appointment-info {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
        }
        .info-label {
          width: 140px;
          font-weight: 600;
          color: #555;
        }
        .info-value {
          flex: 1;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          background-color: #e7f5ff;
          color: #0080ff;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f8f9fa;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
        </div>
        <div class="main-content">
          <h1 class="heading">Appointment Completed</h1>
          
          <p>Dear ${appointment.patientName},</p>
          
          <p>Thank you for visiting Dr. ${appointment.doctorName} with ${appointment.petName}. Your appointment has been marked as completed.</p>
          
          <div class="appointment-info">
            <div class="info-row">
              <div class="info-label">Doctor:</div>
              <div class="info-value">Dr. ${appointment.doctorName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Date:</div>
              <div class="info-value">${new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Time:</div>
              <div class="info-value">${appointment.startTime} - ${appointment.endTime}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Pet:</div>
              <div class="info-value">${appointment.petName} (${appointment.petType})</div>
            </div>
            <div class="info-row">
              <div class="info-label">Status:</div>
              <div class="info-value">
                <span class="status-badge">Completed</span>
              </div>
            </div>
          </div>
          
          <p>If the doctor has prescribed any medications or treatments, you will find them in the "My Appointments" section of your account. Any prescriptions will also be available there.</p>
          
          <p>We hope you and ${appointment.petName} had a great experience with us. If you have any questions about follow-up care, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>The Petzify Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate the email template for prescription notification
 * @param {Object} prescription - Prescription data
 * @param {Object} appointment - Appointment data
 * @returns {string} - HTML email template
 */
export const generatePrescriptionNotificationTemplate = (prescription, appointment) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prescription Available</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333333;
          line-height: 1.6;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 25px 20px;
          background-color: #14cca4;
        }
        .logo {
          max-width: 180px;
        }
        .main-content {
          padding: 30px 25px;
        }
        .heading {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 20px 0;
          color: #0c7c74;
          text-align: center;
        }
        .appointment-info {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
        }
        .info-label {
          width: 140px;
          font-weight: 600;
          color: #555;
        }
        .info-value {
          flex: 1;
        }
        .cta-button {
          display: inline-block;
          background-color: #14cca4;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: 600;
          margin-top: 10px;
        }
        .medications {
          background-color: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .medication-item {
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .medication-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .med-name {
          font-weight: 600;
          color: #0c7c74;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f8f9fa;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
        </div>
        <div class="main-content">
          <h1 class="heading">Prescription Available</h1>
          
          <p>Dear ${appointment.patientName},</p>
          
          <p>Your prescription following your recent appointment with Dr. ${appointment.doctorName} is now available.</p>
          
          <div class="appointment-info">
            <div class="info-row">
              <div class="info-label">Doctor:</div>
              <div class="info-value">Dr. ${appointment.doctorName}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Date:</div>
              <div class="info-value">${new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Pet:</div>
              <div class="info-value">${appointment.petName} (${appointment.petType})</div>
            </div>
          </div>
          
          ${prescription.medications && prescription.medications.length > 0 ? `
          <p><strong>Prescribed Medications:</strong></p>
          
          <div class="medications">
            ${prescription.medications.map(med => `
              <div class="medication-item">
                <div class="med-name">${med.name}</div>
                <div><strong>Dosage:</strong> ${med.dosage}</div>
                <div><strong>Frequency:</strong> ${med.frequency}</div>
                <div><strong>Duration:</strong> ${med.duration}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          <p>You can view and download your prescription from the "My Appointments" section of your account. Alternatively, you can download it directly from the link below:</p>
          
          <a href="${prescription.prescriptionURL}" class="cta-button">Download Prescription</a>
          
          <p>If you have any questions about your medication or treatment plan, please contact us directly.</p>
          
          <p>Best regards,<br>The Petzify Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}; 