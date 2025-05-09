# Petzify Grooming Email Notification System

This document describes the email notification system for the Petzify grooming service. The system automatically sends emails to customers, grooming centers, and administrators at various points in the booking lifecycle.

## Overview

The email notification system is built using Firebase Cloud Functions and is triggered by document creation and updates in the `groomingBookings` collection. 

### Features

- **New Booking Notifications**: Emails sent to customers, grooming centers and business admins when a new booking is created
- **Status Update Notifications**: Emails sent when booking status changes (confirmed, arrived, completed, cancelled)
- **Rating Requests**: Special emails with rating links sent when a grooming service is completed
- **Responsive Email Templates**: Mobile-friendly email templates with styling consistent with the Petzify brand

## Technical Implementation

### Cloud Functions

Two main cloud functions handle the email notifications:

1. **onGroomingBookingCreated**: Triggered when a new document is created in the `groomingBookings` collection
2. **onGroomingBookingUpdated**: Triggered when a document in the `groomingBookings` collection is updated, specifically focusing on status changes

### Email Templates

The system includes several HTML email templates:

- **New Booking - Customer**: Confirmation email sent to customers when they make a booking
- **New Booking - Grooming Center**: Notification email sent to grooming centers when a new booking is received
- **Status Update - Customer**: Email sent to customers when the status of their booking changes
- **Rating Request**: Email sent to customers when their grooming service is completed

### Data Flow

1. **Booking Creation**:
   - User creates a booking through the app
   - Booking document is created in Firestore
   - Cloud function is triggered
   - Emails are sent to customer, grooming center, and business

2. **Status Updates**:
   - Admin updates booking status in dashboard
   - Booking document is updated in Firestore
   - Cloud function is triggered
   - Email is sent to customer with status-specific information

## Required Data Fields

For the email system to work properly, the following fields should be present in grooming booking documents:

- `userEmail`: Email address of the customer
- `centerEmail`: Email address of the grooming center (if available)
- `centerId`: ID of the grooming center
- `centerName`: Name of the grooming center
- `date`: Date of the appointment
- `time`: Time of the appointment
- `petName`: Name of the pet
- `petType`: Type of pet (dog, cat, etc.)
- `petBreed`: Breed of the pet
- `petAge`: Age of the pet
- `petWeight`: Weight of the pet
- `selectedServices`: Array of selected grooming services
- `totalCost`: Total cost of the booking
- `status`: Current status of the booking (pending, confirmed, arrived, completed, cancelled)
- `specialInstructions`: Any special instructions provided by the customer (optional)

## Testing

To test the email functions, you can:

1. Create a test booking through the app
2. Update the status of an existing booking in the admin dashboard
3. Check the Firebase Functions logs to verify the functions are being triggered
4. Verify emails are being received in the test email accounts

## Customizing Templates

The email templates can be customized by modifying the template functions in `grooming_functions.js`. Each template is defined as a function that takes booking data and returns HTML.

## Troubleshooting

Common issues:

- **Missing emails**: Check spam folders, verify email addresses are correct
- **Function errors**: Check Firebase Function logs for error messages
- **Template rendering issues**: Test templates with different data structures 

## Future Enhancements

Potential improvements for the email system:

- Add internationalization support for emails in multiple languages
- Implement click tracking and open rate analytics
- Add calendar invites for confirmed bookings
- Create a preference system for users to opt in/out of different notification types 