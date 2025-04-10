const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();
const db = getFirestore();

// --- Configuration Fetching ---
const getEmailConfig = async () => {
    const portalEmail = process.env.GMAIL_EMAIL;
    const portalPassword = process.env.GMAIL_PASSWORD;
    const businessEmail = process.env.BUSINESS_EMAIL;
    if (!portalEmail || !portalPassword || !businessEmail) {
        throw new Error("Missing email settings from environment variables.");
    }
    return { portalEmail, portalPassword, businessEmail };
};

// --- Email Sending Utility ---
const sendEmail = async (config, { to, subject, text }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.portalEmail, pass: config.portalPassword },
    });

    try {
        await transporter.sendMail({
            from: `Petzify <${config.portalEmail}>`,
            to,
            subject,
            text,
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Email failed: ${error}`);
        throw new Error(`Email failed: ${error.message}`);
    }
};

// --- Cloud Function: onOrderCreated ---
exports.onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
    const order = event.data?.data();
    if (!order?.userEmail) return;

    try {
        const config = await getEmailConfig();
        const orderId = event.params.orderId;

        await Promise.all([
            sendEmail(config, {
                to: order.userEmail,
                subject: `Petzify Order Confirmation - #${orderId}`,
                text: `Your order (#${orderId}) has been received.`,
            }),
            sendEmail(config, {
                to: config.businessEmail,
                subject: `New Petzify Order Received - #${orderId}`,
                text: `New order: ${orderId}, Customer: ${order.userEmail}`,
            }),
        ]);

        console.log(`Emails sent for order creation: ${orderId}`);
    } catch (error) {
        console.error("Error processing order creation:", error);
    }
});

// --- Cloud Function: onOrderUpdated ---
exports.onOrderUpdated = onDocumentUpdated("orders/{orderId}", async (event) => {
    const { before, after } = event.data || {};
    if (!before?.data || !after?.data) return;

    const beforeStatus = before.data().status;
    const afterStatus = after.data().status;
    if (beforeStatus === afterStatus || !after.data()?.userEmail) return;

    try {
        const config = await getEmailConfig();
        const orderId = event.params.orderId;

        await sendEmail(config, {
            to: after.data().userEmail,
            subject: `Petzify Order Status Update - #${orderId}`,
            text: `Order status updated to: ${afterStatus}`,
        });

        console.log(`Status update email sent for order: ${orderId}`);
    } catch (error) {
        console.error("Error processing order update:", error);
    }
});