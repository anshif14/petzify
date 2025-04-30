/**
 * Email templates for order status updates
 */

// Helper function for safe price formatting
const formatPrice = (amount) => {
  if (!amount && amount !== 0) return '0.00';
  return parseFloat(amount).toFixed(2);
};

// Helper function for safe customer name display
const getCustomerName = (order) => {
  return order?.userName || order?.customerName || 'Valued Customer';
};

// Helper function for current year
const getCurrentYear = () => new Date().getFullYear();

// Helper function for safe order ID display
const getOrderId = (order) => {
  return order?.id ? order.id.slice(-6) : 'N/A';
};

// Helper function for safe date formatting
const formatDate = (date) => {
  try {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

// Helper function for safe item total calculation
const calculateItemTotal = (item) => {
  try {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return (price * quantity).toFixed(2);
  } catch (error) {
    console.error('Error calculating item total:', error);
    return '0.00';
  }
};

// Helper function for safe items rendering
const renderOrderItems = (order) => {
  if (!order?.items || !Array.isArray(order.items)) {
    return '<tr><td colspan="4">No items found</td></tr>';
  }

  return order.items.map(item => `
    <tr>
      <td>${item.name || 'Unnamed Product'}</td>
      <td class="text-center">${item.quantity || 0}</td>
      <td class="text-right">₹${formatPrice(item.price)}</td>
      <td class="text-right">₹${calculateItemTotal(item)}</td>
    </tr>
  `).join('');
};

/**
 * Generate the email template for order confirmation
 * @param {Object} order - The order object
 * @returns {string} - HTML email template
 */
export const getOrderConfirmedEmailTemplate = (order) => {
  return `
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
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          line-height: 1.6;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #3f51b5;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 180px;
          margin-bottom: 10px;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          color: #3f51b5;
          margin: 10px 0;
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
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .invoice-details-col {
          flex: 1;
          min-width: 200px;
          margin-bottom: 20px;
        }
        .info-block {
          margin-bottom: 20px;
        }
        .info-block h3 {
          font-size: 16px;
          margin-bottom: 5px;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 5px;
          color: #555;
        }
        .info-text {
          font-size: 14px;
          margin: 5px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .items-table th {
          background-color: #f5f5f5;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #555;
          border-bottom: 2px solid #e0e0e0;
        }
        .items-table td {
          padding: 10px;
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
        }
        .items-table .text-right {
          text-align: right;
        }
        .items-table .text-center {
          text-align: center;
        }
        .total-row {
          font-weight: bold;
          border-top: 2px solid #e0e0e0;
          background-color: #f9f9f9;
        }
        .status-message {
          background-color: #e8eaf6;
          border-left: 4px solid #3f51b5;
          padding: 15px;
          margin: 20px 0;
          border-radius: 0 5px 5px 0;
        }
        .status-message h3 {
          margin-top: 0;
          color: #3f51b5;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #777;
          font-size: 13px;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-icon {
          display: inline-block;
          margin: 0 10px;
        }
        .cta-button {
          display: inline-block;
          background-color: #3f51b5;
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
          text-align: center;
        }
        @media only screen and (max-width: 600px) {
          .invoice-details {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.appspot.com/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
          <div class="invoice-title">ORDER CONFIRMATION</div>
        </div>
        
        <div class="status-bar">
          Status: Confirmed
        </div>
        
        <p>Dear ${getCustomerName(order)},</p>
        
        <p>Thank you for your order. We're pleased to confirm that your order has been received and is now being processed.</p>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <div class="info-block">
              <h3>ORDER INFORMATION</h3>
              <p class="info-text"><strong>Order Number:</strong> #${getOrderId(order)}</p>
              <p class="info-text"><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
              <p class="info-text"><strong>Payment Method:</strong> ${order.paymentMethod || 'Online Payment'}</p>
            </div>
          </div>
          
          <div class="invoice-details-col">
            <div class="info-block">
              <h3>SHIPPING ADDRESS</h3>
              <p class="info-text">${order.shippingAddress || 'To be delivered at your default address'}</p>
            </div>
          </div>
        </div>
        
        <div class="info-block">
          <h3>ORDER SUMMARY</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Item</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${renderOrderItems(order)}
              
              <tr>
                <td colspan="3" class="text-right">Subtotal:</td>
                <td class="text-right">₹${formatPrice(order.subtotal)}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-right">Shipping:</td>
                <td class="text-right">₹${formatPrice(order.shippingCost)}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-right">Tax:</td>
                <td class="text-right">₹${formatPrice(order.taxAmount)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" class="text-right">Total:</td>
                <td class="text-right">₹${formatPrice(order.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="status-message">
          <h3>What's Next?</h3>
          <p>Our team is preparing your order for shipment. You will receive another email notification when your order has been dispatched with tracking information.</p>
          <p>Expected processing time: 1-2 business days</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://petzify.com/my-orders" class="cta-button">Track Your Order</a>
        </div>
        
        <div class="footer">
          <p>If you have any questions or concerns about your order, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
          
          <div class="social-links">
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook">
            </a>
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/instagram-new.png" alt="Instagram">
            </a>
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/twitter.png" alt="Twitter">
            </a>
          </div>
          
          <p>© ${getCurrentYear()} Petzify. All rights reserved.</p>
          <p>123 Pet Street, Bangalore, India 560001</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate the email template for order dispatch
 * @param {Object} order - The order object with courier details
 * @returns {string} - HTML email template
 */
export const getOrderDispatchedEmailTemplate = (order) => {
  return `
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
        .order-details {
          border: 1px solid #dddddd;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .section-heading {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000;
        }
        .address {
          font-size: 14px;
          line-height: 1.4;
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
          
          <div class="heading">Arriving ${order.expectedDeliveryDate || 'soon'}</div>
          <div class="address">${order.shippingAddress || 'Default address'}</div>
          <div>Order # ${getOrderId(order)}</div>
          
          <div class="tracking-info">
            <div class="tracking-heading">Tracking Information</div>
            <div class="tracking-details">
              <strong>Courier:</strong> ${order.courierCompany || order.courierDetails?.company || 'Standard Delivery'}
            </div>
            <div class="tracking-details">
              <strong>Tracking Number:</strong> ${order.trackingNumber || order.courierDetails?.trackingNumber || 'Not available'}
            </div>
            <a href="https://petzify.com/track" class="tracking-button">Track package</a>
          </div>
          
          <div class="section-heading">Order Details</div>
          
          ${order.items && Array.isArray(order.items) ? 
            order.items.map(item => `
              <div class="product-item">
                <img src="${item.image || item.productData?.images?.[0] || 'https://via.placeholder.com/80'}" class="product-image" alt="${item.name || 'Product'}">
                <div class="product-details">
                  <div class="product-name">${item.name || item.productData?.name || 'Product'}</div>
                  <div>Quantity: ${item.quantity}</div>
                  <div class="product-price">₹${formatPrice(item.price)}</div>
                </div>
              </div>
            `).join('') : 
            '<div>No items in this order</div>'
          }
          
          <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Subtotal:</span>
              <span>₹${formatPrice(order.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Shipping:</span>
              <span>₹${formatPrice(order.shippingCost)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Tax:</span>
              <span>₹${formatPrice(order.taxAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
              <span>Total:</span>
              <span>₹${formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>If you have any questions about your order, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
          <p>© ${getCurrentYear()} Petzify. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate the email template for delivered orders
 * @param {Object} order - The order object
 * @returns {string} - HTML email template
 */
export const getOrderDeliveredEmailTemplate = (order) => {
  return `
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
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          line-height: 1.6;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #4caf50;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 180px;
          margin-bottom: 10px;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          color: #4caf50;
          margin: 10px 0;
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
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .invoice-details-col {
          flex: 1;
          min-width: 200px;
          margin-bottom: 20px;
        }
        .info-block {
          margin-bottom: 20px;
        }
        .info-block h3 {
          font-size: 16px;
          margin-bottom: 5px;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 5px;
          color: #555;
        }
        .info-text {
          font-size: 14px;
          margin: 5px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .items-table th {
          background-color: #f5f5f5;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #555;
          border-bottom: 2px solid #e0e0e0;
        }
        .items-table td {
          padding: 10px;
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
        }
        .items-table .text-right {
          text-align: right;
        }
        .items-table .text-center {
          text-align: center;
        }
        .total-row {
          font-weight: bold;
          border-top: 2px solid #e0e0e0;
          background-color: #f9f9f9;
        }
        .delivery-info {
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 15px;
          margin: 20px 0;
          border-radius: 0 5px 5px 0;
        }
        .delivery-info h3 {
          margin-top: 0;
          color: #4caf50;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #777;
          font-size: 13px;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-icon {
          display: inline-block;
          margin: 0 10px;
        }
        .cta-button {
          display: inline-block;
          background-color: #4caf50;
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
          text-align: center;
        }
        .rating-block {
          text-align: center;
          background-color: #fafafa;
          padding: 20px;
          border-radius: 5px;
          margin: 25px 0;
          border: 1px solid #eeeeee;
        }
        .stars {
          font-size: 24px;
          margin: 10px 0;
          letter-spacing: 5px;
        }
        @media only screen and (max-width: 600px) {
          .invoice-details {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.appspot.com/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
          <div class="invoice-title">ORDER DELIVERED</div>
        </div>
        
        <div class="status-bar">
          Status: Delivered
        </div>
        
        <p>Dear ${getCustomerName(order)},</p>
        
        <p>Your order has been successfully delivered! We hope you're happy with your purchase.</p>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <div class="info-block">
              <h3>ORDER INFORMATION</h3>
              <p class="info-text"><strong>Order Number:</strong> #${getOrderId(order)}</p>
              <p class="info-text"><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
              <p class="info-text"><strong>Delivery Date:</strong> ${formatDate(order.deliveryDate)}</p>
            </div>
          </div>
          
          <div class="invoice-details-col">
            <div class="info-block">
              <h3>DELIVERY DETAILS</h3>
              <p class="info-text"><strong>Delivered To:</strong><br>${order.shippingAddress || 'Default address'}</p>
            </div>
          </div>
        </div>
        
        <div class="info-block">
          <h3>ORDER SUMMARY</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Item</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${renderOrderItems(order)}
              
              <tr>
                <td colspan="3" class="text-right">Subtotal:</td>
                <td class="text-right">₹${formatPrice(order.subtotal)}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-right">Shipping:</td>
                <td class="text-right">₹${formatPrice(order.shippingCost)}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-right">Tax:</td>
                <td class="text-right">₹${formatPrice(order.taxAmount)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" class="text-right">Total:</td>
                <td class="text-right">₹${formatPrice(order.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="status-message">
          <h3>How was your experience?</h3>
          <p>We'd love to hear your feedback! Please take a moment to rate your experience and leave a review.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://petzify.com/my-orders" class="cta-button">Leave a Review</a>
        </div>
        
        <div class="footer">
          <p>If you have any questions or concerns about your order, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
          
          <div class="social-links">
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook">
            </a>
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/instagram-new.png" alt="Instagram">
            </a>
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/twitter.png" alt="Twitter">
            </a>
          </div>
          
          <p>© ${getCurrentYear()} Petzify. All rights reserved.</p>
          <p>123 Pet Street, Bangalore, India 560001</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate the email template for cancelled orders
 * @param {Object} order - The order object
 * @returns {string} - HTML email template
 */
export const getOrderCancelledEmailTemplate = (order) => {
  return `
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
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333333;
          line-height: 1.6;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 15px;
          border-bottom: 2px solid #f44336;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 180px;
          margin-bottom: 10px;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          color: #f44336;
          margin: 10px 0;
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
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        .invoice-details-col {
          flex: 1;
          min-width: 200px;
          margin-bottom: 20px;
        }
        .info-block {
          margin-bottom: 20px;
        }
        .info-block h3 {
          font-size: 16px;
          margin-bottom: 5px;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 5px;
          color: #555;
        }
        .info-text {
          font-size: 14px;
          margin: 5px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .items-table th {
          background-color: #f5f5f5;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #555;
          border-bottom: 2px solid #e0e0e0;
        }
        .items-table td {
          padding: 10px;
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
        }
        .items-table .text-right {
          text-align: right;
        }
        .items-table .text-center {
          text-align: center;
        }
        .total-row {
          font-weight: bold;
          border-top: 2px solid #e0e0e0;
          background-color: #f9f9f9;
        }
        .cancellation-info {
          background-color: #ffebee;
          border-left: 4px solid #f44336;
          padding: 15px;
          margin: 20px 0;
          border-radius: 0 5px 5px 0;
        }
        .cancellation-info h3 {
          margin-top: 0;
          color: #f44336;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #777;
          font-size: 13px;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-icon {
          display: inline-block;
          margin: 0 10px;
        }
        .cta-button {
          display: inline-block;
          background-color: #f44336;
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 15px;
          text-align: center;
        }
        .refund-box {
          background-color: #fafafa;
          border: 1px solid #e0e0e0;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .refund-box h3 {
          margin-top: 0;
          color: #f44336;
        }
        @media only screen and (max-width: 600px) {
          .invoice-details {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/petzify-49ed4.appspot.com/o/logo%2FPetzify%20Logo-05.png?alt=media" alt="Petzify Logo" class="logo">
          <div class="invoice-title">ORDER CANCELLED</div>
        </div>
        
        <div class="status-bar status-bar-cancelled">
          Status: Cancelled
        </div>
        
        <p>Dear ${getCustomerName(order)},</p>
        
        <p>Your order has been cancelled as requested. If you did not request this cancellation, please contact our support team immediately.</p>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <div class="info-block">
              <h3>ORDER INFORMATION</h3>
              <p class="info-text"><strong>Order Number:</strong> #${getOrderId(order)}</p>
              <p class="info-text"><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
              <p class="info-text"><strong>Cancellation Date:</strong> ${formatDate(order.cancellationDate)}</p>
            </div>
          </div>
          
          <div class="invoice-details-col">
            <div class="info-block">
              <h3>REFUND INFORMATION</h3>
              <p class="info-text">If you have already made a payment, a refund will be initiated within 5-7 business days.</p>
              <p class="info-text"><strong>Refund Amount:</strong> ₹${formatPrice(order.totalAmount)}</p>
            </div>
          </div>
        </div>
        
        <div class="info-block">
          <h3>CANCELLED ITEMS</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">Item</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${renderOrderItems(order)}
              
              <tr>
                <td colspan="3" class="text-right">Subtotal:</td>
                <td class="text-right">₹${formatPrice(order.subtotal)}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-right">Shipping:</td>
                <td class="text-right">₹${formatPrice(order.shippingCost)}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-right">Tax:</td>
                <td class="text-right">₹${formatPrice(order.taxAmount)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" class="text-right">Total Refund:</td>
                <td class="text-right">₹${formatPrice(order.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="status-message">
          <h3>Need Help?</h3>
          <p>If you have any questions about your cancellation or refund, our customer support team is here to help.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://petzify.com/shop" class="cta-button">Continue Shopping</a>
        </div>
        
        <div class="footer">
          <p>For any questions about your cancellation or refund, please contact our customer support team at <a href="mailto:support@petzify.com">support@petzify.com</a> or call us at +91 1234567890.</p>
          
          <div class="social-links">
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook">
            </a>
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/instagram-new.png" alt="Instagram">
            </a>
            <a href="#" class="social-icon">
              <img src="https://img.icons8.com/color/24/000000/twitter.png" alt="Twitter">
            </a>
          </div>
          
          <p>© ${getCurrentYear()} Petzify. All rights reserved.</p>
          <p>123 Pet Street, Bangalore, India 560001</p>
        </div>
      </div>
    </body>
    </html>
  `;
}; 