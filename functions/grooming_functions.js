/**
 * Grooming Email Functions for Petzify
 * Handles email notifications for grooming bookings
 */

const functions = require("firebase-functions/v2");
const nodemailer = require("nodemailer");

// Database instance will be injected from index.js
let db;

// Function to initialize with dependencies
exports.initialize = (firestore) => {
    db = firestore;
};

// ----- Email Configuration -----
const getEmailConfig = async () => {
    try {
        // Access environment variables directly in v2
        const portalEmail = process.env.GMAIL_EMAIL;
        const portalPassword = process.env.GMAIL_PASSWORD;
        const businessEmail = process.env.BUSINESS_EMAIL;
        
        if (!portalEmail || !portalPassword || !businessEmail) {
            throw new Error("Missing email settings from environment variables.");
        }
        
        return { portalEmail, portalPassword, businessEmail };
    } catch (error) {
        console.error('Error getting email config:', error);
        throw error;
    }
};

// ----- Send Email Utility -----
const sendEmail = async (config, { to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.portalEmail, pass: config.portalPassword },
    });

    try {
        await transporter.sendMail({
            from: `Petzify <${config.portalEmail}>`,
            to,
            subject,
            html,
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Email failed: ${error}`);
        throw new Error(`Email failed: ${error.message}`);
    }
};

// ----- Email Templates -----

// New Booking Template - Customer
const newBookingCustomerTemplate = (booking, bookingId) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Grooming Booking Confirmation</title>
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
                color: white;
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
            .booking-number {
                font-size: 18px;
                text-align: center;
                margin-bottom: 25px;
                color: #338981;
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
                color: #0c7c74;
                margin-bottom: 15px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px dashed #eee;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: 600;
                color: #555;
            }
            .info-value {
                color: #333;
                text-align: right;
            }
            .pet-info {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
            }
            .status {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                text-align: center;
                background-color: #fff3cd;
                color: #856404;
            }
            .cta-button {
                display: block;
                margin: 25px auto;
                padding: 12px 24px;
                background-color: #14cca4;
                color: white;
                text-decoration: none;
                text-align: center;
                border-radius: 6px;
                font-weight: 600;
                width: 200px;
            }
            .footer {
                background-color: #f1f1f1;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Petzify Grooming Services</h1>
            </div>
            <div class="main-content">
                <h2 class="heading">Booking Confirmation</h2>
                <p class="booking-number">Booking ID: #${bookingId.slice(-6)}</p>
                
                <div class="section">
                    <h3 class="section-title">Booking Details</h3>
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span class="info-value">${booking.date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Time:</span>
                        <span class="info-value">${booking.time}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Grooming Center:</span>
                        <span class="info-value">${booking.centerName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="status">${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Services Booked</h3>
                    ${booking.selectedServices.map(service => `
                        <div class="info-row">
                            <span class="info-label">${service}</span>
                        </div>
                    `).join('')}
                    <div class="info-row">
                        <span class="info-label">Total Cost:</span>
                        <span class="info-value">₹${booking.totalCost}</span>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Pet Information</h3>
                    <div class="pet-info">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${booking.petName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Breed:</span>
                            <span class="info-value">${booking.petBreed}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Age:</span>
                            <span class="info-value">${booking.petAge} years</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Weight:</span>
                            <span class="info-value">${booking.petWeight} kg</span>
                        </div>
                    </div>
                </div>
                
                ${booking.specialInstructions ? `
                <div class="section">
                    <h3 class="section-title">Special Instructions</h3>
                    <p>${booking.specialInstructions}</p>
                </div>
                ` : ''}
                
                <a href="https://petzify.com/bookings" class="cta-button">View Your Bookings</a>
                
                <p>Thank you for choosing Petzify for your pet grooming needs. If you have any questions about your booking, please contact the grooming center directly or email our support team.</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                <p>This is an automated email, please do not reply directly to this message.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// New Booking Template - Grooming Center
const newBookingCenterTemplate = (booking, bookingId) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Grooming Booking</title>
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
                color: white;
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
            .booking-number {
                font-size: 18px;
                text-align: center;
                margin-bottom: 25px;
                color: #338981;
            }
            .alert {
                background-color: #fff3cd;
                color: #856404;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 20px;
                font-weight: 500;
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
                color: #0c7c74;
                margin-bottom: 15px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px dashed #eee;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: 600;
                color: #555;
            }
            .info-value {
                color: #333;
                text-align: right;
            }
            .pet-info {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
            }
            .customer-info {
                background-color: #e8f4f8;
                border-radius: 8px;
                padding: 15px;
                margin-top: 15px;
            }
            .status {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                text-align: center;
                background-color: #fff3cd;
                color: #856404;
            }
            .cta-button {
                display: block;
                margin: 25px auto;
                padding: 12px 24px;
                background-color: #14cca4;
                color: white;
                text-decoration: none;
                text-align: center;
                border-radius: 6px;
                font-weight: 600;
                width: 200px;
            }
            .footer {
                background-color: #f1f1f1;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Petzify Business</h1>
            </div>
            <div class="main-content">
                <h2 class="heading">New Grooming Booking</h2>
                <p class="booking-number">Booking ID: #${bookingId.slice(-6)}</p>
                
                <div class="alert">
                    You have received a new grooming booking request. Please review and confirm the booking.
                </div>
                
                <div class="section">
                    <h3 class="section-title">Customer Information</h3>
                    <div class="customer-info">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${booking.userName || 'Not provided'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${booking.userEmail}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Phone:</span>
                            <span class="info-value">${booking.userPhone || 'Not provided'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Booking Details</h3>
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span class="info-value">${booking.date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Time:</span>
                        <span class="info-value">${booking.time}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="status">${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Services Requested</h3>
                    ${booking.selectedServices.map(service => `
                        <div class="info-row">
                            <span class="info-label">${service}</span>
                        </div>
                    `).join('')}
                    <div class="info-row">
                        <span class="info-label">Total Cost:</span>
                        <span class="info-value">₹${booking.totalCost}</span>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Pet Information</h3>
                    <div class="pet-info">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${booking.petName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Type:</span>
                            <span class="info-value">${booking.petType}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Breed:</span>
                            <span class="info-value">${booking.petBreed}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Age:</span>
                            <span class="info-value">${booking.petAge} years</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Weight:</span>
                            <span class="info-value">${booking.petWeight} kg</span>
                        </div>
                    </div>
                </div>
                
                ${booking.specialInstructions ? `
                <div class="section">
                    <h3 class="section-title">Special Instructions</h3>
                    <p>${booking.specialInstructions}</p>
                </div>
                ` : ''}
                
                <a href="https://petzify.com/admin/grooming-dashboard" class="cta-button">Manage Booking</a>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                <p>This is an automated email, please do not reply directly to this message.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Status Update Template - Customer
const statusUpdateCustomerTemplate = (booking, bookingId, previousStatus) => {
    let statusMessage = '';
    let nextSteps = '';

    switch(booking.status) {
        case 'confirmed':
            statusMessage = 'Your booking has been confirmed by the grooming center.';
            nextSteps = 'Please arrive on time for your appointment. Make sure your pet is ready for grooming.';
            break;
        case 'arrived':
            statusMessage = 'Your pet has been checked in at the grooming center.';
            nextSteps = 'The grooming process will begin shortly. You will receive another notification when the grooming is completed.';
            break;
        case 'completed':
            statusMessage = 'Your pet\'s grooming service has been completed.';
            nextSteps = 'You can now pick up your pet from the grooming center. We would love to hear your feedback about the service!';
            break;
        case 'cancelled':
            statusMessage = 'Your booking has been cancelled.';
            nextSteps = 'If you have any questions about the cancellation, please contact the grooming center directly.';
            break;
        default:
            statusMessage = `Your booking status has been updated to ${booking.status}.`;
            nextSteps = 'If you have any questions about this update, please contact the grooming center.';
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Status Update</title>
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
                color: white;
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
            .booking-number {
                font-size: 18px;
                text-align: center;
                margin-bottom: 25px;
                color: #338981;
            }
            .status-alert {
                background-color: #d4edda;
                color: #155724;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 20px;
                font-weight: 500;
                text-align: center;
            }
            .status-cancelled {
                background-color: #f8d7da;
                color: #721c24;
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
                color: #0c7c74;
                margin-bottom: 15px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px dashed #eee;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: 600;
                color: #555;
            }
            .info-value {
                color: #333;
                text-align: right;
            }
            .status-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 25px 0;
            }
            .status-label {
                font-weight: 600;
            }
            .status {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                text-align: center;
            }
            .status-pending {
                background-color: #fff3cd;
                color: #856404;
            }
            .status-confirmed {
                background-color: #cce5ff;
                color: #004085;
            }
            .status-arrived {
                background-color: #d1ecf1;
                color: #0c5460;
            }
            .status-completed {
                background-color: #d4edda;
                color: #155724;
            }
            .status-cancelled {
                background-color: #f8d7da;
                color: #721c24;
            }
            .next-steps {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
            }
            .cta-button {
                display: block;
                margin: 25px auto;
                padding: 12px 24px;
                background-color: #14cca4;
                color: white;
                text-decoration: none;
                text-align: center;
                border-radius: 6px;
                font-weight: 600;
                width: 200px;
            }
            .footer {
                background-color: #f1f1f1;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
            .rating-section {
                text-align: center;
                margin: 30px 0;
            }
            .rating-stars {
                font-size: 30px;
                letter-spacing: 10px;
                color: #ffc107;
                margin: 15px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Petzify Grooming Services</h1>
            </div>
            <div class="main-content">
                <h2 class="heading">Booking Status Update</h2>
                <p class="booking-number">Booking ID: #${bookingId.slice(-6)}</p>
                
                <div class="status-alert ${booking.status === 'cancelled' ? 'status-cancelled' : ''}">
                    ${statusMessage}
                </div>
                
                <div class="section">
                    <h3 class="section-title">Status Information</h3>
                    <div class="status-row">
                        <div>
                            <div class="status-label">Previous Status:</div>
                            <div class="status status-${previousStatus}">${previousStatus.charAt(0).toUpperCase() + previousStatus.slice(1)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div class="status-label">New Status:</div>
                            <div class="status status-${booking.status}">${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">Booking Details</h3>
                    <div class="info-row">
                        <span class="info-label">Date:</span>
                        <span class="info-value">${booking.date}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Time:</span>
                        <span class="info-value">${booking.time}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Grooming Center:</span>
                        <span class="info-value">${booking.centerName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Pet:</span>
                        <span class="info-value">${booking.petName}</span>
                    </div>
                </div>
                
                <div class="next-steps">
                    <h4 style="margin-top: 0;">Next Steps:</h4>
                    <p>${nextSteps}</p>
                </div>
                
                ${booking.status === 'completed' ? `
                <div class="rating-section">
                    <h3>How was your experience?</h3>
                    <p>We'd love to hear your feedback. Please rate your grooming experience:</p>
                    <div class="rating-stars">★★★★★</div>
                    <a href="https://petzify.com/bookings/rate/${bookingId}" class="cta-button">Rate Now</a>
                </div>
                ` : `
                <a href="https://petzify.com/bookings" class="cta-button">View Your Bookings</a>
                `}
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                <p>This is an automated email, please do not reply directly to this message.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// New Grooming Booking Created Function definition
const onGroomingBookingCreatedHandler = async (event) => {
    // Ensure db is initialized
    if (!db) {
        console.error("Firestore not initialized in grooming_functions");
        return;
    }

    const bookingData = event.data?.data();
    const bookingId = event.params.bookingId;
    
    // Exit if missing required data
    if (!bookingData || !bookingData.userEmail || !bookingId) {
        console.log('Insufficient data for sending email notification');
        return;
    }
    
    try {
        const config = await getEmailConfig();
        
        // Send email to customer
        await sendEmail(config, {
            to: bookingData.userEmail,
            subject: `Grooming Booking Confirmation - #${bookingId.slice(-6)}`,
            html: newBookingCustomerTemplate(bookingData, bookingId)
        });
        
        // Send email to grooming center if email is available
        if (bookingData.centerEmail) {
            await sendEmail(config, {
                to: bookingData.centerEmail,
                subject: `New Grooming Booking - #${bookingId.slice(-6)}`,
                html: newBookingCenterTemplate(bookingData, bookingId)
            });
        } else {
            // Try to fetch center email from grooming centers collection
            try {
                const centerDoc = await db.collection('groomingCenters').doc(bookingData.centerId).get();
                if (centerDoc.exists) {
                    const centerData = centerDoc.data();
                    if (centerData.email) {
                        await sendEmail(config, {
                            to: centerData.email,
                            subject: `New Grooming Booking - #${bookingId.slice(-6)}`,
                            html: newBookingCenterTemplate(bookingData, bookingId)
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching grooming center email:', error);
            }
        }
        
        // Send copy to business email
        await sendEmail(config, {
            to: config.businessEmail,
            subject: `New Grooming Booking - #${bookingId.slice(-6)}`,
            html: newBookingCenterTemplate(bookingData, bookingId)
        });
        
        console.log(`Emails sent for new grooming booking: ${bookingId}`);
    } catch (error) {
        console.error('Error sending grooming booking emails:', error);
    }
};

// Grooming Booking Status Updated Function definition
const onGroomingBookingUpdatedHandler = async (event) => {
    // Ensure db is initialized
    if (!db) {
        console.error("Firestore not initialized in grooming_functions");
        return;
    }

    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    const bookingId = event.params.bookingId;
    
    // Exit if missing required data or status hasn't changed
    if (!beforeData || !afterData || !bookingId || beforeData.status === afterData.status) {
        return;
    }
    
    // Track the status change
    const previousStatus = beforeData.status;
    
    try {
        const config = await getEmailConfig();
        
        // Send email to customer about the status update
        if (afterData.userEmail) {
            await sendEmail(config, {
                to: afterData.userEmail,
                subject: `Grooming Booking Update - #${bookingId.slice(-6)}`,
                html: statusUpdateCustomerTemplate(afterData, bookingId, previousStatus)
            });
        }
        
        // If the status is completed, also send a request for rating
        if (afterData.status === 'completed' && afterData.userEmail) {
            // Additional rating request is already included in the status update template
            console.log(`Rating request sent to ${afterData.userEmail} for booking ${bookingId}`);
        }
        
        console.log(`Status update email sent for grooming booking: ${bookingId}`);
    } catch (error) {
        console.error('Error sending grooming status update email:', error);
    }
};

// Export the cloud functions
exports.onGroomingBookingCreated = functions.firestore.onDocumentCreated("groomingBookings/{bookingId}", onGroomingBookingCreatedHandler);
exports.onGroomingBookingUpdated = functions.firestore.onDocumentUpdated("groomingBookings/{bookingId}", onGroomingBookingUpdatedHandler); 