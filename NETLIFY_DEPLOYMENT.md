# Deploying Petzify to Netlify

This guide will walk you through the steps to deploy your Petzify React application to Netlify.

## Prerequisites

- A GitHub account
- A Netlify account
- Git installed on your local machine

## Step 1: Push your code to GitHub

1. Create a new repository on GitHub.
2. Initialize your local repository and push your code:

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourgithubusername/petzify.git
git push -u origin main
```

## Step 2: Deploy to Netlify

### Option 1: Deploy using the Netlify UI

1. Log in to your [Netlify account](https://app.netlify.com/).
2. Click "New site from Git".
3. Select GitHub as your Git provider.
4. Authorize Netlify to access your GitHub account.
5. Select your Petzify repository.
6. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
7. Click "Deploy site".

### Option 2: Deploy using the Netlify CLI

1. Install the Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to your Netlify account:
   ```bash
   netlify login
   ```

3. Initialize your site:
   ```bash
   netlify init
   ```

4. Follow the prompts to connect to your GitHub repository.

5. Deploy your site:
   ```bash
   netlify deploy --prod
   ```

## Step 3: Configure Custom Domain (Optional)

1. In the Netlify dashboard, go to your site settings.
2. Click on "Domain management" > "Add custom domain".
3. Enter your domain name and follow the steps to configure DNS settings.

## Step 4: Enable HTTPS (Optional)

Netlify automatically provisions SSL certificates for custom domains using Let's Encrypt. To enable HTTPS:

1. In your site settings, go to "Domain management".
2. Click on "HTTPS".
3. Click "Verify DNS configuration".
4. Once DNS is verified, Netlify will provision an SSL certificate automatically.

## Troubleshooting

### Page Not Found Errors

If you're experiencing 404 errors when navigating directly to routes other than the home page, check that your `netlify.toml` file includes the redirect rule:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Build Failures

If your build fails on Netlify, check the build logs for errors. Common issues include:

- Missing dependencies
- Environment variables not set
- Build command errors

## Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/#netlify)
- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/) 