# GitHub Pages Deployment Guide

## Quick Start

1. **Push to GitHub:**
```bash
git add .
git commit -m "Refactored Pollinations Image Generator"
git push origin main
```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **Deploy from a branch**
   - Select branch: **main**, folder: **/ (root)**
   - Click **Save**

3. **Access your app:**
   - Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
   - It may take 1-2 minutes for the initial deployment

## What's Deployed

The following files are deployed:
- `index.html` - Main application page
- `js/i18n.js` - Internationalization system
- `js/app.js` - Application logic
- `backend/models.json` - Static backup model list
- `README.md` - Documentation

## Configuration

### No Configuration Required!

The app is fully static and requires no configuration. Users simply need to:
1. Visit the deployed URL
2. Enter their Pollinations API key (get it from [pollinations.ai](https://pollinations.ai))
3. Start generating images

### Language Settings

The app defaults to English but automatically saves language preferences in the browser's localStorage.

## Important Notes

### API Keys
- The app does NOT include or expose any API keys
- Each user must provide their own API key
- Keys are stored in sessionStorage (cleared when browser closes)
- Keys are NEVER sent to GitHub or any server other than Pollinations

### Model Loading
- Models are fetched from Pollinations API on page load
- Models are cached in localStorage for 24 hours
- Fallback to cached models if API is unavailable

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers supported
- Requires JavaScript enabled

## Troubleshooting

### Page doesn't load after deployment
- Wait 1-2 minutes for GitHub Pages to build
- Check that GitHub Pages is enabled in repository settings
- Verify the branch and folder are set correctly

### Models don't load
- Check browser console for errors
- Verify internet connection
- Try clearing browser cache and localStorage

### API Key issues
- Ensure you have a valid API key from pollinations.ai
- Check that the key is entered correctly (no extra spaces)
- Try refreshing the page and re-entering the key

## Custom Domain (Optional)

To use a custom domain:
1. Add a `CNAME` file to the repository root with your domain
2. Configure DNS settings at your domain provider
3. Update GitHub Pages settings to use custom domain

See: [GitHub Pages Custom Domain Documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## Updates

To update the deployed app:
1. Make changes to the code
2. Commit and push to the main branch
3. GitHub Pages will automatically rebuild and redeploy (1-2 minutes)

## Security

✅ **Safe for public deployment:**
- No sensitive data in the repository
- No backend secrets
- No API keys committed
- Users provide their own credentials

## Performance

- **Static HTML/CSS/JS**: Fast load times
- **Model caching**: Reduces API calls
- **Minimal dependencies**: No external libraries
- **Optimized images**: Uses browser-native image rendering

## Support

For issues or questions:
- Check the [README.md](README.md)
- Review browser console for error messages
- Verify API key is valid and correctly entered
- Check Pollinations API status

## License

MIT License - See repository for details
