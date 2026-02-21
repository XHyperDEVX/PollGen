
# [Pollinations Generator (PollGen)](https://xhyperdevx.github.io/PollGen)

A clean, minimal web application for generating AI images and videos using the Pollinations API. Built with vanilla JavaScript, HTML, and CSS.

## Features

### 🌍 Internationalization
- **Two-language support**: English (default) and German
- Language preference stored in localStorage

### 🎨 Modern UI Design
- Clean, minimal, and intuitive interface
- Responsive design (mobile-friendly)

### 🤖 Dynamic Model Loading
- Models fetched from Pollinations API
- Model list cached in localStorage (24-hour cache duration)
- Graceful fallback to cached models if API is unavailable

### ⚙️ Generation Options
- **Prompt**: Detailed image or video description (required)
- **Aspect Ratio Presets**: Different options for images and videos
- **Seed**: Control randomness
- **Negative Prompt**: Describe what to avoid in the image
- **Advanced Options**:
  - Enhance: Let AI optimize the prompt
  - Private: Hide from public feeds
  - No Logo: Remove Pollinations watermark
  - No Feed: Prevent sharing in public feed
  - Safe: Enable safety content filters

## How to Use

1. **Open PollGen**: https://xhyperdevx.github.io/PollGen
2. **Enter your API Key**: Get a API key from [pollinations.ai](https://enter.pollinations.ai) and enter it in the API Key field
3. **Describe your image or video**: Enter a detailed description of what you want to generate
4. **Select a model**: Choose from the available image generation models
5. **Adjust settings** (optional): Customize dimensions, quality and other parameters
6. **Generate**: Click the "Generate" button
7. **Download**: Once generated, download your image or video or open the source link

## Language Support

The application automatically defaults to English. Users can switch between languages using the toggle button in the top-right corner.

Supported languages:
- 🇬🇧 English (en)
- 🇩🇪 German (de)

## API Key Security

⚠️ **Important**: Your API key is stored in **sessionStorage** only, which means:
- It's cleared when you close the browser tab/window
- It's never saved to disk or sent to any server (except Pollinations API)
- It's not included in any GitHub commits or deployments

## Technical Details

- **No backend required**: Fully static frontend application
- **Vanilla JavaScript**: No frameworks or dependencies
- **Dynamic model loading**: Fetches latest models from Pollinations API (both image and video models)
- **Caching**: 24-hour cache for models to reduce API calls
- **Responsive**: Mobile-first design that works on all screen sizes
- **Accessible**: Semantic HTML with proper ARIA labels

## License

This project is open source and available under the MIT License.

## Credits

- Powered by [Pollinations AI](https://pollinations.ai)
- Built with ❤️ using vanilla JavaScript
___
Note: This README was created by AI and may contain inaccuracies.
