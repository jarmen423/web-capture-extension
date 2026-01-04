// Background service worker for Web Capture Pro

// Store for active capture sessions
const captureSessions = new Map();

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.action) {
    case 'startCapture':
      handleStartCapture(message, sender, sendResponse);
      return true; // Keep channel open for async response
      
    case 'captureScreenshot':
      handleCaptureScreenshot(message, sender, sendResponse);
      return true;
      
    case 'extractText':
      handleExtractText(message, sender, sendResponse);
      return true;
      
    case 'processNextPage':
      handleProcessNextPage(message, sender, sendResponse);
      return true;
      
    case 'completeSession':
      handleCompleteSession(message, sender, sendResponse);
      return true;
  }
});

async function handleStartCapture(message, sender, sendResponse) {
  const { mode, startUrl, maxPages, delay } = message;
  const sessionId = Date.now().toString();
  
  console.log(`Starting capture session ${sessionId} - Mode: ${mode}`);
  
  // Initialize session
  captureSessions.set(sessionId, {
    mode,
    startUrl,
    maxPages: maxPages || 50,
    delay: delay || 1000,
    currentPage: 0,
    visitedUrls: new Set(),
    screenshots: [],
    extractedText: [],
    startTime: Date.now()
  });
  
  // Notify user
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Web Capture Started',
    message: `Capturing ${mode} from ${startUrl}`
  });
  
  // Open first tab
  chrome.tabs.create({ url: startUrl, active: false }, (tab) => {
    // Wait for tab to load, then start capture
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'capturePage',
        sessionId: sessionId,
        mode: mode,
        tabId: tab.id
      });
    }, 3000);
  });
  
  sendResponse({ success: true, sessionId });
}

async function handleCaptureScreenshot(message, sender, sendResponse) {
  const { sessionId, tabId } = message;
  const session = captureSessions.get(sessionId);
  
  if (!session) {
    sendResponse({ error: 'Session not found' });
    return;
  }
  
  try {
    // Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: 'png', quality: 100 });
    
    session.screenshots.push({
      url: sender.url,
      dataUrl: dataUrl,
      timestamp: Date.now()
    });
    
    session.currentPage++;
    
    console.log(`Captured screenshot ${session.currentPage}/${session.maxPages}`);
    
    sendResponse({ success: true, current: session.currentPage, total: session.maxPages });
    
    // Auto-advance to next page
    if (session.currentPage < session.maxPages) {
      setTimeout(() => {
        navigateToNextPage(sessionId);
      }, session.delay);
    } else {
      // Complete session
      await compilePDF(sessionId);
    }
    
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    sendResponse({ error: error.message });
  }
}

async function handleExtractText(message, sender, sendResponse) {
  const { sessionId, textContent, pageTitle, pageUrl } = message;
  const session = captureSessions.get(sessionId);
  
  if (!session) {
    sendResponse({ error: 'Session not found' });
    return;
  }
  
  // Store extracted text
  session.extractedText.push({
    url: pageUrl,
    title: pageTitle,
    content: textContent,
    timestamp: Date.now()
  });
  
  session.currentPage++;
  
  console.log(`Extracted text from page ${session.currentPage}`);
  
  sendResponse({ success: true, current: session.currentPage, total: session.maxPages });
  
  // Auto-advance
  if (session.currentPage < session.maxPages) {
    setTimeout(() => {
      navigateToNextPage(sessionId);
    }, session.delay);
  } else {
    // Complete session
    await compileTextFiles(sessionId);
  }
}

function navigateToNextPage(sessionId) {
  const session = captureSessions.get(sessionId);
  if (!session) return;
  
  // Find next tab or create new one
  chrome.tabs.query({}, (tabs) => {
    const relevantTabs = tabs.filter(t => t.url && t.url.startsWith('http'));
    
    if (relevantTabs.length > 0) {
      const currentTab = relevantTabs[relevantTabs.length - 1];
      
      // Try to find next link (this is a simplified approach)
      chrome.tabs.sendMessage(currentTab.id, {
        action: 'findNextLink',
        sessionId: sessionId
      }, (response) => {
        if (response && response.nextUrl) {
          // Navigate to next URL
          chrome.tabs.update(currentTab.id, { url: response.nextUrl }, () => {
            setTimeout(() => {
              chrome.tabs.sendMessage(currentTab.id, {
                action: 'capturePage',
                sessionId: sessionId,
                mode: session.mode,
                tabId: currentTab.id
              });
            }, 3000);
          });
        } else {
          // No more links, complete
          if (session.mode === 'screenshot') {
            compilePDF(sessionId);
          } else {
            compileTextFiles(sessionId);
          }
        }
      });
    }
  });
}

async function compilePDF(sessionId) {
  const session = captureSessions.get(sessionId);
  if (!session || session.screenshots.length === 0) return;
  
  console.log(`Compiling ${session.screenshots.length} screenshots into PDF`);
  
  // Send to popup/content for PDF generation
  chrome.runtime.sendMessage({
    action: 'generatePDF',
    sessionId: sessionId,
    screenshots: session.screenshots
  });
  
  // Notify completion
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Capture Complete',
    message: `${session.screenshots.length} screenshots captured`
  });
}

async function compileTextFiles(sessionId) {
  const session = captureSessions.get(sessionId);
  if (!session || session.extractedText.length === 0) return;
  
  console.log(`Compiling ${session.extractedText.length} text extracts`);
  
  // Send to popup/content for file generation
  chrome.runtime.sendMessage({
    action: 'generateTextFiles',
    sessionId: sessionId,
    extractedText: session.extractedText
  });
  
  // Notify completion
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Extraction Complete',
    message: `${session.extractedText.length} pages extracted`
  });
}

async function handleProcessNextPage(message, sender, sendResponse) {
  // Placeholder for manual page processing
  sendResponse({ success: true });
}

async function handleCompleteSession(message, sender, sendResponse) {
  const { sessionId, mode } = message;
  
  if (mode === 'screenshot') {
    await compilePDF(sessionId);
  } else {
    await compileTextFiles(sessionId);
  }
  
  sendResponse({ success: true });
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of captureSessions.entries()) {
    if (now - session.startTime > 3600000) { // 1 hour
      captureSessions.delete(id);
    }
  }
}, 600000); // Every 10 minutes

console.log('Web Capture Pro background service worker loaded');
