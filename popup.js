// Popup.js - UI Logic for Web Capture Pro

class WebCapturePopup {
  constructor() {
    this.mode = 'screenshot';
    this.isCapturing = false;
    this.isPaused = false;
    this.currentSessionId = null;
    this.currentPage = 0;
    this.totalPages = 0;
    this.init();
  }

  init() {
    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    // Buttons
    document.getElementById('startBtn').addEventListener('click', () => this.startCapture());
    document.getElementById('stopBtn').addEventListener('click', () => this.stopCapture());
    document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportData('html'));
    document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportData('pdf'));
    document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
    document.getElementById('optionsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

    // Advanced toggle
    const advToggle = document.getElementById('advancedToggle');
    advToggle.addEventListener('click', () => {
      const section = document.getElementById('advancedSection');
      const arrow = document.getElementById('advancedArrow');
      section.classList.toggle('open');
      arrow.textContent = section.classList.contains('open') ? '▲' : '▼';
    });

    // Full page checkbox visibility
    document.getElementById('fullPage').addEventListener('change', (e) => {
      chrome.storage.local.set({ fullPageDefault: e.target.checked });
    });

    // Background messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message, sendResponse);
      return true;
    });

    // Restore state
    this.loadSettings();
    this.restoreSessionState();
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const urlSection = document.getElementById('urlSection');
    const batchSection = document.getElementById('batchSection');
    const screenshotOptions = document.getElementById('screenshotOptions');

    if (mode === 'batch') {
      urlSection.classList.add('hidden');
      batchSection.classList.remove('hidden');
    } else {
      urlSection.classList.remove('hidden');
      batchSection.classList.add('hidden');
    }

    screenshotOptions.classList.toggle('hidden', mode !== 'screenshot');
    chrome.storage.local.set({ captureMode: mode });
  }

  async restoreSessionState() {
    try {
      const response = await this.sendMessage({ action: 'getActiveSession' });
      if (response?.session && !response.session.completed) {
        const s = response.session;
        this.currentSessionId = s.sessionId;
        this.mode = s.mode;
        this.isCapturing = true;
        this.isPaused = s.paused;
        this.currentPage = s.currentPage;
        this.totalPages = s.maxPages;

        this.setMode(this.mode);
        this.toggleControls(true);
        this.showProgress(true);
        this.updateProgress(s.currentPage, s.maxPages);
        this.updateStatus(`Session ${s.paused ? 'paused' : 'active'} — ${s.currentPage}/${s.maxPages} pages`, s.paused ? 'warning' : 'active');
        this.updatePauseButton();
        this.showExportIfComplete(s);
      }
    } catch (e) {
      console.log('No active session to restore');
    }
  }

  async startCapture() {
    const startUrl = document.getElementById('startUrl').value.trim();
    const batchRaw = document.getElementById('batchUrls').value.trim();
    const maxPages = parseInt(document.getElementById('maxPages').value);
    const delay = parseInt(document.getElementById('delay').value);
    const customContentSelector = document.getElementById('customContentSelector').value.trim();
    const customNextSelector = document.getElementById('customNextSelector').value.trim();
    const fullPage = document.getElementById('fullPage').checked;

    let batchUrls = [];
    if (this.mode === 'batch') {
      batchUrls = batchRaw.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
      if (batchUrls.length === 0) {
        this.updateStatus('Please enter at least one valid URL', 'error');
        return;
      }
    } else {
      if (!startUrl) {
        this.updateStatus('Please enter a start URL', 'error');
        return;
      }
      if (!startUrl.startsWith('http://') && !startUrl.startsWith('https://')) {
        this.updateStatus('URL must start with http:// or https://', 'error');
        return;
      }
    }

    if (maxPages < 1 || maxPages > 100) {
      this.updateStatus('Max pages must be between 1 and 100', 'error');
      return;
    }

    this.isCapturing = true;
    this.isPaused = false;
    this.currentPage = 0;
    this.totalPages = maxPages;
    this.toggleControls(true);
    this.updateStatus('Starting capture session...', 'active');
    this.showProgress(true);
    this.clearErrors();

    chrome.storage.local.set({
      lastUrl: startUrl,
      lastMaxPages: maxPages,
      lastDelay: delay,
      lastBatchUrls: batchRaw,
      lastCustomContentSelector: customContentSelector,
      lastCustomNextSelector: customNextSelector
    });

    try {
      const response = await this.sendMessage({
        action: 'startCapture',
        mode: this.mode,
        startUrl: startUrl,
        maxPages: maxPages,
        delay: delay,
        customContentSelector,
        customNextSelector,
        batchUrls,
        fullPage
      });

      if (response?.success) {
        this.currentSessionId = response.sessionId;
        this.updateStatus(`Session started — ${this.mode} mode`, 'active');
        chrome.action.setBadgeText({ text: 'REC' });
        chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error) {
      this.updateStatus(`Error: ${error.message}`, 'error');
      this.stopCapture();
    }
  }

  stopCapture() {
    this.isCapturing = false;
    this.isPaused = false;
    this.toggleControls(false);
    this.updateStatus('Capture stopped', 'error');
    this.showProgress(false);
    chrome.action.setBadgeText({ text: '' });

    if (this.currentSessionId) {
      this.sendMessage({
        action: 'cancelCapture',
        sessionId: this.currentSessionId
      }).catch(() => {});
    }
    this.currentSessionId = null;
  }

  async togglePause() {
    if (!this.isCapturing || !this.currentSessionId) return;

    if (this.isPaused) {
      this.isPaused = false;
      this.updateStatus('Resuming capture...', 'active');
      await this.sendMessage({ action: 'resumeCapture', sessionId: this.currentSessionId });
      chrome.action.setBadgeText({ text: 'REC' });
      chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
    } else {
      this.isPaused = true;
      this.updateStatus('Capture paused', 'warning');
      await this.sendMessage({ action: 'pauseCapture', sessionId: this.currentSessionId });
      chrome.action.setBadgeText({ text: 'PAU' });
      chrome.action.setBadgeBackgroundColor({ color: '#ff9800' });
    }
    this.updatePauseButton();
  }

  updatePauseButton() {
    const btn = document.getElementById('pauseBtn');
    btn.textContent = this.isPaused ? 'Resume' : 'Pause';
    btn.className = this.isPaused ? 'btn-resume' : 'btn-pause';
  }

  async exportData(format) {
    if (!this.currentSessionId) {
      this.updateStatus('No active session to export', 'error');
      return;
    }

    this.updateStatus('Preparing export...', 'active');

    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['captureData'], resolve);
      });
      const data = result.captureData?.[this.currentSessionId];

      if (!data) {
        this.updateStatus('No data to export yet', 'error');
        return;
      }

      if (this.mode === 'screenshot' || data.mode === 'screenshot') {
        if (format === 'pdf') {
          await this.exportPDF(data);
        } else {
          this.exportScreenshots(data);
        }
      } else {
        this.exportText(data);
      }
    } catch (error) {
      this.updateStatus(`Export failed: ${error.message}`, 'error');
    }
  }

  exportScreenshots(sessionData) {
    if (!sessionData.screenshots?.length) {
      this.updateStatus('No screenshots captured', 'error');
      return;
    }
    const html = this.createScreenshotHTML(sessionData);
    const filename = `capture_${this.currentSessionId}_${Date.now()}.html`;
    this.downloadFile(html, filename, 'text/html');
    this.updateStatus(`Exported ${sessionData.screenshots.length} screenshots as HTML`, 'success');
  }

  async exportPDF(sessionData) {
    if (!sessionData.screenshots?.length) {
      this.updateStatus('No screenshots captured', 'error');
      return;
    }
    this.updateStatus('Generating PDF... (this may take a moment)', 'active');

    try {
      // Use background's offscreen document generator if available
      const response = await this.sendMessage({
        action: 'generatePDFOffscreen',
        sessionId: this.currentSessionId
      });

      if (response?.pdfDataUrl) {
        const filename = `capture_${this.currentSessionId}_${Date.now()}.pdf`;
        this.downloadFile(response.pdfDataUrl, filename, 'application/pdf');
        this.updateStatus('PDF exported successfully', 'success');
      } else if (response?.error) {
        throw new Error(response.error);
      } else {
        throw new Error('PDF generation did not return data');
      }
    } catch (error) {
      console.warn('PDF generation failed, falling back to HTML:', error.message);
      this.updateStatus(`PDF failed: ${error.message}. Falling back to HTML...`, 'warning');
      this.exportScreenshots(sessionData);
    }
  }

  exportText(sessionData) {
    if (!sessionData.extractedText?.length) {
      this.updateStatus('No text extracted', 'error');
      return;
    }

    let markdown = '# Web Capture Pro — Extracted Documentation\n\n';
    markdown += `**Captured:** ${new Date().toISOString()}\n`;
    markdown += `**Session ID:** ${this.currentSessionId}\n`;
    markdown += `**Total Pages:** ${sessionData.extractedText.length}\n\n`;
    markdown += '---\n\n';

    sessionData.extractedText.forEach((page, index) => {
      if (typeof WebCaptureUtils !== 'undefined' && WebCaptureUtils.TextProcessor) {
        markdown += WebCaptureUtils.TextProcessor.toMarkdown(page.title, page.content, page.url, page.timestamp);
      } else {
        markdown += `## Page ${index + 1}: ${page.title}\n`;
        markdown += `**URL:** ${page.url}\n\n`;
        markdown += page.content + '\n\n';
      }
      markdown += '---\n\n';
    });

    const plainText = this.convertToPlainText(markdown);
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
  <title>Web Capture — ${this.currentSessionId}</title>
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
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`/g, '')
      .replace(/^---$/gm, '---')
      .replace(/\n{3,}/g, '\n\n');
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename, saveAs: true }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        this.updateStatus('Download failed: ' + chrome.runtime.lastError.message, 'error');
      }
    });
  }

  handleBackgroundMessage(message, sendResponse) {
    switch (message.action) {
      case 'captureProgress':
        if (message.sessionId === this.currentSessionId) {
          this.currentPage = message.current;
          this.totalPages = message.total;
          this.updateProgress(message.current, message.total);
          this.updateStatus(
            `${message.mode === 'screenshot' ? 'Captured' : 'Extracted'} ${message.current}/${message.total} — ${message.url || ''}`,
            'active'
          );
        }
        break;

      case 'captureComplete':
        if (message.sessionId === this.currentSessionId) {
          this.isCapturing = false;
          this.isPaused = false;
          chrome.action.setBadgeText({ text: '' });
          this.updateStatus(`Complete — ${message.count} pages ${message.mode === 'screenshot' ? 'captured' : 'extracted'}`, 'success');
          this.updateProgress(message.count, message.count);
          this.showExportButton(true);
        }
        break;

      case 'sessionError':
        if (message.sessionId === this.currentSessionId) {
          this.addError(message.error);
          this.updateStatus(message.error, 'warning');
        }
        break;
    }
    sendResponse?.({ success: true });
  }

  showExportButton(show) {
    document.getElementById('exportBtn').classList.toggle('hidden', !show);
    const isScreenshot = this.mode === 'screenshot';
    document.getElementById('exportPdfBtn').classList.toggle('hidden', !(show && isScreenshot));
  }

  showExportIfComplete(sessionData) {
    if (sessionData.completed) {
      this.showExportButton(true);
    }
  }

  updateStatus(message, type = 'info') {
    const el = document.getElementById('status');
    el.textContent = message;
    el.className = 'status';
    if (type) el.classList.add(type);
  }

  showProgress(show) {
    document.getElementById('progress').style.display = show ? 'block' : 'none';
    if (!show) this.updateProgress(0, 1);
  }

  updateProgress(current, total) {
    const bar = document.getElementById('progressBar');
    const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    bar.style.width = percent + '%';
  }

  toggleControls(isCapturing) {
    document.getElementById('startBtn').disabled = isCapturing;
    document.getElementById('startUrl').disabled = isCapturing;
    document.getElementById('batchUrls').disabled = isCapturing;
    document.getElementById('maxPages').disabled = isCapturing;
    document.getElementById('delay').disabled = isCapturing;
    document.getElementById('fullPage').disabled = isCapturing;

    const actionButtons = document.getElementById('actionButtons');
    actionButtons.classList.toggle('hidden', !isCapturing);

    if (!isCapturing) {
      this.showExportButton(false);
    }
  }

  addError(msg) {
    const list = document.getElementById('errorList');
    list.classList.remove('hidden');
    const item = document.createElement('div');
    item.className = 'error-item';
    item.textContent = msg;
    list.appendChild(item);
  }

  clearErrors() {
    const list = document.getElementById('errorList');
    list.innerHTML = '';
    list.classList.add('hidden');
  }

  loadSettings() {
    chrome.storage.local.get([
      'captureMode', 'lastUrl', 'lastMaxPages', 'lastDelay',
      'lastBatchUrls', 'lastCustomContentSelector', 'lastCustomNextSelector', 'fullPageDefault'
    ], (result) => {
      if (result.captureMode) this.setMode(result.captureMode);
      if (result.lastUrl) document.getElementById('startUrl').value = result.lastUrl;
      if (result.lastMaxPages) document.getElementById('maxPages').value = result.lastMaxPages;
      if (result.lastDelay) document.getElementById('delay').value = result.lastDelay;
      if (result.lastBatchUrls) document.getElementById('batchUrls').value = result.lastBatchUrls;
      if (result.lastCustomContentSelector) document.getElementById('customContentSelector').value = result.lastCustomContentSelector;
      if (result.lastCustomNextSelector) document.getElementById('customNextSelector').value = result.lastCustomNextSelector;
      if (result.fullPageDefault) document.getElementById('fullPage').checked = true;
    });
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  showHelp() {
    const helpText = `Web Capture Pro — Help

Modes:
• 📷 Screenshots: Capture PNG screenshots of each page
• 📝 Text: Extract structured text as Markdown & TXT
• 📋 Batch: Provide a list of URLs to capture in order

Auto-Navigation:
The extension detects Next links, pagination, and sidebar TOC.
If auto-detection fails, use Advanced Options to set a custom Next Link CSS Selector.

Export:
• Screenshots → HTML (print to PDF) or true PDF (Chrome 109+)
• Text → Markdown (.md) + Plain Text (.txt)

Tips:
• Increase delay for heavy/lazy-loaded pages
• Use Custom Content Selector to target specific page areas
• Export immediately after capture
• Check browser console for detailed logs`;
    alert(helpText);
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new WebCapturePopup());
} else {
  new WebCapturePopup();
}
