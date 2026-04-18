# Agent Guide - Web Capture Pro

> This file is for AI coding agents. For human documentation, see `README.md`.

## Project Overview

Web Capture Pro is a Chrome/Chromium browser extension (Manifest V3) that captures multi-page websites and documentation sites. It supports two capture modes:

- **Screenshot Mode**: Captures PNG screenshots of each page and compiles them into a single HTML file (users print to PDF via the browser).
- **Text Extraction Mode**: Extracts structured text from pages and exports as Markdown (`.md`) and Plain Text (`.txt`).

The extension auto-detects "Next" links, pagination, and sidebar navigation, but also supports manual navigation as a fallback.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Extension Platform**: Chrome Extension Manifest V3
- **Chrome APIs Used**:
  - `chrome.runtime` (message passing)
  - `chrome.tabs` (tab creation, activation, screenshot capture)
  - `chrome.scripting` (content script injection)
  - `chrome.storage.local` (session persistence, settings)
  - `chrome.downloads` (file export)
  - `chrome.notifications` (user notifications)
- **Dependencies**: Zero external runtime dependencies. No npm packages, no bundler, no build step.
- **Browser Support**: Chrome 88+, Chromium-based browsers (Edge, Brave, Opera). Firefox would require Manifest V2 adaptation.

## Project Structure

```
web-capture-extension/
├── manifest.json          # Extension config (Manifest V3)
├── background.js          # Service worker - session orchestration
├── content.js             # Content script - page interaction & text extraction
├── popup.html             # Popup UI markup
├── popup.js               # Popup UI logic & export functionality
├── utils.js               # Shared utilities (used by background + popup)
├── icon.svg               # Extension icon
├── package.json           # Package metadata (no deps, no meaningful scripts)
├── install.sh             # Bash installation helper script
├── README.md              # Human user documentation
├── QUICKSTART.md          # 5-minute quick start guide
├── SETUP.md               # Detailed installation & testing
├── SUMMARY.md             # Package overview & stats
├── TEST_URLS.md           # URLs for manual testing
├── VERIFICATION.md        # Installation verification checklist
└── TODO.md                # Remaining tasks & known issues
```

## Architecture & Module Divisions

### Message-Passing Architecture

The extension uses a three-tier message-passing architecture:

```
Popup (popup.js)  <--->  Background (background.js)  <--->  Content Script (content.js)
   UI controls              Session orchestration           Page DOM access
   Export logic             Tab navigation                  Text extraction
   Settings storage         Screenshot capture              Link detection
```

All cross-boundary communication uses `chrome.runtime.sendMessage` with action-based routing (switch statements on `message.action`).

### File Responsibilities

**`manifest.json`**
- Declares Manifest V3 with service worker (`background.js`)
- Declares content scripts (`utils.js`, `content.js`) injected at `document_idle` on all URLs
- Declares popup (`popup.html`) bound to the extension action
- Requests permissions: `activeTab`, `tabs`, `scripting`, `storage`, `downloads`, `notifications`
- Host permission: `<all_urls>`

**`background.js`** (Service Worker)
- Imports `utils.js` via `importScripts('utils.js')` at the top
- Maintains active capture sessions in an in-memory `Map` called `captureSessions`
- Key session state: `mode`, `startUrl`, `maxPages`, `delay`, `currentPage`, `visitedUrls`, `screenshots[]`, `extractedText[]`, `paused`, `pendingNavigation`
- Message handlers: `startCapture`, `captureScreenshot`, `extractText`, `processNextPage`, `completeSession`, `pauseCapture`, `resumeCapture`
- Uses `chrome.tabs.captureVisibleTab(windowId, { format: 'png', quality: 100 })` for screenshots
- Auto-navigates by sending `findNextLink` to content script, then `capturePage` after delay
- Compiles results and sends `generatePDF` / `generateTextFiles` messages to popup
- Cleans up sessions older than 1 hour every 10 minutes via `setInterval`
- **Important**: The background script also has a `delay` property duplicated in the session object (lines 54 and 62). This is a harmless bug.

**`content.js`** (Content Script)
- Runs in the context of web pages with access to the DOM
- Message handlers: `capturePage`, `findNextLink`, `extractAllText`
- `capturePage`: scrolls to top, waits 500ms for lazy loading, then either triggers screenshot (via background) or extracts text and sends to background
- `extractTextFromPage()`: tries common documentation selectors (`article`, `.documentation`, `.docs-content`, `main`, `.content`, `#main-content`, `body`), extracts headings and paragraphs, formats as Markdown-like text
- `findNextLink`: uses a multi-strategy approach:
  1. Look for "Next" text or arrow links
  2. Look in pagination/navigation containers
  3. Look in sidebar/TOC and find the next link after current URL
  4. Fallback to any link that looks like a doc page (`/docs/`, `/doc/`, `/chapter`, `/section`, or containing digits)
- **Known Issue**: Some selectors use jQuery-style `:contains("Next")` which does NOT work with standard `document.querySelectorAll`. The code has a try/catch fallback that iterates all links, so it usually recovers.

**`popup.js`**
- Defines `class WebCapturePopup` to manage the popup UI
- Constructor sets default mode to `'screenshot'`, calls `init()`
- `init()`: binds event listeners for mode buttons, Start/Stop/Pause/Export/Help/Settings buttons, and background message listener
- `startCapture()`: validates URL (must start with `http://` or `https://`), validates `maxPages` (1-100), sends `startCapture` to background
- `pauseCapture()` / `resumeCapture()`: toggles pause state, changes button text via `element.onclick` reassignment
- `exportData()`: reads from `chrome.storage.local` under key `captureData`, delegates to `exportScreenshots()` or `exportText()`
- `exportScreenshots()`: generates an HTML file with embedded base64 PNG images and print-friendly CSS
- `exportText()`: generates Markdown and Plain Text versions, downloads both via `chrome.downloads.download()` with `saveAs: true`
- `handleBackgroundMessage()`: listens for `generatePDF` and `generateTextFiles` from background, stores session data via `storeSessionData()`
- `loadSettings()`: restores last-used URL, max pages, delay, and capture mode from `chrome.storage.local`

**`utils.js`**
- Defines `self.WebCaptureUtils` namespace so it works in both service worker and popup contexts
- `PDFGenerator`: placeholder stub (no-op, references potential `jsPDF` integration)
- `TextProcessor`: static methods for text cleaning (`cleanText`), heading extraction (`extractHeadings`), and Markdown formatting (`toMarkdown`)
- `NavigationDetector`: simplified placeholder for next-link detection (the real logic lives in `content.js`). Contains jQuery-style `:contains` selectors that will fail with native `querySelectorAll`.
- `StorageManager`: async wrappers around `chrome.storage.local` for saving/retrieving capture data and cleaning old sessions
- `ErrorHandler`: structured error logging and user notification via `chrome.notifications`

## Build & Development

### No Build Step

This project has **no build system**, **no bundler**, and **no compilation step**. Files are loaded directly by the browser extension runtime.

### Loading the Extension (Development)

1. Open Chrome/Chromium and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle top-right)
3. Click "Load unpacked"
4. Select the `web-capture-extension/` folder
5. The extension appears in the toolbar; click to open the popup
6. To reload after code changes, click the refresh icon on the extension card in `chrome://extensions/`

### Testing

- **No automated tests exist.** `npm test` simply echoes `"No tests defined"`.
- Manual testing is the current strategy. See `TEST_URLS.md` for recommended test URLs.
- **Recommended first test**:
  - URL: `https://httpbin.org/html`
  - Mode: Screenshots
  - Max Pages: 2
  - Delay: 2000ms
- To debug: right-click the popup → Inspect → Console tab. For background logs: `chrome://extensions/` → click "service worker" under Web Capture Pro.

## Code Style Guidelines

- **Language**: All code and comments are in English.
- **Indentation**: 2 spaces.
- **Quotes**: Single quotes for strings in JS; double quotes in HTML and JSON.
- **Semicolons**: Used consistently.
- **Naming**: camelCase for variables/functions, PascalCase for classes (`WebCapturePopup`, `TextProcessor`).
- **Async Style**: Prefer `async/await` for asynchronous operations, but callbacks are still used extensively with Chrome extension APIs.
- **Console Logging**: Extensive `console.log`/`console.error` calls are used for debugging. This is intentional and aids manual testing.
- **Error Handling**: Try/catch blocks wrap screenshot capture and DOM queries. Messages send back `{ error: ... }` objects on failure.

## Security Considerations

- **Local Processing Only**: All capture and extraction happens inside the browser. No data is sent to external servers.
- **Permissions**: The extension requests broad permissions (`<all_urls>`, `tabs`, `scripting`, `downloads`) because it needs to navigate arbitrary websites and save files locally. These are necessary for the core functionality.
- **Content Script Injection**: `content.js` runs on all URLs (`<all_urls>`) at `document_idle`. It only reads DOM content and does not modify the page except for scrolling to top before screenshots.
- **Data Retention**: Session data is stored in `chrome.storage.local` and auto-cleared after 24 hours (per docs) or 1 hour (per `background.js` cleanup interval). Users are advised to export immediately.
- **Icon Asset Issue**: `background.js` and `utils.js` reference `icon.png` for notifications, but the repository only contains `icon.svg`. This will cause notification icons to fail to load. If modifying notification code, either generate a PNG from the SVG or update the reference to `icon.svg`.

## Known Issues & Technical Debt

See `TODO.md` for the full backlog. Key items relevant to agents:

1. **No True PDF Generation**: Screenshot mode exports HTML with embedded images. Users must manually print to PDF. `jsPDF` or `html2pdf.js` integration is planned.
2. **Navigation Logic Duplication**: Robust next-link logic lives in `content.js`. `utils.js` has a simplified `NavigationDetector` that is not actually used by the active code path.
3. **jQuery-Style Selectors**: `content.js` and `utils.js` use `:contains(...)` pseudo-selectors which are invalid in standard `document.querySelectorAll`. The code catches these errors and falls back to manual iteration, but this is fragile.
4. **No Retry Logic**: If a page fails to load or a tab is closed mid-capture, the session hangs without recovery.
5. **No Automated Test Suite**: Every change must be manually tested by loading the extension and running capture sessions.
6. **Missing `icon.png`**: Notifications reference `icon.png` which does not exist in the repo.

## Common Changes & Where to Make Them

| Task | File(s) |
|------|---------|
| Add new capture mode | `popup.html` (UI), `popup.js` (mode logic), `background.js` (session handler), `content.js` (page handler) |
| Change navigation detection | `content.js` (`handleFindNextLink`), then consider backporting to `utils.js` (`NavigationDetector`) |
| Change export format | `popup.js` (`exportScreenshots` or `exportText`) |
| Add text processing | `utils.js` (`TextProcessor`) |
| Change permissions | `manifest.json` (`permissions` / `host_permissions`) |
| Change UI styling | `popup.html` (CSS in `<style>` block) |
| Fix notification icon | `background.js` and `utils.js` (change `iconUrl: 'icon.png'` to `iconUrl: 'icon.svg'`) |
| Add real PDF generation | `popup.js` or new offscreen document; update `background.js` `compilePDF` |
| Add unit tests | Create a new test file/directory; there is no existing test infrastructure |

## File Dependencies

```
manifest.json
    └── declares all entry points

background.js
    └── imports utils.js (via importScripts)
    └── sends messages to content.js (injected tabs) and popup.js

popup.html
    └── loads utils.js (script tag)
    └── loads popup.js (script tag)
    └── popup.js sends messages to background.js

content.js
    └── loaded by manifest into web pages
    └── receives messages from background.js
    └── sends messages back to background.js

utils.js
    └── shared by background.js and popup.html/popup.js
```

## Important Implementation Details

- **Screenshot Capture Requires Visible Tab**: `chrome.tabs.captureVisibleTab` requires the target tab to be active and its window to be focused. `background.js` explicitly calls `chrome.windows.update(tab.windowId, { focused: true })` and `chrome.tabs.update(tabId, { active: true })` before capturing, plus a 500ms stabilization delay.
- **Session Data Storage**: The background keeps session data in an in-memory `Map` for performance. The popup stores exported data in `chrome.storage.local` under the key `captureData` (nested by `sessionId`). These are separate storage locations.
- **Pause/Resume**: Implemented by setting `session.paused = true`. If a navigation is pending when paused, `session.pendingNavigation` is set to `true`, and `navigateToNextPage` is called automatically on resume.
- **Max Pages Limit**: Hardcoded to 100 in popup validation (`maxPages > 100`).
- **Delay Range**: User-configurable per-page delay. Default is 2000ms in the UI, but the background script uses `delay || 1000` as a fallback.
