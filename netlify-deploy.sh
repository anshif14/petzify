#!/bin/bash

# Simple Netlify Deployment Script
echo "Building the application..."
npm run build

# Check if the build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Exiting."
  exit 1
fi

# Check if .netlify directory exists
if [ ! -d ".netlify" ]; then
  # Create the site
  echo "Creating new Netlify site..."
  npx netlify-cli sites:create --name petzify
  
  # Link to the site
  echo "Linking to the Netlify site..."
  npx netlify-cli link
fi

# Deploy to Netlify
echo "Deploying to Netlify..."
npx netlify-cli deploy --prod --dir=build

# Open the deployed site
echo "Deployment complete!"
echo "Opening your site in the browser..."
npx netlify-cli open:site 