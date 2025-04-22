const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const { onRequest } = require("firebase-functions/v2/https");
const cors = require("cors")({ origin: true });
initializeApp();
const db = getFirestore();

// --- Email Config Fetcher ---
const getEmailConfig = async () => {
    const portalEmail = process.env.GMAIL_EMAIL;
    const portalPassword = process.env.GMAIL_PASSWORD;
    const businessEmail = process.env.BUSINESS_EMAIL;
    if (!portalEmail || !portalPassword || !businessEmail) {
        throw new Error("Missing email settings from environment variables.");
    }
    return { portalEmail, portalPassword, businessEmail };
};

// --- Internal Send Email Utility ---
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

// --- 🔧 Reusable Custom Email Function ---
exports.sendCustomEmail = onRequest(async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const { to, subject, html } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).send("Missing required fields: to, subject, or html");
        }

        try {
            const config = await getEmailConfig();
            await sendEmail(config, { to, subject, html });
            return res.status(200).send(`Email sent to ${to}`);
        } catch (error) {
            console.error("Custom email error:", error);
            return res.status(500).send(`Failed to send email: ${error.message}`);
        }
    });
});

// --- 📦 Order Created Function ---
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

        const customerSubject = `Petzify Order Confirmation - #${orderId}`;
        const customerHtml = `
            <html>
            <body>
                <div style="font-family: Arial; max-width: 600px; margin: auto;">
                    <h2>Petzify Order Confirmation</h2>
                    <p>Hi ${order.userName || 'Customer'},</p>
                    <p>Thank you for your order <strong>#${orderId}</strong>.</p>
                    <h3>Items:</h3>
                    ${validProductDetails.map(item => `
                        <div>
                            <img src="${item.productData?.images?.[0] || 'https://via.placeholder.com/80'}" width="80" height="80" />
                            <p><strong>${item.productData?.name || 'Product Name'}</strong></p>
                            <p>Qty: ${item.quantity} | Price: ₹${item.price}</p>
                        </div>
                    `).join('')}
                    <p><strong>Subtotal: ₹${order.subtotal || 'N/A'}</strong></p>
                    <p>We'll notify you once your order is shipped.</p>
                </div>
            </body>
            </html>
        `;

        await sendCustomEmail({
            to: order.userEmail,
            subject: customerSubject,
            html: customerHtml,
        });

        const businessSubject = `New Petzify Order Received - #${orderId}`;
        const businessText = `Order ID: ${orderId}\nCustomer: ${order.userName || 'N/A'}\nEmail: ${order.userEmail}\nSubtotal: ₹${order.subtotal || 'N/A'}\n\nCheck Admin Panel.`;

        await sendCustomEmail({
            to: config.businessEmail,
            subject: businessSubject,
            html: `<pre>${businessText}</pre>`,
        });

    } catch (error) {
        console.error("Error processing order creation:", error);
    }
});

// --- 📦 Order Updated Function ---
exports.onOrderUpdated = onDocumentUpdated("orders/{orderId}", async (event) => {
    const { before, after } = event.data || {};
    if (!before?.data || !after?.data || before.data().status === after.data().status || !after.data()?.userEmail) return;

    const orderId = event.params.orderId;
    const newStatus = after.data().status;

    try {
        const subject = `Petzify Order Status Updated - #${orderId}`;
        const html = `
            <html>
            <body>
                <div style="font-family: Arial; max-width: 600px; margin: auto;">
                    <h2>Status Update</h2>
                    <p>Hi ${after.data().userName || 'Customer'},</p>
                    <p>Your order <strong>#${orderId}</strong> is now <strong>${newStatus}</strong>.</p>
                    <p>Check your app or website for details.</p>
                </div>
            </body>
            </html>
        `;

        await sendCustomEmail({
            to: after.data().userEmail,
            subject,
            html,
        });

    } catch (error) {
        console.error("Error processing order update:", error);
    }
});
