# Web Capture Pro - Browser Extension

A powerful Chrome/Chromium browser extension for capturing entire documentation sites and multi-page websites.

## Features

### 📷 Screenshot Mode
- Captures high-resolution screenshots of every page
- Automatically compiles into a single HTML file
- Can be printed to PDF using browser's print function
- Perfect for visual documentation archiving

### 📝 Text Extraction Mode
- Extracts structured text from documentation sites
- Saves as Markdown (.md) and Plain Text (.txt)
- Preserves headings, lists, and content structure
- Ideal for creating offline documentation copies

### 🎯 Smart Navigation
- Auto-detects "Next" buttons and pagination
- Follows sidebar navigation
- Handles common documentation structures
- Manual navigation support
- **Custom CSS selectors** for content and next-link targeting
- **Batch URL mode** for known page lists

## Installation

### Method 1: Manual Installation (Developer Mode)

1. **Download/Extract the extension**
   ```bash
   cd /root/web-capture-extension
   ls -la  # Verify all files are present
   ```

2. **Open Chrome/Chromium Extensions**
   - Navigate to: `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

3. **Load Unpacked Extension**
   - Click "Load unpacked"
   - Select the `/root/web-capture-extension` folder
   - Extension should appear in your toolbar

### Method 2: Using the Extension

1. Click the extension icon in your browser toolbar
2. Select capture mode (Screenshots or Text)
3. Enter the starting URL
4. Configure max pages and delay
5. Click "Start Capture"

## File Structure

```
web-capture-extension/
├── manifest.json          # Extension configuration (MV3)
├── background.js          # Service worker for orchestration
├── content.js             # Content script for page interaction
├── popup.html             # User interface
├── popup.js               # UI logic and controls
├── utils.js               # Utility functions
├── options.html           # Settings page
├── options.js             # Settings logic
├── offscreen.html         # Offscreen document for PDF generation
├── offscreen.js           # PDF generation logic
├── lib/
│   └── jspdf.umd.min.js   # Vendored jsPDF library
├── icons/
│   ├── icon16.png         # Toolbar icon
│   ├── icon48.png         # Extension page icon
│   └── icon128.png        # Store / notifications
├── __tests__/
│   └── utils.test.js      # Jest unit tests
├── package.json           # Package metadata & test scripts
├── README.md              # This file
└── icon.svg               # Source icon
```

## Usage Guide

### Screenshot Capture

1. **Select Mode**: Click "📷 Screenshots"
2. **Enter URL**: Provide the first page URL (e.g., `https://example.com/docs/getting-started`)
3. **Set Parameters**:
   - **Max Pages**: How many pages to capture (1-100)
   - **Delay**: Wait time between pages in milliseconds (2000 = 2 seconds)
4. **Start**: Click "Start Capture"
5. **Wait**: Extension will automatically navigate and capture
6. **Export**: Click "Export" when complete to download HTML file
7. **Convert to PDF**: Open HTML file, press Ctrl+P (Cmd+P on Mac), save as PDF

### Text Extraction

1. **Select Mode**: Click "📝 Text Extract"
2. **Enter URL**: Provide starting documentation page
3. **Configure**: Set max pages and delay
4. **Start**: Click "Start Capture"
5. **Export**: Download both .md and .txt files

### Best Practices

- **Start Small**: Test with 2-3 pages first
- **Adjust Delay**: Increase for heavy/lazy-loaded pages
- **Check Navigation**: Ensure pages have proper "Next" links
- **Monitor Progress**: Watch the progress bar and status messages
- **Export Immediately**: Save data before closing popup

## Configuration Options

### Max Pages
- **Range**: 1 to 100
- **Default**: 10
- **Tip**: Start with 5-10 for testing

### Delay (Milliseconds)
- **Range**: 500 to 10000
- **Default**: 2000 (2 seconds)
- **Recommendations**:
  - Simple pages: 1000-1500ms
  - Standard docs: 2000-3000ms
  - Heavy pages: 5000-8000ms
  - Lazy-loaded: 8000-10000ms

## How It Works

### Screenshot Mode
1. Background script opens the starting URL in a new tab
2. Content script ensures page is fully loaded
3. Background captures visible tab using `chrome.tabs.captureVisibleTab`
4. Stores screenshot data in memory
5. Content script finds next navigation link
6. Repeats process until max pages reached
7. Compiles all screenshots into HTML file

### Text Mode
1. Opens starting URL in background tab
2. Content script extracts text using intelligent selectors
3. Preserves document structure (headings, lists, paragraphs)
4. Stores extracted content
5. Navigates to next page
6. Repeats until complete
7. Exports as Markdown and Plain Text

## Export Formats

### HTML (Screenshots)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Capture Session</title>
  <style>
    /* Print-friendly styles */
  </style>
</head>
<body>
  <div class="screenshot">
    <h2>Page 1</h2>
    <img src="data:image/png;base64,...">
  </div>
  <!-- More screenshots -->
</body>
</html>
```

### Markdown (Text)
```markdown
# Documentation Title

**URL:** https://example.com/docs
**Captured:** 2026-01-03T23:59:58Z

## Getting Started

This is the content from the page...

## Installation

- Step 1
- Step 2
```

## Troubleshooting

### Common Issues

**Issue**: "No navigation found"
- **Solution**: Manually click through pages, extension will capture each
- **Alternative**: Check if site uses JavaScript for navigation

**Issue**: "Permission denied"
- **Solution**: Verify extension has all required permissions
- **Check**: `chrome://extensions/` → Web Capture Pro → Details

**Issue**: "Screenshots not capturing"
- **Solution**: Ensure tab is visible (not minimized)
- **Note**: Chrome requires visible tab for screenshots

**Issue**: "Text extraction empty"
- **Solution**: Page might use dynamic content loading
- **Try**: Increase delay time

**Issue**: "Download fails"
- **Solution**: Check browser download settings
- **Alternative**: Try different filename

### Debug Mode

1. Open extension popup
2. Right-click → Inspect
3. Open Console tab
4. Look for error messages
5. Check background page console

## Technical Details

### Permissions Required
- `activeTab`: Access current tab
- `tabs`: Create and manage tabs
- `scripting`: Inject content scripts
- `storage`: Save session data
- `downloads`: Export files
- `notifications`: User notifications
- `<all_urls>`: Access any website

### Browser Compatibility
- Chrome 88+
- Chromium-based browsers (Edge, Brave, Opera)
- Firefox (requires manifest v2 adaptation)

### Storage
- Session data stored in `chrome.storage.local`
- Auto-cleanup after 24 hours
- Manual export recommended

## Advanced Usage

### Manual Navigation
If auto-detection fails:
1. Start capture
2. Manually click "Next" or navigate
3. Extension captures each page you visit
4. Click "Export" when done

### Pause & Resume
- Click "Pause" at any time to temporarily stop the capture process.
- Click "Resume" to continue from where you left off.
- Useful if you need to manually solve a CAPTCHA or log in.

### Capturing Specific Sections
1. Navigate to target page
2. Use browser dev tools to find section selectors
3. Modify content.js (advanced users)
4. Reload extension

### Batch Processing
For multiple sites:
1. Capture first site
2. Export data
3. Clear storage
4. Repeat for next site

## Security & Privacy

- **Local Processing**: All processing happens locally in browser
- **No Data Sent**: No external servers involved
- **User Control**: User initiates all captures
- **Storage**: Data auto-deletes after 24 hours

## Limitations

- **Single Page Apps**: May not detect navigation in SPAs
- **Dynamic Content**: Requires sufficient delay time
- **Login Required**: Cannot access private/authenticated content
- **Iframes**: Limited support for iframe content
- **Large Sites**: Limited to 100 pages per session

## Future Enhancements

- [x] PDF generation without print dialog
- [x] Custom CSS selectors
- [x] Batch URL processing
- [ ] Cloud storage integration
- [ ] Video recording mode
- [ ] OCR for images
- [ ] Translation support
- [ ] Puppeteer integration tests

## Contributing

This is an open-source project. Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share your use cases

## License

MIT License - Free to use and modify

## Support

For issues or questions:
1. Check this README
2. Review browser console logs
3. Verify extension permissions
4. Test with simple URLs first

## Credits

Built with vanilla JavaScript and Chrome Extension APIs.
No external dependencies required.

---

**Version**: 1.1.0  
**Last Updated**: 2026-04-17  
**Author**: Web Capture Pro Team
