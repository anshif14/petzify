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

        await sendEmail(config, {
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

        await sendEmail(config, {
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
                await sendEmail(config, {
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
    const orderData = after.data();

    try {
        // Get product details if needed for the email
        let productDetails = [];
        if (orderData.items && Array.isArray(orderData.items)) {
            productDetails = orderData.items;
        }

        let subject = '';
        let html = '';

        switch (newStatus) {
            case 'confirmed':
                subject = `Petzify Order Confirmed - #${orderId.slice(-6)}`;
                html = `
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Confirmation</title>
                        <style>
                            body, html {
                                margin: 0;
                                padding: 0;
                                font-family: Arial, sans-serif;
                                color: #333333;
                                line-height: 1.6;
                                background-color: #f9f9f9;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                background-color: #ffffff;
                            }
                            .header {
                                text-align: center;
                                padding: 20px;
                                background-color: #232f3e;
                            }
                            .logo {
                                max-width: 150px;
                            }
                            .main-content {
                                padding: 20px;
                            }
                            .heading {
                                font-size: 22px;
                                font-weight: bold;
                                margin: 15px 0;
                                color: #000;
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
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.appspot.com/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <div class="heading">Order Confirmed</div>
                                <div class="status-bar">
                                    Status: Confirmed
                                </div>
                                <p>Hi ${orderData.userName || 'Customer'},</p>
                                <p>Your order <strong>#${orderId.slice(-6)}</strong> has been confirmed and is being prepared.</p>
                                <p>You'll receive another email when your order ships.</p>
                                <p>Check your app or website for more details.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            case 'dispatched':
                subject = `Your Petzify Order Has Been Shipped - #${orderId.slice(-6)}`;
                html = `
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Dispatched</title>
                        <style>
                            body, html {
                                margin: 0;
                                padding: 0;
                                font-family: Arial, sans-serif;
                                color: #333333;
                                line-height: 1.6;
                                background-color: #f9f9f9;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                background-color: #ffffff;
                            }
                            .header {
                                text-align: center;
                                padding: 20px;
                                background-color: #232f3e;
                            }
                            .logo {
                                max-width: 150px;
                            }
                            .main-content {
                                padding: 20px;
                            }
                            .order-nav {
                                display: flex;
                                justify-content: space-between;
                                background-color: #232f3e;
                                padding: 10px 20px;
                            }
                            .nav-item {
                                color: white;
                                text-decoration: none;
                                font-weight: bold;
                                font-size: 14px;
                            }
                            .heading {
                                font-size: 22px;
                                font-weight: bold;
                                margin: 15px 0;
                                color: #000;
                            }
                            .shipping-progress {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin: 25px 0;
                                position: relative;
                            }
                            .progress-step {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                position: relative;
                                z-index: 1;
                                flex: 1;
                            }
                            .step-icon {
                                width: 25px;
                                height: 25px;
                                border-radius: 50%;
                                background-color: #cccccc;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                margin-bottom: 5px;
                                color: white;
                                font-weight: bold;
                            }
                            .step-icon.completed {
                                background-color: #009900;
                            }
                            .step-icon.current {
                                background-color: #009900;
                                box-shadow: 0 0 0 3px rgba(0, 153, 0, 0.2);
                            }
                            .step-label {
                                font-size: 12px;
                                text-align: center;
                                color: #555;
                                max-width: 80px;
                            }
                            .step-label.completed, .step-label.current {
                                font-weight: bold;
                                color: #000;
                            }
                            .progress-bar {
                                height: 3px;
                                background-color: #cccccc;
                                width: 100%;
                                position: absolute;
                                top: 12px;
                                left: 0;
                                z-index: 0;
                            }
                            .progress-bar-fill {
                                height: 100%;
                                background-color: #009900;
                                width: 33%;
                            }
                            .tracking-info {
                                background-color: #f3f3f3;
                                border-radius: 4px;
                                padding: 15px;
                                margin-bottom: 20px;
                            }
                            .tracking-heading {
                                font-size: 16px;
                                font-weight: bold;
                                margin-bottom: 10px;
                            }
                            .tracking-details {
                                font-size: 14px;
                                margin-bottom: 10px;
                            }
                            .tracking-button {
                                display: inline-block;
                                background-color: #ffd814;
                                border: none;
                                border-radius: 4px;
                                padding: 8px 15px;
                                font-weight: bold;
                                text-decoration: none;
                                color: #000;
                                margin-top: 10px;
                            }
                            .product-item {
                                display: flex;
                                padding: 15px 0;
                                border-bottom: 1px solid #eeeeee;
                            }
                            .product-image {
                                width: 80px;
                                height: 80px;
                                object-fit: cover;
                                margin-right: 15px;
                            }
                            .product-details {
                                flex: 1;
                            }
                            .product-name {
                                font-weight: bold;
                                margin-bottom: 5px;
                                font-size: 14px;
                            }
                            .product-price {
                                font-weight: bold;
                                margin-top: 5px;
                                font-size: 16px;
                            }
                            .footer {
                                background-color: #232f3e;
                                color: white;
                                text-align: center;
                                padding: 15px;
                                font-size: 12px;
                            }
                            .footer a {
                                color: #ffffff;
                                text-decoration: underline;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.appspot.com/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify" class="logo">
                            </div>
                            
                            <div class="order-nav">
                                <a href="https://petzify.com/orders" class="nav-item">Your Orders</a>
                                <a href="https://petzify.com/account" class="nav-item">Your Account</a>
                                <a href="https://petzify.com/shop" class="nav-item">Buy Again</a>
                            </div>
                            
                            <div class="main-content">
                                <div class="heading">Your package was shipped!</div>
                                
                                <div class="shipping-progress">
                                    <div class="progress-bar">
                                        <div class="progress-bar-fill"></div>
                                    </div>
                                    <div class="progress-step">
                                        <div class="step-icon completed">✓</div>
                                        <div class="step-label completed">Ordered</div>
                                    </div>
                                    <div class="progress-step">
                                        <div class="step-icon current">✓</div>
                                        <div class="step-label current">Shipped</div>
                                    </div>
                                    <div class="progress-step">
                                        <div class="step-icon">3</div>
                                        <div class="step-label">Out for delivery</div>
                                    </div>
                                    <div class="progress-step">
                                        <div class="step-icon">4</div>
                                        <div class="step-label">Delivered</div>
                                    </div>
                                </div>
                                
                                <div class="heading">Arriving soon</div>
                                <div>${orderData.shippingAddress || 'Your registered address'}</div>
                                <div>Order # ${orderId.slice(-6)}</div>
                                
                                <div class="tracking-info">
                                    <div class="tracking-heading">Tracking Information</div>
                                    <div class="tracking-details">
                                        <strong>Courier:</strong> ${orderData.courierCompany || orderData.courierDetails?.company || 'Standard Delivery'}
                                    </div>
                                    <div class="tracking-details">
                                        <strong>Tracking Number:</strong> ${orderData.trackingNumber || orderData.courierDetails?.trackingNumber || 'Not available'}
                                    </div>
                                    <a href="https://petzify.com/track" class="tracking-button">Track package</a>
                                </div>
                                
                                <div style="font-weight: bold; margin-top: 15px; font-size: 16px;">Order Details</div>
                                
                                ${productDetails.map(item => `
                                    <div class="product-item">
                                        <img src="${item.image || item.productData?.images?.[0] || 'https://via.placeholder.com/80'}" class="product-image" alt="${item.name || 'Product'}">
                                        <div class="product-details">
                                            <div class="product-name">${item.name || item.productData?.name || 'Product'}</div>
                                            <div>Quantity: ${item.quantity}</div>
                                            <div class="product-price">₹${parseFloat(item.price).toFixed(2)}</div>
                                        </div>
                                    </div>
                                `).join('')}
                                
                                <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <span>Subtotal:</span>
                                        <span>₹${parseFloat(orderData.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                                        <span>Total:</span>
                                        <span>₹${parseFloat(orderData.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="footer">
                                <p>If you have any questions about your order, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
                                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            case 'delivered':
                subject = `Petzify Order Delivered - #${orderId.slice(-6)}`;
                html = `
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Delivered</title>
                        <style>
                            body, html {
                                margin: 0;
                                padding: 0;
                                font-family: Arial, sans-serif;
                                color: #333333;
                                line-height: 1.6;
                                background-color: #f9f9f9;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                background-color: #ffffff;
                            }
                            .header {
                                text-align: center;
                                padding: 20px;
                                background-color: #232f3e;
                            }
                            .logo {
                                max-width: 150px;
                            }
                            .main-content {
                                padding: 20px;
                            }
                            .heading {
                                font-size: 22px;
                                font-weight: bold;
                                margin: 15px 0;
                                color: #000;
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
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.appspot.com/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <div class="heading">Order Delivered</div>
                                <div class="status-bar">
                                    Status: Delivered
                                </div>
                                <p>Hi ${orderData.userName || 'Customer'},</p>
                                <p>Your order <strong>#${orderId.slice(-6)}</strong> has been delivered.</p>
                                <p>Thank you for shopping with Petzify!</p>
                                <p>We hope you enjoy your purchase. If you have any feedback or concerns, please let us know.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            case 'cancelled':
                subject = `Petzify Order Cancelled - #${orderId.slice(-6)}`;
                html = `
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Cancelled</title>
                        <style>
                            body, html {
                                margin: 0;
                                padding: 0;
                                font-family: Arial, sans-serif;
                                color: #333333;
                                line-height: 1.6;
                                background-color: #f9f9f9;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                background-color: #ffffff;
                            }
                            .header {
                                text-align: center;
                                padding: 20px;
                                background-color: #232f3e;
                            }
                            .logo {
                                max-width: 150px;
                            }
                            .main-content {
                                padding: 20px;
                            }
                            .heading {
                                font-size: 22px;
                                font-weight: bold;
                                margin: 15px 0;
                                color: #000;
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
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.appspot.com/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <div class="heading">Order Cancelled</div>
                                <div class="status-bar">
                                    Status: Cancelled
                                </div>
                                <p>Hi ${orderData.userName || 'Customer'},</p>
                                <p>Your order <strong>#${orderId.slice(-6)}</strong> has been cancelled.</p>
                                <p>If you have any questions about this cancellation, please contact our customer support.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            default:
                subject = `Petzify Order Status Updated - #${orderId.slice(-6)}`;
                html = `
                    <html>
                    <body>
                        <div style="font-family: Arial; max-width: 600px; margin: auto;">
                            <h2>Status Update</h2>
                            <p>Hi ${orderData.userName || 'Customer'},</p>
                            <p>Your order <strong>#${orderId}</strong> is now <strong>${newStatus}</strong>.</p>
                            <p>Check your app or website for details.</p>
                        </div>
                    </body>
                    </html>
                `;
        }

        const config = await getEmailConfig();

        await sendEmail(config, {
            to: orderData.userEmail,
            subject,
            html,
        });

    } catch (error) {
        console.error("Error processing order update:", error);
    }
});
