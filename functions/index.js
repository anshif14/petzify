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

// --- Cloud Function: onOrderCreated ---
exports.onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
    const order = event.data?.data();
    if (!order?.userEmail || !order?.items) return;

    try {
        const config = await getEmailConfig();
        const orderId = event.params.orderId;

        const productDetails = await Promise.all(
            order.items.map(async (item) => {
                if (!item.productId || typeof item.productId !== 'string' || item.productId.trim() === '') {
                    console.error(`Invalid productId found in order item:`, item);
                    return null;
                }
                try {
                    const productSnap = await db.collection('products').doc(item.productId).get();
                    return { ...item, productData: productSnap.data() };
                } catch (error) {
                    console.error(`Error fetching product with ID ${item.productId}:`, error);
                    return null;
                }
            })
        );

        const validProductDetails = productDetails.filter(detail => detail !== null && detail.productData);

        // --- Customer Confirmation Email ---
        const customerSubject = `Petzify Order Confirmation - #${orderId}`;
        const customerHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
                    .header { background-color: #f9f9f9; padding: 10px 0; text-align: center; }
                    .logo { font-size: 24px; font-weight: bold; color: #333; }
                    .order-info { margin-top: 20px; }
                    .item { display: flex; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                    .item-image { width: 80px; height: 80px; margin-right: 10px; object-fit: cover; }
                    .item-details { flex-grow: 1; }
                    .total { margin-top: 20px; text-align: right; font-weight: bold; }
                    .footer { margin-top: 30px; text-align: center; color: #777; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">Petzify</div>
                    </div>
                    <div class="order-info">
                        <p>Hi ${order.userName || 'Customer'},</p>
                        <p>Thank you for your order! Your order number is <strong>#${orderId}</strong>.</p>
                        <h3>Order Details:</h3>
                        ${validProductDetails.map(item => `
                            <div class="item">
                                <img src="${item.productData?.images?.[0] || 'https://via.placeholder.com/80'}" alt="${item.productData?.name || 'Product Image'}" class="item-image">
                                <div class="item-details">
                                    <p><strong>${item.productData?.name || 'Product Name'}</strong></p>
                                    <p>Quantity: ${item.quantity}</p>
                                    <p>Price: ₹${item.price}</p>
                                </div>
                            </div>
                        `).join('')}
                        <div class="total">
                            <strong>Subtotal: ₹${order.subtotal || 'N/A'}</strong>
                        </div>
                        <p>We will notify you when your order has shipped.</p>
                    </div>
                    <div class="footer">
                        <p>Thank you for shopping with Petzify!</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await sendEmail(config, {
            to: order.userEmail,
            subject: customerSubject,
            html: customerHtml,
        });

        // --- Business Notification Email (Simplified) ---
        const businessSubject = `New Petzify Order Received - #${orderId}`;
        const businessText = `A new order has been placed:\n\n` +
            `Order ID: ${orderId}\n` +
            `Customer Name: ${order.userName || 'N/A'}\n` +
            `Customer Email: ${order.userEmail}\n` +
            `Subtotal: ₹${order.subtotal || 'N/A'}\n\n` +
            `Please process the order via the admin portal.`;

        await sendEmail(config, {
            to: config.businessEmail,
            subject: businessSubject,
            html: `<p>${businessText.replace(/\n/g, '<br>')}</p>`, // Basic HTML for business
        });

        console.log(`Emails sent for order creation: ${orderId}`);
    } catch (error) {
        console.error("Error processing order creation:", error);
    }
});

// --- Cloud Function: onOrderUpdated ---
exports.onOrderUpdated = onDocumentUpdated("orders/{orderId}", async (event) => {
    const { before, after } = event.data || {};
    if (!before?.data || !after?.data || before.data().status === after.data().status || !after.data()?.userEmail) return;

    const orderId = event.params.orderId;
    const newStatus = after.data().status;

    try {
        const config = await getEmailConfig();

        const subject = `Petzify Order Status Updated - #${orderId}`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
                    .header { background-color: #f9f9f9; padding: 10px 0; text-align: center; }
                    .logo { font-size: 24px; font-weight: bold; color: #333; }
                    .status-update { margin-top: 20px; }
                    .footer { margin-top: 30px; text-align: center; color: #777; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">Petzify</div>
                    </div>
                    <div class="status-update">
                        <p>Hi ${after.data().userName || 'Customer'},</p>
                        <p>Good news! The status of your order <strong>#${orderId}</strong> has been updated to:</p>
                        <h2>${newStatus}</h2>
                        <p>You can check the latest updates on our website or app.</p>
                    </div>
                    <div class="footer">
                        <p>Thank you for your patience!</p>
                        <p>- The Petzify Team</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await sendEmail(config, {
            to: after.data().userEmail,
            subject: subject,
            html: html,
        });

        console.log(`Status update email sent for order: ${orderId} to ${after.data().userEmail}`);
    } catch (error) {
        console.error("Error processing order update:", error);
    }
});