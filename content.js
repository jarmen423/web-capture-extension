// Content script for Web Capture Pro
// Runs in the context of web pages

console.log('Web Capture Pro content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.action) {
    case 'capturePage':
      handleCapturePage(message, sendResponse);
      return true;

    case 'findNextLink':
      handleFindNextLink(message, sendResponse);
      return true;

    case 'extractAllText':
      handleExtractAllText(message, sendResponse);
      return true;

    case 'captureFullPageScreenshots':
      handleCaptureFullPage(message, sendResponse);
      return true;
  }
});

async function handleCapturePage(message, sendResponse) {
  const { sessionId, mode, tabId, customContentSelector, fullPage } = message;

  console.log(`Capturing page in ${mode} mode${fullPage ? ' (full-page)' : ''}`);

  // Scroll to top and wait for stabilization
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 800));

  if (mode === 'screenshot') {
    if (fullPage) {
      await handleCaptureFullPage({ sessionId, tabId }, sendResponse);
      return;
    }
    chrome.runtime.sendMessage({
      action: 'captureScreenshot',
      sessionId: sessionId,
      tabId: tabId
    }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse(response);
      }
    });
  } else if (mode === 'text') {
    const textContent = extractTextFromPage(customContentSelector);
    const pageTitle = document.title;
    const pageUrl = window.location.href;

    chrome.runtime.sendMessage({
      action: 'extractText',
      sessionId: sessionId,
      textContent: textContent,
      pageTitle: pageTitle,
      pageUrl: pageUrl
    }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse(response);
      }
    });
  }
}

function extractTextFromPage(customSelector) {
  let root = null;

  if (customSelector) {
    try {
      root = document.querySelector(customSelector);
    } catch (e) {
      console.warn('Invalid custom selector:', customSelector);
    }
  }

  if (!root && typeof WebCaptureUtils !== 'undefined' && WebCaptureUtils.TextProcessor) {
    root = WebCaptureUtils.TextProcessor.findBestContentRoot(document);
  }

  if (!root) {
    root = document.body;
  }

  // Use the shared htmlToMarkdown if available
  if (typeof WebCaptureUtils !== 'undefined' && WebCaptureUtils.TextProcessor) {
    const md = WebCaptureUtils.TextProcessor.htmlToMarkdown(root);
    return `# ${document.title}\n\nURL: ${window.location.href}\nCaptured: ${new Date().toISOString()}\n\n${md}`;
  }

  // Fallback native extraction
  let content = `# ${document.title}\n\n`;
  content += `URL: ${window.location.href}\n`;
  content += `Captured: ${new Date().toISOString()}\n\n`;

  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const paragraphs = root.querySelectorAll('p, li, pre, td');

  if (headings.length > 0) {
    headings.forEach(h => {
      const level = parseInt(h.tagName.substring(1));
      const prefix = '#'.repeat(level);
      const text = h.textContent.trim().replace(/\s+/g, ' ');
      if (text) content += `${prefix} ${text}\n`;
    });
    content += '\n';
  }

  paragraphs.forEach(p => {
    const text = p.textContent.trim().replace(/\s+/g, ' ');
    if (text && text.length > 10) {
      if (p.tagName === 'LI') {
        content += `- ${text}\n`;
      } else if (p.tagName === 'PRE') {
        content += `\n\`\`\`\n${text}\n\`\`\`\n\n`;
      } else if (p.tagName === 'TD') {
        content += `${text} | `;
      } else {
        content += `${text}\n\n`;
      }
    }
  });

  content = content.replace(/\n{3,}/g, '\n\n');
  return content;
}

async function handleFindNextLink(message, sendResponse) {
  const { sessionId, customNextSelector } = message;

  let nextLink = null;

  if (typeof WebCaptureUtils !== 'undefined' && WebCaptureUtils.NavigationDetector) {
    nextLink = WebCaptureUtils.NavigationDetector.findNextLink(document, customNextSelector);
  } else {
    // Inline fallback
    const relNext = document.querySelector('a[rel="next"]');
    if (relNext && relNext.href) nextLink = relNext;
  }

  if (nextLink && nextLink.href) {
    chrome.runtime.sendMessage({
      action: 'checkVisited',
      url: nextLink.href
    }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ nextUrl: nextLink.href });
      } else if (response && !response.visited) {
        sendResponse({ nextUrl: nextLink.href });
      } else {
        sendResponse({ nextUrl: null });
      }
    });
  } else {
    sendResponse({ nextUrl: null });
  }
}

function handleExtractAllText(message, sendResponse) {
  const text = extractTextFromPage(message.customContentSelector);
  sendResponse({ text: text });
}

// ─── Full-Page Screenshot Support ───────────────────────────────────────────
async function handleCaptureFullPage(message, sendResponse) {
  const { sessionId, tabId } = message;
  const screenshots = [];

  const docHeight = Math.max(
    document.body?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0
  );
  const viewportHeight = window.innerHeight;
  let currentY = 0;

  while (currentY < docHeight) {
    window.scrollTo(0, currentY);
    await new Promise(r => setTimeout(r, 600));

    // Request background to capture this viewport
    const dataUrl = await requestViewportCapture(tabId);
    if (dataUrl) {
      screenshots.push({ dataUrl, scrollY: currentY });
    }

    currentY += viewportHeight;
    if (currentY + viewportHeight > docHeight) {
      currentY = docHeight - viewportHeight;
      if (currentY <= (screenshots[screenshots.length - 1]?.scrollY || -1)) break;
    }
  }

  // Scroll back to top
  window.scrollTo(0, 0);

  // Send all captured viewports to background
  chrome.runtime.sendMessage({
    action: 'captureFullPageComplete',
    sessionId,
    screenshots,
    pageUrl: window.location.href
  }, (response) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse(response);
    }
  });
}

function requestViewportCapture(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'captureViewport',
      tabId: tabId
    }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        resolve(null);
      } else {
        resolve(response.dataUrl || null);
      }
    });
  });
}

// Helper: Wait for page to be fully loaded
function waitForLoad() {
  return new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

waitForLoad().then(() => {
  console.log('Page fully loaded, ready for capture');
});

// Global error handling
window.addEventListener('error', (e) => {
  console.error('[WebCapturePro Content] Error:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[WebCapturePro Content] Unhandled rejection:', e.reason);
});
