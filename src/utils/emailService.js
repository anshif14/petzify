/**
 * Email service utility for sending emails via Firebase Cloud Functions
 */

// Firebase functions URL
const FIREBASE_FUNCTIONS_URL = 'https://us-central1-petzify-49ed4.cloudfunctions.net';

/**
 * Send an email using the Firebase Cloud Function
 * @param {Object} emailDetails - Email details object
 * @param {string} emailDetails.to - Recipient email address
 * @param {string} emailDetails.subject - Email subject
 * @param {string} [emailDetails.html] - HTML content of the email (optional if using template)
 * @param {string} [emailDetails.cc] - Optional CC recipient
 * @param {string} [emailDetails.templateId] - ID of the email template to use
 * @param {Object} [emailDetails.dynamic_template_data] - Data to populate the template
 * @returns {Promise<Object>} - Response object with success/error information
 */
export const sendEmail = async ({ to, subject, html, cc, templateId, dynamic_template_data }) => {
  console.log('Starting email send process...', { to, subject, templateId });
  
  try {
    // Determine which endpoint to use based on whether a template is provided
    let endpoint = `${FIREBASE_FUNCTIONS_URL}/sendCustomEmail`;
    let bodyData = { to, subject, html, cc };
    
    // If a template ID is provided, adjust endpoint and body data
    if (templateId) {
      endpoint = `${FIREBASE_FUNCTIONS_URL}/sendTemplateEmail`;
      bodyData = { to, subject, templateId, dynamic_template_data, cc };
    }
    
    console.log('Sending email to endpoint:', endpoint);

    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    });

    console.log('Email API response status:', response.status);
    
    // Parse and log the response
    const responseData = await response.text();
    console.log('Email API response data:', responseData);

    // Check if the response is successful
    if (!response.ok) {
      console.error('Email send failed with status:', response.status);
      throw new Error(`Email send failed: ${responseData}`);
    }

    return { success: true, message: responseData };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a test email with preset content
 * @param {string} to - Recipient email address (defaults to anshifanu0@gmail.com if not provided)
 * @returns {Promise<Object>} - Response object with success/error information
 */
export const sendTestEmail = async (to = "anshifanu0@gmail.com") => {
  console.log('Sending test email to:', to);
  
  const testTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Petzify Test Email</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding-bottom: 20px; }
        .logo { max-width: 150px; }
        .content { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
        </div>
        <div class="content">
          <h2>Email System Test</h2>
          <p>This is a test email from Petzify to verify that the email system is working correctly.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>If you received this email, it means our notification system is working properly.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
          <p>123 Pet Street, Bangalore, India 560001</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to,
    subject: "Petzify Email System Test",
    html: testTemplate
  });
}; 