/**
 * Email service utility for sending emails via Firebase Cloud Functions
 */

/**
 * Send an email using the Firebase Cloud Function
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @param {string} [cc] - Optional CC recipient
 * @returns {Promise<Response>} - Fetch response object
 */
export const sendEmail = async ({ to, subject, html, cc = null }) => {
  try {
    const emailData = {
      to,
      subject,
      html
    };
    
    // Add CC if provided
    if (cc) {
      emailData.cc = cc;
    }
    
    const response = await fetch('https://us-central1-petzify-49ed4.cloudfunctions.net/sendCustomEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const data = await response.text(); // or .json() if your API returns JSON
    console.log("Email API Response:", data);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Re-throw to allow caller to handle errors
  }
};

/**
 * Send a test email with preset content
 * @param {string} to - Recipient email address (defaults to anshifanu0@gmail.com if not provided)
 * @returns {Promise<Response>} - Fetch response object
 */
export const sendTestEmail = async (to = "anshifanu0@gmail.com") => {
  return sendEmail({
    to,
    subject: "Test from Petzify App",
    html: "<h1>Hello!</h1><p>This is a test email from Petzify.</p>"
  });
}; 