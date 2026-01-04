// Popup.js - UI Logic for Web Capture Pro

class WebCapturePopup {
  constructor() {
    this.mode = 'screenshot';
    this.isCapturing = false;
    this.currentSessionId = null;
    this.init();
  }
  
  init() {
    // Mode selection
    document.getElementById('screenshotMode').addEventListener('click', () => {
      this.setMode('screenshot');
    });
    
    document.getElementById('textMode').addEventListener('click', () => {
      this.setMode('text');
    });
    
    // Buttons
    document.getElementById('startBtn').addEventListener('click', () => this.startCapture());
    document.getElementById('stopBtn').addEventListener('click', () => this.stopCapture());
    document.getElementById('pauseBtn').addEventListener('click', () => this.pauseCapture());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
    document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
    
    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message, sendResponse);
    });
    
    // Load saved settings
    this.loadSettings();
  }
  
  setMode(mode) {
    this.mode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (mode === 'screenshot') {
      document.getElementById('screenshotMode').classList.add('active');
    } else {
      document.getElementById('textMode').classList.add('active');
    }
    
    // Save preference
    chrome.storage.local.set({ captureMode: mode });
  }
  
  async startCapture() {
    const startUrl = document.getElementById('startUrl').value.trim();
    const maxPages = parseInt(document.getElementById('maxPages').value);
    const delay = parseInt(document.getElementById('delay').value);
    
    // Validation
    if (!startUrl) {
      this.updateStatus('Please enter a start URL', 'error');
      return;
    }
    
    if (!startUrl.startsWith('http://') && !startUrl.startsWith('https://')) {
      this.updateStatus('URL must start with http:// or https://', 'error');
      return;
    }
    
    if (maxPages < 1 || maxPages > 100) {
      this.updateStatus('Max pages must be between 1 and 100', 'error');
      return;
    }
    
    // Update UI
    this.isCapturing = true;
    this.toggleControls(true);
    this.updateStatus('Starting capture session...', 'active');
    this.showProgress(true);
    
    // Save settings
    chrome.storage.local.set({
      lastUrl: startUrl,
      lastMaxPages: maxPages,
      lastDelay: delay
    });
    
    // Send start command to background
    chrome.runtime.sendMessage({
      action: 'startCapture',
      mode: this.mode,
      startUrl: startUrl,
      maxPages: maxPages,
      delay: delay
    }, (response) => {
      if (response && response.success) {
        this.currentSessionId = response.sessionId;
        this.updateStatus(`Session ${response.sessionId} started - ${this.mode} mode`, 'active');
      } else if (response && response.error) {
        this.updateStatus(`Error: ${response.error}`, 'error');
        this.stopCapture();
      }
    });
  }
  
  stopCapture() {
    this.isCapturing = false;
    this.toggleControls(false);
    this.updateStatus('Capture stopped', 'error');
    this.showProgress(false);
    
    if (this.currentSessionId) {
      chrome.runtime.sendMessage({
        action: 'completeSession',
        sessionId: this.currentSessionId,
        mode: this.mode
      });
    }
  }
  
  pauseCapture() {
    if (this.isCapturing) {
      this.updateStatus('Capture paused', 'active');
      document.getElementById('pauseBtn').textContent = 'Resume';
      document.getElementById('pauseBtn').onclick = () => this.resumeCapture();
    }
  }
  
  resumeCapture() {
    if (this.isCapturing) {
      this.updateStatus('Resuming capture...', 'active');
      document.getElementById('pauseBtn').textContent = 'Pause';
      document.getElementById('pauseBtn').onclick = () => this.pauseCapture();
      
      // Notify background to continue
      chrome.runtime.sendMessage({
        action: 'resumeCapture',
        sessionId: this.currentSessionId
      });
    }
  }
  
  async exportData() {
    this.updateStatus('Preparing export...', 'active');
    
    // Get session data from storage
    chrome.storage.local.get(['captureData'], (result) => {
      const data = result.captureData;
      
      if (!data || !data[this.currentSessionId]) {
        this.updateStatus('No data to export yet', 'error');
        return;
      }
      
      const sessionData = data[this.currentSessionId];
      
      if (this.mode === 'screenshot') {
        this.exportScreenshots(sessionData);
      } else {
        this.exportText(sessionData);
      }
    });
  }
  
  async exportScreenshots(sessionData) {
    if (!sessionData.screenshots || sessionData.screenshots.length === 0) {
      this.updateStatus('No screenshots captured', 'error');
      return;
    }
    
    this.updateStatus(`Generating PDF with ${sessionData.screenshots.length} screenshots...`, 'active');
    
    // Use jsPDF library (we'll include it in the extension)
    // For now, we'll create a simple HTML file with embedded images
    
    const htmlContent = this.createScreenshotHTML(sessionData);
    const filename = `capture_${this.currentSessionId}_${Date.now()}.html`;
    
    // Download as HTML (can be printed to PDF)
    this.downloadFile(htmlContent, filename, 'text/html');
    
    this.updateStatus(`Exported ${sessionData.screenshots.length} screenshots`, 'success');
  }
  
  async exportText(sessionData) {
    if (!sessionData.extractedText || sessionData.extractedText.length === 0) {
      this.updateStatus('No text extracted', 'error');
      return;
    }
    
    this.updateStatus(`Exporting ${sessionData.extractedText.length} pages...`, 'active');
    
    // Create Markdown file
    let markdown = '# Web Capture Pro - Extracted Documentation\n\n';
    markdown += `**Captured:** ${new Date().toISOString()}\n`;
    markdown += `**Session ID:** ${this.currentSessionId}\n`;
    markdown += `**Total Pages:** ${sessionData.extractedText.length}\n\n`;
    markdown += '---\n\n';
    
    sessionData.extractedText.forEach((page, index) => {
      markdown += `## Page ${index + 1}: ${page.title}\n`;
      markdown += `**URL:** ${page.url}\n`;
      markdown += `**Timestamp:** ${new Date(page.timestamp).toISOString()}\n\n`;
      markdown += page.content + '\n\n';
      markdown += '---\n\n';
    });
    
    // Also create a plain text version
    const plainText = this.convertToPlainText(markdown);
    
    // Download both
    const mdFilename = `documentation_${this.currentSessionId}.md`;
    const txtFilename = `documentation_${this.currentSessionId}.txt`;
    
    this.downloadFile(markdown, mdFilename, 'text/markdown');
    setTimeout(() => {
      this.downloadFile(plainText, txtFilename, 'text/plain');
    }, 500);
    
    this.updateStatus(`Exported ${sessionData.extractedText.length} pages as Markdown & TXT`, 'success');
  }
  
  createScreenshotHTML(sessionData) {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Web Capture - ${this.currentSessionId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .screenshot { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; page-break-after: always; }
    .screenshot img { max-width: 100%; height: auto; border: 1px solid #ddd; }
    .meta { font-size: 12px; color: #666; margin-top: 10px; }
    h1 { color: #667eea; }
    h2 { color: #333; font-size: 16px; margin-bottom: 10px; }
    @media print { .screenshot { page-break-after: always; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📸 Web Capture Pro</h1>
    <div class="meta">
      <strong>Session:</strong> ${this.currentSessionId}<br>
      <strong>Date:</strong> ${new Date().toISOString()}<br>
      <strong>Pages:</strong> ${sessionData.screenshots.length}
    </div>
  </div>
`;
    
    sessionData.screenshots.forEach((shot, index) => {
      html += `  <div class="screenshot">
    <h2>Page ${index + 1}</h2>
    <div class="meta">URL: ${shot.url}</div>
    <img src="${shot.dataUrl}" alt="Screenshot ${index + 1}">
  </div>\n`;
    });
    
    html += '</body>\n</html>';
    return html;
  }
  
  convertToPlainText(markdown) {
    return markdown
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`/g, '')
      .replace(/^---$/gm, '---')
      .replace(/\n{3,}/g, '\n\n');
  }
  
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        this.updateStatus('Download failed: ' + chrome.runtime.lastError.message, 'error');
      } else {
        console.log('Download started:', downloadId);
      }
    });
  }
  
  handleBackgroundMessage(message, sendResponse) {
    if (message.action === 'generatePDF') {
      // Store screenshot data for export
      this.storeSessionData(message.sessionId, { screenshots: message.screenshots });
      this.updateStatus(`Captured ${message.screenshots.length} screenshots`, 'success');
      this.updateProgress(message.screenshots.length, message.screenshots.length);
      this.stopCapture();
    }
    
    if (message.action === 'generateTextFiles') {
      // Store text data for export
      this.storeSessionData(message.sessionId, { extractedText: message.extractedText });
      this.updateStatus(`Extracted ${message.extractedText.length} pages`, 'success');
      this.updateProgress(message.extractedText.length, message.extractedText.length);
      this.stopCapture();
    }
    
    sendResponse({ success: true });
  }
  
  storeSessionData(sessionId, data) {
    chrome.storage.local.get(['captureData'], (result) => {
      const captureData = result.captureData || {};
      captureData[sessionId] = { ...captureData[sessionId], ...data };
      chrome.storage.local.set({ captureData });
    });
  }
  
  updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status';
    if (type) statusEl.classList.add(type);
  }
  
  showProgress(show) {
    const progressEl = document.getElementById('progress');
    progressEl.style.display = show ? 'block' : 'none';
    if (!show) {
      this.updateProgress(0, 1);
    }
  }
  
  updateProgress(current, total) {
    const bar = document.getElementById('progressBar');
    const percent = total > 0 ? (current / total) * 100 : 0;
    bar.style.width = percent + '%';
  }
  
  toggleControls(isCapturing) {
    document.getElementById('startBtn').disabled = isCapturing;
    document.getElementById('startUrl').disabled = isCapturing;
    document.getElementById('maxPages').disabled = isCapturing;
    document.getElementById('delay').disabled = isCapturing;
    
    const actionButtons = document.getElementById('actionButtons');
    if (isCapturing) {
      actionButtons.classList.remove('hidden');
    } else {
      actionButtons.classList.add('hidden');
    }
  }
  
  loadSettings() {
    chrome.storage.local.get(['captureMode', 'lastUrl', 'lastMaxPages', 'lastDelay'], (result) => {
      if (result.captureMode) {
        this.setMode(result.captureMode);
      }
      if (result.lastUrl) {
        document.getElementById('startUrl').value = result.lastUrl;
      }
      if (result.lastMaxPages) {
        document.getElementById('maxPages').value = result.lastMaxPages;
      }
      if (result.lastDelay) {
        document.getElementById('delay').value = result.lastDelay;
      }
    });
  }
  
  showHelp() {
    const helpText = `Web Capture Pro - Help

Mode Selection:
• 📷 Screenshots: Captures visual screenshots of each page
• 📝 Text Extract: Extracts text content from each page

How to Use:
1. Select capture mode
2. Enter starting URL (first page)
3. Set max pages to capture
4. Set delay between pages (for loading)
5. Click Start Capture

For Multi-Page Sites:
• The extension will auto-detect navigation links
• It looks for "Next" buttons, pagination, or sidebar nav
• You can manually navigate if auto-detection fails

Export:
• Screenshots → HTML file (print to PDF)
• Text → Markdown (.md) and Plain Text (.txt)

Tips:
• Increase delay for heavy pages
• Start with small max pages to test
• Check browser console for detailed logs
• Export data before closing popup`;
    
    alert(helpText);
  }
  
  showSettings() {
    const settingsText = `Advanced Settings:

• Max Pages: 1-100 (default: 10)
• Delay: 500-10000ms (default: 2000ms)
• Storage: Data kept for 24 hours

Storage Management:
• Clear stored data: chrome://extensions → Web Capture Pro → Storage
• Export immediately after capture

Troubleshooting:
• Permission denied: Check extension permissions
• No navigation found: Manually click through pages
• Download failed: Check browser download settings

Support:
• Check browser console for errors
• Verify URL format (https://...)
• Ensure page loads before capture
• Try smaller delay values`;
    
    alert(settingsText);
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WebCapturePopup();
  });
} else {
  new WebCapturePopup();
}
