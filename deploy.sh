#!/bin/bash

# Petzify Deployment Script
# This script helps deploy the Petzify application to various hosting providers

echo "Petzify Deployment Script"
echo "========================="
echo ""
echo "Select a hosting provider:"
echo "1. GitHub Pages"
echo "2. Netlify"
echo "3. Firebase"
echo "4. Vercel"
echo ""

read -p "Enter your choice (1-4): " choice

# Build the application
echo "Building the application..."
npm run build

case $choice in
  1)
    echo "Deploying to GitHub Pages..."
    npm run deploy
    echo "Deployment complete! Your site should be available at: https://yourgithubusername.github.io/petzify"
    ;;
  2)
    echo "Deploying to Netlify..."
    if ! command -v netlify &> /dev/null
    then
      echo "Netlify CLI not found. Installing..."
      npm install -g netlify-cli
    fi
    
    echo "Logging in to Netlify..."
    netlify login
    
    echo "Deploying site..."
    netlify deploy --prod
    ;;
  3)
    echo "Deploying to Firebase..."
    if ! command -v firebase &> /dev/null
    then
      echo "Firebase CLI not found. Installing..."
      npm install -g firebase-tools
    fi
    
    echo "Logging in to Firebase..."
    firebase login
    
    echo "Initializing Firebase project..."
    firebase init hosting
    
    echo "Deploying to Firebase..."
    firebase deploy --only hosting
    ;;
  4)
    echo "Deploying to Vercel..."
    if ! command -v vercel &> /dev/null
    then
      echo "Vercel CLI not found. Installing..."
      npm install -g vercel
    fi
    
    echo "Deploying to Vercel..."
    vercel --prod
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "Deployment complete!"

npx serve -s build 