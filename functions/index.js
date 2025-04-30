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
                    const productData = productSnap.data() || {};
                    // Get the seller's email if available
                    let sellerEmail = null;
                    if (productData.sellerId) {
                        try {
                            const sellerSnap = await db.collection('admin').doc(productData.sellerId).get();
                            const sellerData = sellerSnap.data();
                            if (sellerData?.email) {
                                sellerEmail = sellerData.email;
                            }
                        } catch (err) {
                            console.error(`Error fetching seller info for product ${item.productId}:`, err);
                        }
                    }
                    return { ...item, productData, sellerEmail };
                } catch (error) {
                    console.error(`Error fetching product with ID ${item.productId}:`, error);
                    return null;
                }
            })
        );

        const validProductDetails = productDetails.filter(detail => detail !== null && detail.productData);

        // Collect unique seller emails
        const sellerEmails = new Set();
        validProductDetails.forEach(item => {
            if (item.sellerEmail) {
                sellerEmails.add(item.sellerEmail);
            }
        });

        // Customer email
        const customerSubject = `Order Placed - #${orderId}`;
        const customerHtml = `
            <html>
            <body>
                <div style="font-family: Arial; max-width: 600px; margin: auto;">
                    <h2>Order Placed Successfully</h2>
                    <p>Hi ${order.userName || 'Customer'},</p>
                    <p>Thank you for your order <strong>#${orderId}</strong>.</p>
                    <h3>Items:</h3>
                    ${validProductDetails.map(item => `
                        <div style="display: flex; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                            <img src="${item.productData?.images?.[0] || 'https://via.placeholder.com/80'}" width="80" height="80" style="object-fit: cover; margin-right: 15px;" />
                            <div>
                                <p style="font-weight: bold; margin: 0 0 5px 0;">${item.productData?.name || 'Product Name'}</p>
                                <p style="margin: 0 0 5px 0;">Qty: ${item.quantity}</p>
                                <p style="margin: 0;">Price: ₹${item.price}</p>
                            </div>
                        </div>
                    `).join('')}
                    <p style="font-weight: bold; font-size: 16px; margin-top: 20px;">Subtotal: ₹${order.subtotal || 'N/A'}</p>
                    <p>We'll notify you once your order is shipped.</p>
                    <p style="margin-top: 30px; font-size: 12px; color: #777;">Thank you for shopping with Petzify!</p>
                </div>
            </body>
            </html>
        `;

        await sendCustomEmail({
            to: order.userEmail,
            subject: customerSubject,
            html: customerHtml,
        });

        // Business email
        const businessSubject = `New Order Received - #${orderId}`;
        const businessHtml = `
            <html>
            <body>
                <div style="font-family: Arial; max-width: 600px; margin: auto;">
                    <h2>New Order Received</h2>
                    <p><strong>Order ID:</strong> ${orderId}</p>
                    <p><strong>Customer:</strong> ${order.userName || 'N/A'}</p>
                    <p><strong>Email:</strong> ${order.userEmail}</p>
                    <p><strong>Phone:</strong> ${order.userPhone || 'N/A'}</p>
                    <p><strong>Subtotal:</strong> ₹${order.subtotal || 'N/A'}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Cash on Delivery'}</p>
                    
                    <h3>Order Items:</h3>
                    ${validProductDetails.map(item => `
                        <div style="margin-bottom: 10px;">
                            <p style="margin: 0;"><strong>${item.productData?.name || 'Product Name'}</strong> - Qty: ${item.quantity}, Price: ₹${item.price}</p>
                        </div>
                    `).join('')}
                    
                    <p style="margin-top: 20px;">Please check the admin panel for order details.</p>
                </div>
            </body>
            </html>
        `;

        await sendCustomEmail({
            to: config.businessEmail,
            subject: businessSubject,
            html: businessHtml,
        });

        // Send emails to sellers
        if (sellerEmails.size > 0) {
            const sellerSubject = `New Order for Your Product - #${orderId}`;
            const sellerHtml = `
                <html>
                <body>
                    <div style="font-family: Arial; max-width: 600px; margin: auto;">
                        <h2>New Order for Your Product</h2>
                        <p>A customer has ordered products that you sell.</p>
                        <p><strong>Order ID:</strong> ${orderId}</p>
                        <p><strong>Order Date:</strong> ${new Date().toLocaleString()}</p>
                        
                        <h3>Order Items:</h3>
                        ${validProductDetails.map(item => `
                            <div style="margin-bottom: 10px; padding: 10px; background-color: ${item.sellerEmail && sellerEmails.has(item.sellerEmail) ? '#f0f8ff' : '#f5f5f5'};">
                                <p style="margin: 0;"><strong>${item.productData?.name || 'Product Name'}</strong></p>
                                <p style="margin: 0;">Qty: ${item.quantity}, Price: ₹${item.price}</p>
                            </div>
                        `).join('')}
                        
                        <p style="margin-top: 20px;">Please check the seller dashboard for order details and prepare for shipping.</p>
                    </div>
                </body>
                </html>
            `;

            // Send to each seller
            for (const sellerEmail of sellerEmails) {
                await sendCustomEmail({
                    to: sellerEmail,
                    subject: sellerSubject,
                    html: sellerHtml,
                });
                console.log(`Order notification email sent to seller: ${sellerEmail}`);
            }
        }

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
