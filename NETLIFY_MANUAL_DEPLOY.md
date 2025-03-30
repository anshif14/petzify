# Manual Netlify Deployment Guide

Follow these steps to deploy your Petzify website to Netlify using their simple drag-and-drop interface:

## Step 1: Build Your Project

Run the following command to build your project:

```bash
npm run build
```

This will create a `build` folder with your optimized production build.

## Step 2: Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Sign up or log in
3. Once in your Netlify dashboard, look for the deployment area that says "Drag and drop your site folder here"
4. Locate your local `build` folder that was created in Step 1
5. Drag and drop the entire `build` folder onto the Netlify deployment area
6. Wait for the upload to complete

That's it! Netlify will deploy your site and give you a URL where you can access it.

## Step 3: Configure Custom Domain (Optional)

If you want to use a custom domain:

1. Go to "Domain management" in your site settings
2. Click "Add custom domain"
3. Follow the instructions to set up your domain

## Step 4: Enable HTTPS (Optional)

Netlify automatically provisions SSL certificates for all sites, including those with custom domains.

## Troubleshooting

If your site doesn't work correctly after deployment, check these common issues:

1. **Routing issues**: Make sure the `_redirects` file was included in your build folder
2. **Missing assets**: Check the browser console for 404 errors
3. **CSS/JS not loading**: Check if the paths to your assets are correct

For more detailed instructions or troubleshooting, refer to the [Netlify documentation](https://docs.netlify.com/). 