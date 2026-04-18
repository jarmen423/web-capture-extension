# Remaining Tasks for Web Capture Pro

## Completed in v1.1.0

- [x] **True PDF Generation**: Integrated jsPDF via offscreen document for native PDF export. Falls back to HTML export on unsupported browsers.
- [x] **Unit Tests**: Jest + jsdom test suite for `utils.js` (TextProcessor, NavigationDetector, StorageManager, ErrorHandler).
- [x] **Robust Navigation Logic**: Rewrote `content.js` and `utils.js` to use standard DOM APIs only. Removed all jQuery-style `:contains` selectors.
- [x] **Error Handling & Recovery**: Added retry logic (3 attempts) for screenshot capture. Handles closed tabs, network errors, and missing tabs gracefully.
- [x] **Pause/Resume UX**: Badge text updates (REC/PAU), session persists in `chrome.storage.session`, popup restores state on reopen.
- [x] **Full-Page Screenshots**: Scroll-and-stitch capture option for screenshot mode.
- [x] **Custom CSS Selectors**: Advanced options for content targeting and next-link override.
- [x] **Batch URL Mode**: Third capture mode for processing a list of URLs sequentially.
- [x] **Settings / Options Page**: `options.html` with default settings and data management.
- [x] **Real-Time Progress**: Progress bar and status updates during capture. Popup survives close/reopen.
- [x] **Icon Assets**: Generated PNG icons (16/48/128px) from SVG for notifications and manifest.
- [x] **Missing `icon.png` Bug**: Fixed all `icon.png` references to `icons/icon128.png`.
- [x] **Duplicate `delay` Bug**: Removed duplicate `delay` property in session initialization.
- [x] **`checkVisited` Handler**: Added missing message handler in background.js.
- [x] **Tab Lifecycle**: Tracks session tabId, waits for `tabs.onUpdated` load completion, recovers if tab is closed.
- [x] **Manifest V3 Improvements**: Added `icons`, `options_page`, `web_accessible_resources`, `alarms` permission.

## Known Limitations

- **Full-page screenshots**: Best effort scroll-and-stitch; complex SPAs with dynamic loading may produce duplicates or gaps.
- **PDF generation**: Requires Chrome 109+ (offscreen document API). Older browsers fall back to HTML export.
- **Single-page apps**: Navigation detection may miss client-side route changes. Use batch mode or manual navigation.
- **Memory**: Very large captures (>50 full-page screenshots) may approach service worker memory limits. Export promptly.

## Future Ideas

- [ ] Cloud storage integration (Google Drive / Dropbox)
- [ ] OCR support (Tesseract.js) for screenshots
- [ ] Puppeteer integration tests for end-to-end capture flow
- [ ] Custom export templates (HTML/CSS theming)
- [ ] Export to JSON / EPUB formats
