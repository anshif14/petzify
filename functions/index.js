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
        const customerSubject = `Order Placed - #${orderId.slice(-6)}`;
        const customerHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Petzify Order Placed</title>
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
                    .order-number {
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
                    .steps {
                        display: flex;
                        justify-content: space-between;
                        margin: 30px 0;
                        position: relative;
                    }
                    .step {
                        position: relative;
                        z-index: 1;
                        text-align: center;
                        width: 25%;
                    }
                    .step-icon {
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background-color: #cccccc;
                        display: table-cell;
                        vertical-align: middle;
                        text-align: center;
                        margin: 0 auto 8px;
                        color: white;
                        font-weight: bold;
                        font-size: 14px;
                        line-height: 1;
                    }
                    .step-icon.active {
                        background-color: #14cca4;
                    }
                    .step-text {
                        font-size: 13px;
                        color: #555;
                    }
                    .step-text.active {
                        color: #14cca4;
                        font-weight: 600;
                    }
                    .step-line {
                        position: absolute;
                        top: 15px;
                        left: 12.5%;
                        right: 12.5%;
                        height: 2px;
                        background-color: #cccccc;
                        z-index: 0;
                    }
                    .step-line-progress {
                        position: absolute;
                        top: 0;
                        left: 0;
                        height: 100%;
                        width: 0%;
                        background-color: #14cca4;
                    }
                    .product-item {
                        display: flex;
                        padding: 15px 0;
                        border-bottom: 1px solid #eeeeee;
                    }
                    .product-item:last-child {
                        border-bottom: none;
                    }
                    .product-image {
                        width: 80px;
                        height: 80px;
                        object-fit: cover;
                        margin-right: 15px;
                        border-radius: 5px;
                        border: 1px solid #eee;
                    }
                    .product-details {
                        flex: 1;
                    }
                    .product-name {
                        font-weight: bold;
                        margin-bottom: 5px;
                        font-size: 16px;
                        color: #333;
                    }
                    .product-price {
                        font-weight: bold;
                        margin-top: 5px;
                        font-size: 16px;
                        color: #0c7c74;
                    }
                    .order-summary {
                        background-color: #f5f9f8;
                        border-radius: 5px;
                        padding: 15px;
                        margin-top: 25px;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    .summary-row.total {
                        font-weight: bold;
                        font-size: 18px;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                        margin-top: 10px;
                        color: #0c7c74;
                    }
                    .address-block {
                        background-color: #f5f9f8;
                        border-radius: 5px;
                        padding: 15px;
                        margin-bottom: 20px;
                    }
                    .footer {
                        background-color: #f5f9f8;
                        color: #555;
                        text-align: center;
                        padding: 20px;
                        font-size: 14px;
                        border-top: 1px solid #eee;
                    }
                    .social-links {
                        margin: 15px 0;
                    }
                    .social-links a {
                        display: inline-block;
                        margin: 0 10px;
                        color: #14cca4;
                        text-decoration: none;
                    }
                    .thank-you-box {
                        background-color: #e8f5e9;
                        border-radius: 5px;
                        padding: 15px;
                        margin: 20px 0;
                        text-align: center;
                        border-left: 4px solid #14cca4;
                    }
                    .next-steps {
                        background-color: #f5f9f8;
                        border-left: 4px solid #14cca4;
                        padding: 15px;
                        margin: 25px 0;
                        border-radius: 2px;
                    }
                    .next-steps-title {
                        color: #0c7c74;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }
                    .next-steps-list {
                        margin: 0;
                        padding-left: 25px;
                    }
                    .next-steps-list li {
                        margin-bottom: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2Flogo_white_text.png?alt=media&token=73a45d07-59ed-40b7-960a-486b1e340564" alt="Petzify" class="logo">
                    </div>
                    <div class="main-content">
                        <h1 class="heading">Order Placed Successfully</h1>
                        <p class="order-number">Order #${orderId.slice(-6)}</p>
                        
                        <p>Hello ${order.userName || 'Valued Customer'},</p>
                        <p>Thank you for your order! We're excited to confirm that your order has been received and is now being processed.</p>
                        
                        <div class="steps">
                            <div class="step-line">
                                <div class="step-line-progress"></div>
                            </div>
                            <div class="step">
                                <div class="step-icon active">1</div>
                                <div class="step-text active">Placed</div>
                            </div>
                            <div class="step">
                                <div class="step-icon">2</div>
                                <div class="step-text">Confirmed</div>
                            </div>
                            <div class="step">
                                <div class="step-icon">3</div>
                                <div class="step-text">Shipped</div>
                            </div>
                            <div class="step">
                                <div class="step-icon">4</div>
                                <div class="step-text">Delivered</div>
                            </div>
                        </div>

                        <div class="section">
                            <h2 class="section-title">Order Details</h2>
                            ${validProductDetails.map(item => `
                                <div class="product-item">
                                    <img src="${item.productData?.images?.[0] || 'https://via.placeholder.com/80'}" class="product-image" alt="${item.productData?.name || 'Product'}">
                                    <div class="product-details">
                                        <div class="product-name">${item.productData?.name || 'Product Name'}</div>
                                        <div>Quantity: ${item.quantity}</div>
                                        <div class="product-price">₹${parseFloat(item.price).toFixed(2)}</div>
                                    </div>
                                </div>
                            `).join('')}
                            
                            <div class="order-summary">
                                <div class="summary-row">
                                    <span>Subtotal:</span>
                                    <span>₹${parseFloat(order.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div class="summary-row">
                                    <span>Shipping:</span>
                                    <span>₹${parseFloat(order.shippingCost || 0).toFixed(2)}</span>
                                </div>
                                <div class="summary-row total">
                                    <span>Total:</span>
                                    <span>₹${parseFloat(order.totalAmount || order.subtotal || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h2 class="section-title">Shipping Information</h2>
                            <div class="address-block">
                                <strong>${order.userName || 'Customer'}</strong><br>
                                ${order.shippingAddress || 'Your registered address'}<br>
                                Phone: ${order.userPhone || 'Not provided'}
                            </div>
                        </div>
                        
                        <div class="next-steps">
                            <div class="next-steps-title">What's Next?</div>
                            <ul class="next-steps-list">
                                <li>Our team will review and confirm your order shortly</li>
                                <li>You'll receive another email when your order is confirmed</li>
                                <li>You can check your order status anytime in your Petzify account</li>
                            </ul>
                        </div>
                        
                        <div class="thank-you-box">
                            <p style="font-size: 18px; font-weight: bold; color: #0c7c74; margin-bottom: 10px;">Thank you for shopping with Petzify!</p>
                            <p>We're working hard to process your order as quickly as possible.</p>
                        </div>
                        
                        <p>If you have any questions about your order, please contact our customer support team at <a href="mailto:support@petzify.com" style="color: #14cca4; text-decoration: none;">support@petzify.com</a>.</p>
                        
                        <p style="margin-top: 30px;">
                            Warm regards,<br>
                            The Petzify Team
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                        <div class="social-links">
                            <a href="https://www.instagram.com/petzify_official/">Instagram</a>
                        </div>
                        <p>This email was sent to ${order.userEmail}</p>
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
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Confirmation</title>
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
                            .order-number {
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
                            .section-title {
                                font-size: 18px;
                                font-weight: 600;
                                color: #0c7c74;
                                margin-bottom: 15px;
                            }
                            .status-bar {
                                background-color: #14cca4;
                                color: white;
                                padding: 12px 15px;
                                text-align: center;
                                border-radius: 5px;
                                margin: 20px 0;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                                font-weight: bold;
                            }
                            .product-item {
                                display: flex;
                                padding: 15px 0;
                                border-bottom: 1px solid #eeeeee;
                            }
                            .product-item:last-child {
                                border-bottom: none;
                            }
                            .product-image {
                                width: 80px;
                                height: 80px;
                                object-fit: cover;
                                margin-right: 15px;
                                border-radius: 5px;
                                border: 1px solid #eee;
                            }
                            .product-details {
                                flex: 1;
                            }
                            .product-name {
                                font-weight: bold;
                                margin-bottom: 5px;
                                font-size: 16px;
                                color: #333;
                            }
                            .product-price {
                                font-weight: bold;
                                margin-top: 5px;
                                font-size: 16px;
                                color: #0c7c74;
                            }
                            .order-summary {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 15px;
                                margin-top: 25px;
                            }
                            .summary-row {
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 10px;
                            }
                            .summary-row.total {
                                font-weight: bold;
                                font-size: 18px;
                                border-top: 1px solid #ddd;
                                padding-top: 10px;
                                margin-top: 10px;
                                color: #0c7c74;
                            }
                            .address-block {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 15px;
                                margin-bottom: 20px;
                            }
                            .footer {
                                background-color: #f5f9f8;
                                color: #555;
                                text-align: center;
                                padding: 20px;
                                font-size: 14px;
                                border-top: 1px solid #eee;
                            }
                            .social-links {
                                margin: 15px 0;
                            }
                            .social-links a {
                                display: inline-block;
                                margin: 0 10px;
                                color: #14cca4;
                                text-decoration: none;
                            }
                            .steps {
                                display: flex;
                                justify-content: space-between;
                                margin: 30px 0;
                                position: relative;
                            }
                            .step {
                                position: relative;
                                z-index: 1;
                                text-align: center;
                                width: 25%;
                            }
                            .step-icon {
                                width: 30px;
                                height: 30px;
                                border-radius: 50%;
                                background-color: #cccccc;
                                display: table-cell;
                                vertical-align: middle;
                                text-align: center;
                                margin: 0 auto 8px;
                                color: white;
                                font-weight: bold;
                                font-size: 14px;
                                line-height: 1;
                            }
                            .step-icon.active {
                                background-color: #14cca4;
                            }
                            .step-text {
                                font-size: 13px;
                                color: #555;
                            }
                            .step-text.active {
                                color: #14cca4;
                                font-weight: 600;
                            }
                            .step-line {
                                position: absolute;
                                top: 15px;
                                left: 12.5%;
                                right: 12.5%;
                                height: 2px;
                                background-color: #cccccc;
                                z-index: 0;
                            }
                            .step-line-progress {
                                position: absolute;
                                top: 0;
                                left: 0;
                                height: 100%;
                                width: 0%;
                                background-color: #14cca4;
                            }
                            .next-steps {
                                background-color: #f5f9f8;
                                border-left: 4px solid #14cca4;
                                padding: 15px;
                                margin: 25px 0;
                                border-radius: 2px;
                            }
                            .next-steps-title {
                                color: #0c7c74;
                                font-weight: 600;
                                margin-bottom: 10px;
                            }
                            .next-steps-list {
                                margin: 0;
                                padding-left: 25px;
                            }
                            .next-steps-list li {
                                margin-bottom: 8px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2Flogo_white_text.png?alt=media&token=73a45d07-59ed-40b7-960a-486b1e340564" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <h1 class="heading">Order Confirmed</h1>
                                <p class="order-number">Order #${orderId.slice(-6)}</p>
                                
                                <p>Hello ${orderData.userName || 'Valued Customer'},</p>
                                <p>Thank you for your order! We're excited to confirm that your order has been received and is now being processed. We're working hard to get your items ready for shipment.</p>
                                
                                <div class="status-bar">
                                    Status: Confirmed
                                </div>
                                
                                <div class="steps">
                                    <div class="step-line">
                                        <div class="step-line-progress" style="width: 25%;"></div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon active">1</div>
                                        <div class="step-text active">Confirmed</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon">2</div>
                                        <div class="step-text">Shipped</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon">3</div>
                                        <div class="step-text">Out for Delivery</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon">4</div>
                                        <div class="step-text">Delivered</div>
                                    </div>
                                </div>

                                <div class="section">
                                    <h2 class="section-title">Order Details</h2>
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
                                    
                                    <div class="order-summary">
                                        <div class="summary-row">
                                            <span>Subtotal:</span>
                                            <span>₹${parseFloat(orderData.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                        <div class="summary-row">
                                            <span>Shipping:</span>
                                            <span>₹${parseFloat(orderData.shippingCost || 0).toFixed(2)}</span>
                                        </div>
                                        <div class="summary-row total">
                                            <span>Total:</span>
                                            <span>₹${parseFloat(orderData.totalAmount || orderData.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="section">
                                    <h2 class="section-title">Shipping Information</h2>
                                    <div class="address-block">
                                        <strong>${orderData.userName || 'Customer'}</strong><br>
                                        ${orderData.shippingAddress || 'Your registered address'}<br>
                                        Phone: ${orderData.userPhone || 'Not provided'}
                                    </div>
                                </div>
                                
                                <div class="next-steps">
                                    <div class="next-steps-title">What's Next?</div>
                                    <ul class="next-steps-list">
                                        <li>We're preparing your order for shipment</li>
                                        <li>You'll receive an email when your order ships with tracking information</li>
                                        <li>You can check your order status anytime in your Petzify account</li>
                                    </ul>
                                </div>
                                
                                <p>If you have any questions about your order, please don't hesitate to contact our customer support team at <a href="mailto:support@petzify.com" style="color: #14cca4; text-decoration: none;">support@petzify.com</a>.</p>
                                
                                <p>Thank you for choosing Petzify for your pet needs!</p>
                                
                                <p style="margin-top: 30px;">
                                    Warm regards,<br>
                                    The Petzify Team
                                </p>
                            </div>
                            
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                                <div class="social-links">
                                    <a href="https://www.instagram.com/petzify_official/">Instagram</a>
                                </div>
                                <p>This email was sent to ${orderData.userEmail}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            case 'dispatched':
                subject = `Your Petzify Order Has Been Shipped - #${orderId.slice(-6)}`;
                html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Dispatched</title>
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
                            .order-number {
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
                            .status-bar {
                                background-color: #14cca4;
                                color: white;
                                padding: 12px 15px;
                                text-align: center;
                                border-radius: 5px;
                                margin: 20px 0;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                                font-weight: bold;
                            }
                            .product-item {
                                display: flex;
                                padding: 15px 0;
                                border-bottom: 1px solid #eeeeee;
                            }
                            .product-item:last-child {
                                border-bottom: none;
                            }
                            .product-image {
                                width: 80px;
                                height: 80px;
                                object-fit: cover;
                                margin-right: 15px;
                                border-radius: 5px;
                                border: 1px solid #eee;
                            }
                            .product-details {
                                flex: 1;
                            }
                            .product-name {
                                font-weight: bold;
                                margin-bottom: 5px;
                                font-size: 16px;
                                color: #333;
                            }
                            .product-price {
                                font-weight: bold;
                                margin-top: 5px;
                                font-size: 16px;
                                color: #0c7c74;
                            }
                            .order-summary {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 15px;
                                margin-top: 25px;
                            }
                            .summary-row {
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 10px;
                            }
                            .summary-row.total {
                                font-weight: bold;
                                font-size: 18px;
                                border-top: 1px solid #ddd;
                                padding-top: 10px;
                                margin-top: 10px;
                                color: #0c7c74;
                            }
                            .tracking-info {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 20px;
                                margin: 20px 0;
                                border-left: 4px solid #14cca4;
                            }
                            .tracking-label {
                                font-weight: 600;
                                margin-right: 10px;
                                width: 140px;
                                display: inline-block;
                            }
                            .tracking-row {
                                margin-bottom: 12px;
                            }
                            .steps {
                                display: flex;
                                justify-content: space-between;
                                margin: 30px 0;
                                position: relative;
                            }
                            .step {
                                position: relative;
                                z-index: 1;
                                text-align: center;
                                width: 25%;
                            }
                            .step-icon {
                                width: 30px;
                                height: 30px;
                                border-radius: 50%;
                                background-color: #cccccc;
                                display: table-cell;
                                vertical-align: middle;
                                text-align: center;
                                margin: 0 auto 8px;
                                color: white;
                                font-weight: bold;
                                font-size: 14px;
                                line-height: 1;
                            }
                            .step-icon.active {
                                background-color: #14cca4;
                            }
                            .step-text {
                                font-size: 13px;
                                color: #555;
                            }
                            .step-text.active {
                                color: #14cca4;
                                font-weight: 600;
                            }
                            .step-line {
                                position: absolute;
                                top: 15px;
                                left: 12.5%;
                                right: 12.5%;
                                height: 2px;
                                background-color: #cccccc;
                                z-index: 0;
                            }
                            .step-line-progress {
                                position: absolute;
                                top: 0;
                                left: 0;
                                height: 100%;
                                width: 50%;
                                background-color: #14cca4;
                            }
                            .address-block {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 15px;
                                margin-bottom: 20px;
                            }
                            .footer {
                                background-color: #f5f9f8;
                                color: #555;
                                text-align: center;
                                padding: 20px;
                                font-size: 14px;
                                border-top: 1px solid #eee;
                            }
                            .social-links {
                                margin: 15px 0;
                            }
                            .social-links a {
                                display: inline-block;
                                margin: 0 10px;
                                color: #14cca4;
                                text-decoration: none;
                            }
                            .note-box {
                                background-color: #fff8e1;
                                border-radius: 5px;
                                padding: 15px;
                                margin: 15px 0;
                                font-size: 14px;
                                border-left: 4px solid #ffc107;
                            }
                            .estimated-delivery {
                                background-color: #e8f5e9;
                                border-radius: 5px;
                                padding: 15px;
                                margin: 15px 0;
                                font-size: 15px;
                                text-align: center;
                                color: #2e7d32;
                                font-weight: 600;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2Flogo_white_text.png?alt=media&token=73a45d07-59ed-40b7-960a-486b1e340564" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <h1 class="heading">Your Order Has Shipped!</h1>
                                <p class="order-number">Order #${orderId.slice(-6)}</p>
                                
                                <p>Hello ${orderData.userName || 'Valued Customer'},</p>
                                <p>Great news! Your order is on its way to you. We're pleased to inform you that your Petzify order has been shipped and is currently in transit.</p>
                                
                                <div class="status-bar">
                                    Status: Shipped
                                </div>
                                
                                <div class="steps">
                                    <div class="step-line">
                                        <div class="step-line-progress"></div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon active">✓</div>
                                        <div class="step-text active">Confirmed</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon active">✓</div>
                                        <div class="step-text active">Shipped</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon">3</div>
                                        <div class="step-text">Out for Delivery</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon">4</div>
                                        <div class="step-text">Delivered</div>
                                    </div>
                                </div>
                                
                                <div class="tracking-info">
                                    <h2 class="section-title" style="margin-top: 0;">Shipping & Tracking Details</h2>
                                    <div class="tracking-row">
                                        <span class="tracking-label">Courier:</span>
                                        <span>${orderData.courierCompany || orderData.courierDetails?.company || 'Standard Delivery'}</span>
                                    </div>
                                    <div class="tracking-row">
                                        <span class="tracking-label">Tracking Number:</span>
                                        <span>${orderData.trackingNumber || orderData.courierDetails?.trackingNumber || 'Not available'}</span>
                                    </div>
                                    <div class="tracking-row">
                                        <span class="tracking-label">Shipped Date:</span>
                                        <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                </div>
                                
                                <div class="note-box">
                                    <strong>Note:</strong> You can track your package by visiting the courier's website and entering your tracking number. Different courier services have different tracking systems.
                                </div>
                                
                                <div class="estimated-delivery">
                                    Estimated Delivery: ${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>

                                <div class="section">
                                    <h2 class="section-title">Shipping To</h2>
                                    <div class="address-block">
                                        <strong>${orderData.userName || 'Customer'}</strong><br>
                                        ${orderData.shippingAddress || 'Your registered address'}<br>
                                        Phone: ${orderData.userPhone || 'Not provided'}
                                    </div>
                                </div>

                                <div class="section">
                                    <h2 class="section-title">Order Details</h2>
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
                                    
                                    <div class="order-summary">
                                        <div class="summary-row">
                                            <span>Subtotal:</span>
                                            <span>₹${parseFloat(orderData.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                        <div class="summary-row">
                                            <span>Shipping:</span>
                                            <span>₹${parseFloat(orderData.shippingCost || 0).toFixed(2)}</span>
                                        </div>
                                        <div class="summary-row total">
                                            <span>Total:</span>
                                            <span>₹${parseFloat(orderData.totalAmount || orderData.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <p>If you have any questions about your order, please contact our customer support team at <a href="mailto:support@petzify.com" style="color: #14cca4; text-decoration: none;">support@petzify.com</a>.</p>
                                
                                <p>Thank you for shopping with Petzify!</p>
                                
                                <p style="margin-top: 30px;">
                                    Warm regards,<br>
                                    The Petzify Team
                                </p>
                            </div>
                            
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                                <div class="social-links">
                                    <a href="https://www.instagram.com/petzify_official/">Instagram</a>
                                </div>
                                <p>This email was sent to ${orderData.userEmail}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            case 'delivered':
                subject = `Petzify Order Delivered - #${orderId.slice(-6)}`;
                html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Delivered</title>
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
                            .order-number {
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
                            .status-bar {
                                background-color: #4caf50;
                                color: white;
                                padding: 12px 15px;
                                text-align: center;
                                border-radius: 5px;
                                margin: 20px 0;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                                font-weight: bold;
                            }
                            .product-item {
                                display: flex;
                                padding: 15px 0;
                                border-bottom: 1px solid #eeeeee;
                            }
                            .product-item:last-child {
                                border-bottom: none;
                            }
                            .product-image {
                                width: 80px;
                                height: 80px;
                                object-fit: cover;
                                margin-right: 15px;
                                border-radius: 5px;
                                border: 1px solid #eee;
                            }
                            .product-details {
                                flex: 1;
                            }
                            .product-name {
                                font-weight: bold;
                                margin-bottom: 5px;
                                font-size: 16px;
                                color: #333;
                            }
                            .product-price {
                                font-weight: bold;
                                margin-top: 5px;
                                font-size: 16px;
                                color: #0c7c74;
                            }
                            .order-summary {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 15px;
                                margin-top: 25px;
                            }
                            .summary-row {
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 10px;
                            }
                            .summary-row.total {
                                font-weight: bold;
                                font-size: 18px;
                                border-top: 1px solid #ddd;
                                padding-top: 10px;
                                margin-top: 10px;
                                color: #0c7c74;
                            }
                            .steps {
                                display: flex;
                                justify-content: space-between;
                                margin: 30px 0;
                                position: relative;
                            }
                            .step {
                                position: relative;
                                z-index: 1;
                                text-align: center;
                                width: 25%;
                            }
                            .step-icon {
                                width: 30px;
                                height: 30px;
                                border-radius: 50%;
                                background-color: #cccccc;
                                display: table-cell;
                                vertical-align: middle;
                                text-align: center;
                                margin: 0 auto 8px;
                                color: white;
                                font-weight: bold;
                                font-size: 14px;
                                line-height: 1;
                            }
                            .step-icon.active {
                                background-color: #14cca4;
                            }
                            .step-text {
                                font-size: 13px;
                                color: #555;
                            }
                            .step-text.active {
                                color: #14cca4;
                                font-weight: 600;
                            }
                            .step-line {
                                position: absolute;
                                top: 15px;
                                left: 12.5%;
                                right: 12.5%;
                                height: 2px;
                                background-color: #cccccc;
                                z-index: 0;
                            }
                            .step-line-progress {
                                position: absolute;
                                top: 0;
                                left: 0;
                                height: 100%;
                                width: 100%;
                                background-color: #14cca4;
                            }
                            .footer {
                                background-color: #f5f9f8;
                                color: #555;
                                text-align: center;
                                padding: 20px;
                                font-size: 14px;
                                border-top: 1px solid #eee;
                            }
                            .social-links {
                                margin: 15px 0;
                            }
                            .social-links a {
                                display: inline-block;
                                margin: 0 10px;
                                color: #14cca4;
                                text-decoration: none;
                            }
                            .celebration-box {
                                background-color: #e8f5e9;
                                border-radius: 5px;
                                padding: 20px;
                                margin: 20px 0;
                                text-align: center;
                                border: 1px dashed #4caf50;
                            }
                            .celebration-title {
                                font-size: 20px;
                                font-weight: bold;
                                color: #2e7d32;
                                margin-bottom: 10px;
                            }
                            .feedback-button {
                                display: inline-block;
                                background-color: #14cca4;
                                color: white;
                                padding: 10px 20px;
                                margin-top: 15px;
                                border-radius: 4px;
                                text-decoration: none;
                                font-weight: bold;
                            }
                            .review-box {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 20px;
                                margin: 20px 0;
                                text-align: center;
                                border-left: 4px solid #14cca4;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2Flogo_white_text.png?alt=media&token=73a45d07-59ed-40b7-960a-486b1e340564" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <h1 class="heading">Order Delivered</h1>
                                <p class="order-number">Order #${orderId.slice(-6)}</p>
                                
                                <div class="celebration-box">
                                    <div class="celebration-title">🎉 Your order has been delivered! 🎉</div>
                                    <p>We hope you and your pet are enjoying your purchase.</p>
                                </div>
                                
                                <p>Hello ${orderData.userName || 'Valued Customer'},</p>
                                <p>We're happy to inform you that your order has been delivered. We hope everything meets your expectations and your pet loves their new items!</p>
                                
                                <div class="status-bar">
                                    Status: Delivered
                                </div>
                                
                                <div class="steps">
                                    <div class="step-line">
                                        <div class="step-line-progress"></div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon active">✓</div>
                                        <div class="step-text active">Confirmed</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon active">✓</div>
                                        <div class="step-text active">Shipped</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon active">✓</div>
                                        <div class="step-text active">Out for Delivery</div>
                                    </div>
                                    <div class="step">
                                        <div class="step-icon active">✓</div>
                                        <div class="step-text active">Delivered</div>
                                    </div>
                                </div>

                                <div class="section">
                                    <h2 class="section-title">Order Details</h2>
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
                                    
                                    <div class="order-summary">
                                        <div class="summary-row">
                                            <span>Subtotal:</span>
                                            <span>₹${parseFloat(orderData.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                        <div class="summary-row">
                                            <span>Shipping:</span>
                                            <span>₹${parseFloat(orderData.shippingCost || 0).toFixed(2)}</span>
                                        </div>
                                        <div class="summary-row total">
                                            <span>Total:</span>
                                            <span>₹${parseFloat(orderData.totalAmount || orderData.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="review-box">
                                    <h3 style="color: #0c7c74; margin-top: 0;">Share Your Experience</h3>
                                    <p>Your feedback helps us improve and assists other pet parents in making informed decisions.</p>
                                    <a href="https://petzify.com/my-orders/${orderId}/review" class="feedback-button">Write a Review</a>
                                </div>
                                
                                <p>If there are any issues with your order or if you have any questions, please don't hesitate to contact our customer support team at <a href="mailto:support@petzify.com" style="color: #14cca4; text-decoration: none;">support@petzify.com</a>.</p>
                                
                                <p>Thank you for choosing Petzify for your pet needs. We hope to see you again soon!</p>
                                
                                <p style="margin-top: 30px;">
                                    With gratitude,<br>
                                    The Petzify Team
                                </p>
                            </div>
                            
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                                <div class="social-links">
                                    <a href="https://www.instagram.com/petzify_official/">Instagram</a>
                                </div>
                                <p>This email was sent to ${orderData.userEmail}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            case 'cancelled':
                subject = `Petzify Order Cancelled - #${orderId.slice(-6)}`;
                html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Cancelled</title>
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
                            .order-number {
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
                            .status-bar {
                                background-color: #f44336;
                                color: white;
                                padding: 12px 15px;
                                text-align: center;
                                border-radius: 5px;
                                margin: 20px 0;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                                font-weight: bold;
                            }
                            .product-item {
                                display: flex;
                                padding: 15px 0;
                                border-bottom: 1px solid #eeeeee;
                            }
                            .product-item:last-child {
                                border-bottom: none;
                            }
                            .product-image {
                                width: 80px;
                                height: 80px;
                                object-fit: cover;
                                margin-right: 15px;
                                border-radius: 5px;
                                border: 1px solid #eee;
                            }
                            .product-details {
                                flex: 1;
                            }
                            .product-name {
                                font-weight: bold;
                                margin-bottom: 5px;
                                font-size: 16px;
                                color: #333;
                            }
                            .product-price {
                                font-weight: bold;
                                margin-top: 5px;
                                font-size: 16px;
                                color: #0c7c74;
                            }
                            .order-summary {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 15px;
                                margin-top: 25px;
                            }
                            .summary-row {
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 10px;
                            }
                            .summary-row.total {
                                font-weight: bold;
                                font-size: 18px;
                                border-top: 1px solid #ddd;
                                padding-top: 10px;
                                margin-top: 10px;
                                color: #0c7c74;
                            }
                            .footer {
                                background-color: #f5f9f8;
                                color: #555;
                                text-align: center;
                                padding: 20px;
                                font-size: 14px;
                                border-top: 1px solid #eee;
                            }
                            .social-links {
                                margin: 15px 0;
                            }
                            .social-links a {
                                display: inline-block;
                                margin: 0 10px;
                                color: #14cca4;
                                text-decoration: none;
                            }
                            .info-box {
                                background-color: #fff3e0;
                                border-radius: 5px;
                                padding: 20px;
                                margin: 20px 0;
                                border-left: 4px solid #ff9800;
                            }
                            .info-title {
                                font-weight: 600;
                                margin-bottom: 10px;
                                color: #e65100;
                            }
                            .contact-box {
                                background-color: #f5f9f8;
                                border-radius: 5px;
                                padding: 20px;
                                margin: 20px 0;
                                text-align: center;
                            }
                            .contact-title {
                                font-weight: 600;
                                margin-bottom: 10px;
                                color: #0c7c74;
                            }
                            .shop-button {
                                display: inline-block;
                                background-color: #14cca4;
                                color: white;
                                padding: 10px 20px;
                                margin-top: 15px;
                                border-radius: 4px;
                                text-decoration: none;
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2Flogo_white_text.png?alt=media&token=73a45d07-59ed-40b7-960a-486b1e340564" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <h1 class="heading">Order Cancelled</h1>
                                <p class="order-number">Order #${orderId.slice(-6)}</p>
                                
                                <p>Hello ${orderData.userName || 'Valued Customer'},</p>
                                <p>We're writing to confirm that your order #${orderId.slice(-6)} has been cancelled as requested${orderData.cancellationReason ? ' for the following reason: ' + orderData.cancellationReason : ''}.</p>
                                
                                <div class="status-bar">
                                    Status: Cancelled
                                </div>

                                <div class="info-box">
                                    <div class="info-title">Cancellation Information</div>
                                    <p>Your order has been cancelled successfully. ${orderData.paymentMethod !== 'cod' ? 'If you have already been charged, a refund will be processed according to our refund policy and should reflect in your account within 5-7 business days.' : ''}</p>
                                </div>

                                <div class="section">
                                    <h2 class="section-title">Cancelled Items</h2>
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
                                    
                                    <div class="order-summary">
                                        <div class="summary-row total">
                                            <span>Order Total:</span>
                                            <span>₹${parseFloat(orderData.totalAmount || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="contact-box">
                                    <div class="contact-title">We're Here to Help</div>
                                    <p>If you have any questions about this cancellation or need further assistance, our customer service team is here to help.</p>
                                    <p>Email: <a href="mailto:support@petzify.com" style="color: #14cca4; text-decoration: none;">support@petzify.com</a><br>
                                    Phone: +91 1234567890<br>
                                    Hours: Monday-Friday, 9am-6pm IST</p>
                                    <a href="https://petzify.com/shop" class="shop-button">Continue Shopping</a>
                                </div>
                                
                                <p>We're sorry that this order didn't work out. We hope to see you back shopping with us soon!</p>
                                
                                <p style="margin-top: 30px;">
                                    Best regards,<br>
                                    The Petzify Team
                                </p>
                            </div>
                            
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                                <div class="social-links">
                                    <a href="https://www.instagram.com/petzify_official/">Instagram</a>
                                </div>
                                <p>This email was sent to ${orderData.userEmail}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                break;

            default:
                subject = `Petzify Order Status Updated - #${orderId.slice(-6)}`;
                html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Petzify Order Status Update</title>
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
                            .order-number {
                                font-size: 18px;
                                text-align: center;
                                margin-bottom: 25px;
                                color: #338981;
                            }
                            .section {
                                margin-bottom: 25px;
                                padding-bottom: 20px;
                            }
                            .status-bar {
                                background-color: #14cca4;
                                color: white;
                                padding: 12px 15px;
                                text-align: center;
                                border-radius: 5px;
                                margin: 20px 0;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                                font-weight: bold;
                            }
                            .footer {
                                background-color: #f5f9f8;
                                color: #555;
                                text-align: center;
                                padding: 20px;
                                font-size: 14px;
                                border-top: 1px solid #eee;
                            }
                            .social-links {
                                margin: 15px 0;
                            }
                            .social-links a {
                                display: inline-block;
                                margin: 0 10px;
                                color: #14cca4;
                                text-decoration: none;
                            }
                            .info-box {
                                background-color: #e8f4fd;
                                border-radius: 5px;
                                padding: 20px;
                                margin: 20px 0;
                                border-left: 4px solid #2196f3;
                            }
                            .button {
                                display: inline-block;
                                background-color: #14cca4;
                                color: white;
                                padding: 10px 20px;
                                margin-top: 15px;
                                border-radius: 4px;
                                text-decoration: none;
                                font-weight: bold;
                                text-align: center;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.firebasestorage.app/o/assets%2Flogo_white_text.png?alt=media&token=73a45d07-59ed-40b7-960a-486b1e340564" alt="Petzify" class="logo">
                            </div>
                            <div class="main-content">
                                <h1 class="heading">Order Status Update</h1>
                                <p class="order-number">Order #${orderId.slice(-6)}</p>
                                
                                <p>Hello ${orderData.userName || 'Valued Customer'},</p>
                                <p>We're writing to let you know that your order status has been updated.</p>
                                
                                <div class="status-bar">
                                    Status: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
                                </div>
                                
                                <div class="info-box">
                                    <p>Your order is now: <strong>${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong></p>
                                    <p>Date Updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                
                                <div class="section" style="text-align: center;">
                                    <p>To view complete details about your order, please visit your account dashboard.</p>
                                    <a href="https://petzify.com/my-orders/${orderId}" class="button">View Order Details</a>
                                </div>
                                
                                <p>If you have any questions about your order, please don't hesitate to contact our customer support team at <a href="mailto:support@petzify.com" style="color: #14cca4; text-decoration: none;">support@petzify.com</a>.</p>
                                
                                <p>Thank you for shopping with Petzify!</p>
                                
                                <p style="margin-top: 30px;">
                                    Best regards,<br>
                                    The Petzify Team
                                </p>
                            </div>
                            
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Petzify. All rights reserved.</p>
                                <div class="social-links">
                                    <a href="https://www.instagram.com/petzify_official/">Instagram</a>
                                </div>
                                <p>This email was sent to ${orderData.userEmail}</p>
                            </div>
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
