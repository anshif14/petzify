# Grooming Email Functions Deployment Guide

This guide explains how to set up and deploy the grooming email notification functions.

## Prerequisites

- Firebase CLI installed
- Access to the Firebase project
- A Gmail account for sending emails

## Environment Configuration

Before deploying, you need to set up the following environment variables in your Firebase functions:

```bash
# Set email configuration
firebase functions:config:set email.gmail_email="your-business-gmail@gmail.com"
firebase functions:config:set email.gmail_password="your-gmail-app-password"
firebase functions:config:set email.business_email="notifications@yourbusiness.com"
```

### Creating a Gmail App Password

For the `GMAIL_PASSWORD`, you need to create an App Password in your Google Account:

1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. At the bottom, select "App passwords"
4. Create a new app password for "Firebase Functions"
5. Use the generated password for the `GMAIL_PASSWORD` environment variable

## Deploying the Functions

To deploy these functions:

```bash
cd functions
npm install
firebase deploy --only functions:onGroomingBookingCreated,functions:onGroomingBookingUpdated
```

## Testing the Functions

After deployment, you can test the functions by:

1. Creating a new grooming booking in the app
2. Updating the status of an existing booking

Check the Firebase Functions logs to verify emails are being sent successfully.

## Troubleshooting

Common issues:

- **Missing environment variables**: Ensure all environment variables are set
- **Authentication failure**: Verify the Gmail account and app password are correct
- **Email sending limits**: Gmail has daily sending limits for free accounts

For more assistance, check the Firebase Functions logs for detailed error messages. 