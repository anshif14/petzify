const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
try {
  // Try to use service account
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.log('Using application default credentials');
  admin.initializeApp({
    projectId: 'petzify-49ed4'
  });
}

const db = admin.firestore();

async function initializeEmailTemplates() {
  console.log('Initializing email templates...');
  
  const defaultTemplates = {
    'order_created': {
      subject: 'Order Placed - #{{orderId}}',
      description: 'Sent to customer when an order is placed',
      html: `
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
                .section-heading {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #000;
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
                <div class="main-content">
                    <div class="heading">Order Placed Successfully</div>
                    <p>Hi {{customerName}},</p>
                    <p>Thank you for your order! We're pleased to confirm that your order has been received and is now being processed.</p>
                    <p><strong>Order Number:</strong> #{{orderId}}</p>
                    <p><strong>Order Date:</strong> {{orderDate}}</p>
                    
                    <div class="section-heading">Order Details</div>
                    <div id="product-list"></div>
                    
                    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>Subtotal:</span>
                            <span>₹{{subtotal}}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                            <span>Total:</span>
                            <span>₹{{totalAmount}}</span>
                        </div>
                    </div>
                    
                    <p>We'll notify you once your order is shipped.</p>
                </div>
                <div class="footer">
                    <p>If you have any questions about your order, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
                    <p>© {{currentYear}} Petzify. All rights reserved.</p>
                </div>
            </div>
            <script>
                // Render product items
                try {
                    const productItems = JSON.parse('{{productItems}}');
                    const productListHtml = productItems.map(item => {
                        return \`
                            <div style="display: flex; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                                <img src="\${item.image}" width="80" height="80" style="object-fit: cover; margin-right: 15px;">
                                <div>
                                    <p style="font-weight: bold; margin: 0 0 5px 0;">\${item.productData?.name || 'Product'}</p>
                                    <p style="margin: 0 0 5px 0;">Qty: \${item.quantity}</p>
                                    <p style="margin: 0;">Price: ₹\${item.priceFormatted}</p>
                                </div>
                            </div>
                        \`;
                    }).join('');
                    document.getElementById('product-list').innerHTML = productListHtml;
                } catch (e) {
                    console.error('Error rendering product items:', e);
                }
            </script>
        </body>
        </html>
      `
    },
    'order_dispatched': {
      subject: 'Your Order Has Been Shipped - Petzify Order #{{orderId}}',
      description: 'Sent to customer when order is dispatched',
      html: `
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
                    <div>{{shippingAddress}}</div>
                    <div>Order # {{orderId}}</div>
                    
                    <div class="tracking-info">
                        <div class="tracking-heading">Tracking Information</div>
                        <div class="tracking-details">
                            <strong>Courier:</strong> {{courierName}}
                        </div>
                        <div class="tracking-details">
                            <strong>Tracking Number:</strong> {{trackingNumber}}
                        </div>
                        <a href="https://petzify.com/track" class="tracking-button">Track package</a>
                    </div>
                    
                    <div style="font-weight: bold; margin-top: 15px; font-size: 16px;">Order Details</div>
                    
                    <div id="product-list"></div>
                    
                    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>Subtotal:</span>
                            <span>₹{{subtotal}}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                            <span>Total:</span>
                            <span>₹{{totalAmount}}</span>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>If you have any questions about your order, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
                    <p>© {{currentYear}} Petzify. All rights reserved.</p>
                </div>
            </div>
            <script>
                // Render product items
                try {
                    const productItems = JSON.parse('{{productItems}}');
                    const productListHtml = productItems.map(item => {
                        return \`
                            <div style="display:flex; padding:15px 0; border-bottom:1px solid #eee;">
                                <img src="\${item.image}" style="width:80px; height:80px; object-fit:cover; margin-right:15px;">
                                <div>
                                    <div style="font-weight:bold; margin-bottom:5px; font-size:14px;">\${item.productData?.name || 'Product'}</div>
                                    <div>Quantity: \${item.quantity}</div>
                                    <div style="font-weight:bold; margin-top:5px; font-size:16px;">₹\${item.priceFormatted}</div>
                                </div>
                            </div>
                        \`;
                    }).join('');
                    document.getElementById('product-list').innerHTML = productListHtml;
                } catch (e) {
                    console.error('Error rendering product items:', e);
                }
            </script>
        </body>
        </html>
      `
    },
    'order_delivered': {
      subject: 'Order Delivered - Petzify Order #{{orderId}}',
      description: 'Sent to customer when order is delivered',
      html: `
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
                .rating-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin: 20px 0;
                }
                .rating-button {
                    display: inline-block;
                    background-color: #f0c14b;
                    color: #111;
                    text-decoration: none;
                    padding: 10px 20px;
                    border-radius: 4px;
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
                    <p>Hi {{customerName}},</p>
                    <p>Your order <strong>#{{orderId}}</strong> has been delivered.</p>
                    <p>Thank you for shopping with Petzify!</p>
                    <p>We hope you enjoy your purchase. If you have any feedback or concerns, please let us know.</p>
                    
                    <div style="text-align: center; margin: 25px 0;">
                        <p style="font-weight: bold; margin-bottom: 10px;">How would you rate your experience?</p>
                        <div class="rating-buttons">
                            <a href="https://petzify.com/feedback?rating=5&order={{orderFullId}}" class="rating-button">Excellent</a>
                            <a href="https://petzify.com/feedback?rating=3&order={{orderFullId}}" class="rating-button">Good</a>
                            <a href="https://petzify.com/feedback?rating=1&order={{orderFullId}}" class="rating-button">Poor</a>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <p>If you have any questions about your order, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
                    <p>© {{currentYear}} Petzify. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    },
    'order_cancelled': {
      subject: 'Order Cancelled - Petzify Order #{{orderId}}',
      description: 'Sent to customer when order is cancelled',
      html: `
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
                .shop-button {
                    display: inline-block;
                    background-color: #f0c14b;
                    color: #111;
                    text-decoration: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    font-weight: bold;
                    margin-top: 20px;
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
                    <p>Hi {{customerName}},</p>
                    <p>Your order <strong>#{{orderId}}</strong> has been cancelled.</p>
                    <p>If you have any questions about this cancellation, please contact our customer support.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://petzify.com/shop" class="shop-button">Continue Shopping</a>
                    </div>
                </div>
                <div class="footer">
                    <p>If you have any questions, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
                    <p>© {{currentYear}} Petzify. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
      `
    }
  };

  try {
    // Save templates to Firestore
    const batch = db.batch();
    
    for (const [templateId, template] of Object.entries(defaultTemplates)) {
      const templateRef = db.collection('emailTemplates').doc(templateId);
      batch.set(templateRef, {
        ...template,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`Successfully initialized ${Object.keys(defaultTemplates).length} email templates`);
  } catch (error) {
    console.error('Error initializing templates:', error);
  }
}

// Run the initialization function
initializeEmailTemplates()
  .then(() => {
    console.log('Email templates initialization completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to initialize email templates:', error);
    process.exit(1);
  }); 