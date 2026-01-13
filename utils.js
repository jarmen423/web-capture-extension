// Utility functions for Web Capture Pro

// Define global namespace
self.WebCaptureUtils = {};

// PDF Generation utilities (simplified approach)
self.WebCaptureUtils.PDFGenerator = class PDFGenerator {
  static async generateFromScreenshots(screenshots, filename) {
    // This would require jsPDF library
    // For now, we provide HTML export which can be printed to PDF
    console.log('PDF generation would use jsPDF library');
    return null;
  }
};

// Text processing utilities
self.WebCaptureUtils.TextProcessor = class TextProcessor {
  static cleanText(text) {
    return text
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')     // Remove excess newlines
      .trim();
  }
  
  static extractHeadings(text) {
    const lines = text.split('\n');
    return lines.filter(line => line.match(/^#{1,6}\s/));
  }
  
  static toMarkdown(title, content, url, timestamp) {
    return `# ${title}\n\n**URL:** ${url}\n**Captured:** ${new Date(timestamp).toISOString()}\n\n${content}\n`;
  }
};

// Navigation detection utilities
self.WebCaptureUtils.NavigationDetector = class NavigationDetector {
  static findNextLink(document) {
    const patterns = [
      { selector: 'a:contains("Next")', weight: 10 },
      { selector: 'a:contains("next")', weight: 10 },
      { selector: 'a[rel="next"]', weight: 9 },
      { selector: '.next', weight: 8 },
      { selector: '.next-page', weight: 8 },
      { selector: '.pagination-next', weight: 7 },
      { selector: 'a.nav-next', weight: 7 },
      { selector: '.next-link', weight: 7 },
      { selector: 'a:contains("→")', weight: 6 },
      { selector: 'a:contains("→")', weight: 6 }
    ];
    
    for (const pattern of patterns) {
      try {
        const elements = document.querySelectorAll(pattern.selector);
        if (elements.length > 0) {
          return elements[0];
        }
      } catch (e) {
        // Selector might not work, continue
      }
    }
    
    return null;
  }
  
  static isDocumentationLink(link) {
    const href = link.href || '';
    const text = link.textContent.toLowerCase();
    
    return href.includes('/docs/') ||
           href.includes('/doc/') ||
           href.includes('/documentation/') ||
           href.includes('/chapter') ||
           href.includes('/section') ||
           href.match(/\d+/) ||
           text.includes('next') ||
           text.includes('chapter') ||
           text.includes('section');
  }
};

// Storage management
self.WebCaptureUtils.StorageManager = class StorageManager {
  static async saveCaptureData(sessionId, data) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['captureData'], (result) => {
        const captureData = result.captureData || {};
        captureData[sessionId] = data;
        chrome.storage.local.set({ captureData }, () => {
          resolve();
        });
      });
    });
  }
  
  static async getCaptureData(sessionId) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['captureData'], (result) => {
        const captureData = result.captureData || {};
        resolve(captureData[sessionId]);
      });
    });
  }
  
  static async cleanupOldSessions(hours = 24) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['captureData'], (result) => {
        const captureData = result.captureData || {};
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        
        for (const sessionId in captureData) {
          const session = captureData[sessionId];
          if (session.timestamp && session.timestamp < cutoff) {
            delete captureData[sessionId];
          }
        }
        
        chrome.storage.local.set({ captureData }, () => {
          resolve();
        });
      });
    });
  }
};

// Error handling
self.WebCaptureUtils.ErrorHandler = class ErrorHandler {
  static log(error, context = '') {
    console.error(`[WebCapturePro] ${context}:`, error);
    return {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: Date.now()
    };
  }
  
  static notifyUser(message, type = 'error') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: `Web Capture Pro - ${type.toUpperCase()}`,
      message: message
    });
  }
};
