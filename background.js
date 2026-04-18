importScripts('utils.js');

// Background service worker for Web Capture Pro

const captureSessions = new Map();
let offscreenDocumentPath = null;

// ─── Message Router ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  const handlers = {
    startCapture: handleStartCapture,
    captureScreenshot: handleCaptureScreenshot,
    extractText: handleExtractText,
    processNextPage: handleProcessNextPage,
    completeSession: handleCompleteSession,
    pauseCapture: handlePauseCapture,
    resumeCapture: handleResumeCapture,
    checkVisited: handleCheckVisited,
    cancelCapture: handleCancelCapture,
    getActiveSession: handleGetActiveSession,
    captureViewport: handleCaptureViewport,
    captureFullPageComplete: handleCaptureFullPageComplete,
    generatePDFOffscreen: handleGeneratePDFOffscreen
  };

  const handler = handlers[message.action];
  if (handler) {
    handler(message, sender, sendResponse);
    return true; // keep channel open for async
  }
});

// ─── Tab Lifecycle Tracking ─────────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  for (const [id, session] of captureSessions.entries()) {
    if (session.tabId === tabId) {
      console.warn(`Session ${id} tab ${tabId} was closed`);
      session.paused = true;
      session.tabId = null;
      session.errors.push({ time: Date.now(), message: 'Tab was closed by user' });
      persistSession(id);
      broadcastToPopup({ action: 'sessionError', sessionId: id, error: 'Tab was closed. Click Resume to reopen.' });
      break;
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    for (const [id, session] of captureSessions.entries()) {
      if (session.pendingTabLoad === tabId) {
        session.pendingTabLoad = null;
        console.log(`Tab ${tabId} loaded, proceeding with capture for session ${id}`);
        setTimeout(() => {
          sendToTab(session.tabId, {
            action: 'capturePage',
            sessionId: id,
            mode: session.mode,
            tabId: session.tabId,
            customContentSelector: session.customContentSelector,
            fullPage: session.fullPage
          });
        }, session.delay);
      }
    }
  }
});

// ─── Keep-Alive During Active Sessions ──────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    const hasActive = Array.from(captureSessions.values()).some(s => !s.completed && !s.paused);
    if (!hasActive) {
      chrome.alarms.clear('keepAlive');
    }
  }
});

function startKeepAlive() {
  chrome.alarms.get('keepAlive', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
    }
  });
}

// ─── Session Management ─────────────────────────────────────────────────────
function createSession({ mode, startUrl, maxPages, delay, customContentSelector, customNextSelector, batchUrls, fullPage }) {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const session = {
    sessionId,
    mode,
    startUrl,
    maxPages: Math.min(Math.max(parseInt(maxPages) || 10, 1), 100),
    delay: Math.max(parseInt(delay) || 1000, 500),
    currentPage: 0,
    visitedUrls: new Set(),
    screenshots: [],
    extractedText: [],
    startTime: Date.now(),
    paused: false,
    pendingNavigation: false,
    pendingTabLoad: null,
    tabId: null,
    errors: [],
    completed: false,
    customContentSelector: customContentSelector || '',
    customNextSelector: customNextSelector || '',
    batchUrls: Array.isArray(batchUrls) ? batchUrls : [],
    batchIndex: 0,
    fullPage: !!fullPage
  };
  captureSessions.set(sessionId, session);
  persistSession(sessionId);
  return session;
}

async function persistSession(sessionId) {
  const session = captureSessions.get(sessionId);
  if (!session) return;
  // Don't persist heavy screenshot data to storage; keep that in memory
  const light = {
    sessionId: session.sessionId,
    mode: session.mode,
    startUrl: session.startUrl,
    maxPages: session.maxPages,
    delay: session.delay,
    currentPage: session.currentPage,
    paused: session.paused,
    completed: session.completed,
    tabId: session.tabId,
    errors: session.errors.slice(-5),
    startTime: session.startTime,
    customContentSelector: session.customContentSelector,
    customNextSelector: session.customNextSelector,
    batchUrls: session.batchUrls,
    batchIndex: session.batchIndex
  };
  await WebCaptureUtils.StorageManager.setActiveSession(light);
}

async function clearPersistedSession() {
  await WebCaptureUtils.StorageManager.clearActiveSession();
}

function broadcastToPopup(message) {
  try {
    chrome.runtime.sendMessage(message);
  } catch (e) {
    // Popup may be closed; that's fine
  }
}

async function sendToTab(tabId, message) {
  try {
    await chrome.tabs.get(tabId);
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('sendMessage error:', chrome.runtime.lastError.message);
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(response || {});
        }
      });
    });
  } catch (e) {
    console.warn('Tab not found:', tabId, e.message);
    return { error: 'Tab not found' };
  }
}

// ─── Handlers ───────────────────────────────────────────────────────────────
async function handleStartCapture(message, sender, sendResponse) {
  try {
    const { mode, startUrl, maxPages, delay, customContentSelector, customNextSelector, batchUrls, fullPage } = message;
    const session = createSession({ mode, startUrl, maxPages, delay, customContentSelector, customNextSelector, batchUrls, fullPage });

    console.log(`Starting capture session ${session.sessionId} - Mode: ${mode}`);

    startKeepAlive();

    chrome.notifications.create({
      type: 'basic',
      iconUrl: WebCaptureUtils.ICON_URL,
      title: 'Web Capture Started',
      message: `Capturing ${mode} from ${startUrl || batchUrls?.[0] || 'batch list'}`
    });

    // For batch mode, navigate to first URL
    const firstUrl = Array.isArray(batchUrls) && batchUrls.length > 0 ? batchUrls[0] : startUrl;

    chrome.tabs.create({ url: firstUrl, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to create tab:', chrome.runtime.lastError.message);
        captureSessions.delete(session.sessionId);
        return;
      }
      session.tabId = tab.id;
      session.pendingTabLoad = tab.id;
      persistSession(session.sessionId);
    });

    sendResponse({ success: true, sessionId: session.sessionId });
  } catch (error) {
    WebCaptureUtils.ErrorHandler.log(error, 'startCapture');
    sendResponse({ error: error.message });
  }
}

async function handleCaptureViewport(message, sender, sendResponse) {
  const { tabId } = message;
  try {
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tabId, { active: true });
    await new Promise(r => setTimeout(r, 500));
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png', quality: 100 });
    sendResponse({ success: true, dataUrl });
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

async function handleCaptureScreenshot(message, sender, sendResponse) {
  const { sessionId, tabId } = message;
  const session = captureSessions.get(sessionId);

  if (!session) {
    sendResponse({ error: 'Session not found' });
    return;
  }

  if (session.paused) {
    sendResponse({ success: false, reason: 'paused' });
    return;
  }

  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.windows.update(tab.windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
      await new Promise(r => setTimeout(r, 500));

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png', quality: 100 });

      session.screenshots.push({
        url: sender.url,
        dataUrl: dataUrl,
        timestamp: Date.now()
      });
      session.visitedUrls.add(sender.url);
      session.currentPage++;

      console.log(`Captured screenshot ${session.currentPage}/${session.maxPages} (attempt ${attempt})`);

      broadcastToPopup({
        action: 'captureProgress',
        sessionId,
        current: session.currentPage,
        total: session.maxPages,
        url: sender.url,
        mode: 'screenshot'
      });

      persistSession(sessionId);
      sendResponse({ success: true, current: session.currentPage, total: session.maxPages, dataUrl: dataUrl });

      if (session.currentPage < session.maxPages) {
        setTimeout(() => navigateToNextPage(sessionId), session.delay);
      } else {
        finishSession(sessionId);
      }
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Screenshot attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000));
    }
  }

  session.errors.push({ time: Date.now(), message: lastError.message });
  WebCaptureUtils.ErrorHandler.notifyUser(`Screenshot failed after ${MAX_RETRIES} attempts: ${lastError.message}`, 'error');
  sendResponse({ error: lastError.message });

  // Try to continue anyway
  if (session.currentPage < session.maxPages) {
    setTimeout(() => navigateToNextPage(sessionId), session.delay);
  }
}

async function handleExtractText(message, sender, sendResponse) {
  const { sessionId, textContent, pageTitle, pageUrl } = message;
  const session = captureSessions.get(sessionId);

  if (!session) {
    sendResponse({ error: 'Session not found' });
    return;
  }

  if (session.paused) {
    sendResponse({ success: false, reason: 'paused' });
    return;
  }

  session.extractedText.push({
    url: pageUrl,
    title: pageTitle,
    content: textContent,
    timestamp: Date.now()
  });
  session.visitedUrls.add(pageUrl);
  session.currentPage++;

  console.log(`Extracted text from page ${session.currentPage}`);

  broadcastToPopup({
    action: 'captureProgress',
    sessionId,
    current: session.currentPage,
    total: session.maxPages,
    url: pageUrl,
    mode: 'text'
  });

  persistSession(sessionId);
  sendResponse({ success: true, current: session.currentPage, total: session.maxPages });

  if (session.currentPage < session.maxPages) {
    setTimeout(() => navigateToNextPage(sessionId), session.delay);
  } else {
    finishSession(sessionId);
  }
}

async function navigateToNextPage(sessionId) {
  const session = captureSessions.get(sessionId);
  if (!session || session.completed) return;

  if (session.paused) {
    session.pendingNavigation = true;
    console.log(`Session ${sessionId} paused, navigation pending`);
    return;
  }

  // Batch mode: use next URL in list
  if (session.batchUrls.length > 0) {
    session.batchIndex++;
    if (session.batchIndex < session.batchUrls.length && session.batchIndex < session.maxPages) {
      const nextUrl = session.batchUrls[session.batchIndex];
      console.log(`Batch mode: navigating to URL ${session.batchIndex + 1}: ${nextUrl}`);
      await navigateTabToUrl(session, nextUrl);
    } else {
      finishSession(sessionId);
    }
    return;
  }

  // Auto-detect next link
  if (!session.tabId) {
    console.warn(`Session ${sessionId} has no tabId, cannot navigate`);
    session.errors.push({ time: Date.now(), message: 'No active tab for navigation' });
    finishSession(sessionId);
    return;
  }

  const response = await sendToTab(session.tabId, {
    action: 'findNextLink',
    sessionId,
    customNextSelector: session.customNextSelector
  });

  if (response && response.nextUrl && !session.visitedUrls.has(response.nextUrl)) {
    await navigateTabToUrl(session, response.nextUrl);
  } else {
    console.log(`No next link found for session ${sessionId}, completing`);
    finishSession(sessionId);
  }
}

async function navigateTabToUrl(session, url) {
  if (session.tabId) {
    try {
      await chrome.tabs.get(session.tabId);
      chrome.tabs.update(session.tabId, { url }, () => {
        if (chrome.runtime.lastError) {
          console.error('Navigation failed:', chrome.runtime.lastError.message);
          session.errors.push({ time: Date.now(), message: chrome.runtime.lastError.message });
          createNewTabForSession(session, url);
        } else {
          session.pendingTabLoad = session.tabId;
        }
      });
      return;
    } catch (e) {
      // Tab no longer exists
    }
  }
  createNewTabForSession(session, url);
}

function createNewTabForSession(session, url) {
  chrome.tabs.create({ url, active: true }, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to create tab:', chrome.runtime.lastError.message);
      session.errors.push({ time: Date.now(), message: chrome.runtime.lastError.message });
      finishSession(session.sessionId);
      return;
    }
    session.tabId = tab.id;
    session.pendingTabLoad = tab.id;
    persistSession(session.sessionId);
  });
}

function handlePauseCapture(message, sender, sendResponse) {
  const { sessionId } = message;
  const session = captureSessions.get(sessionId);
  if (session) {
    session.paused = true;
    console.log(`Session ${sessionId} paused`);
    persistSession(sessionId);
    sendResponse({ success: true });
  } else {
    sendResponse({ error: 'Session not found' });
  }
}

function handleResumeCapture(message, sender, sendResponse) {
  const { sessionId } = message;
  const session = captureSessions.get(sessionId);
  if (session) {
    session.paused = false;
    console.log(`Session ${sessionId} resumed`);
    persistSession(sessionId);

    if (session.pendingNavigation) {
      session.pendingNavigation = false;
      navigateToNextPage(sessionId);
    } else if (session.pendingTabLoad && session.tabId) {
      // Tab is still loading, let onUpdated handle it
    } else if (session.tabId) {
      // Re-trigger capture on current tab
      setTimeout(() => {
        sendToTab(session.tabId, {
          action: 'capturePage',
          sessionId,
          mode: session.mode,
          tabId: session.tabId,
          customContentSelector: session.customContentSelector,
          fullPage: session.fullPage
        });
      }, session.delay);
    }
    sendResponse({ success: true });
  } else {
    sendResponse({ error: 'Session not found' });
  }
}

function handleCheckVisited(message, sender, sendResponse) {
  const { url } = message;
  let visited = false;
  for (const session of captureSessions.values()) {
    if (session.visitedUrls.has(url)) {
      visited = true;
      break;
    }
  }
  sendResponse({ visited });
}

function handleCancelCapture(message, sender, sendResponse) {
  const { sessionId } = message;
  const session = captureSessions.get(sessionId);
  if (session) {
    session.completed = true;
    if (session.tabId) {
      chrome.tabs.remove(session.tabId).catch(() => {});
    }
    captureSessions.delete(sessionId);
  }
  clearPersistedSession();
  sendResponse({ success: true });
}

async function handleGetActiveSession(message, sender, sendResponse) {
  const session = await WebCaptureUtils.StorageManager.getActiveSession();
  sendResponse({ session });
}

async function handleCaptureFullPageComplete(message, sender, sendResponse) {
  const { sessionId, screenshots, pageUrl } = message;
  const session = captureSessions.get(sessionId);
  if (!session) {
    sendResponse({ error: 'Session not found' });
    return;
  }

  // Store stitched full-page screenshots
  if (screenshots && screenshots.length > 0) {
    // For full-page, we store the first (top) screenshot as the canonical one
    // and embed the rest in the HTML export. For simplicity, store all as an array.
    session.screenshots.push({
      url: pageUrl,
      dataUrl: screenshots[0].dataUrl,
      timestamp: Date.now(),
      fullPageShots: screenshots
    });
    session.visitedUrls.add(pageUrl);
    session.currentPage++;

    broadcastToPopup({
      action: 'captureProgress',
      sessionId,
      current: session.currentPage,
      total: session.maxPages,
      url: pageUrl,
      mode: 'screenshot'
    });

    persistSession(sessionId);
    sendResponse({ success: true, current: session.currentPage, total: session.maxPages });

    if (session.currentPage < session.maxPages) {
      setTimeout(() => navigateToNextPage(sessionId), session.delay);
    } else {
      finishSession(sessionId);
    }
  } else {
    sendResponse({ error: 'No screenshots received' });
  }
}

async function handleGeneratePDFOffscreen(message, sender, sendResponse) {
  const { sessionId } = message;
  try {
    const result = await generatePDFOffscreen(sessionId);
    sendResponse({ pdfDataUrl: result.pdfDataUrl });
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

async function handleProcessNextPage(message, sender, sendResponse) {
  sendResponse({ success: true });
}

async function handleCompleteSession(message, sender, sendResponse) {
  const { sessionId } = message;
  finishSession(sessionId);
  sendResponse({ success: true });
}

// ─── Session Completion ─────────────────────────────────────────────────────
async function finishSession(sessionId) {
  const session = captureSessions.get(sessionId);
  if (!session || session.completed) return;
  session.completed = true;

  if (session.mode === 'screenshot') {
    await compileScreenshots(session);
  } else {
    await compileTextFiles(session);
  }

  persistSession(sessionId);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: WebCaptureUtils.ICON_URL,
    title: 'Capture Complete',
    message: `${session.mode === 'screenshot' ? session.screenshots.length : session.extractedText.length} pages captured`
  });

  broadcastToPopup({
    action: 'captureComplete',
    sessionId,
    mode: session.mode,
    count: session.mode === 'screenshot' ? session.screenshots.length : session.extractedText.length
  });

  // Keep data in memory for export, but mark completed
  setTimeout(() => {
    captureSessions.delete(sessionId);
    clearPersistedSession();
  }, 3600000); // Clean up after 1 hour
}

async function compileScreenshots(session) {
  if (!session.screenshots.length) return;
  console.log(`Compiling ${session.screenshots.length} screenshots`);

  // Store full data in chrome.storage.local for popup access
  await WebCaptureUtils.StorageManager.saveCaptureData(session.sessionId, {
    screenshots: session.screenshots,
    mode: 'screenshot',
    completed: true,
    errors: session.errors
  });
}

async function compileTextFiles(session) {
  if (!session.extractedText.length) return;
  console.log(`Compiling ${session.extractedText.length} text extracts`);

  await WebCaptureUtils.StorageManager.saveCaptureData(session.sessionId, {
    extractedText: session.extractedText,
    mode: 'text',
    completed: true,
    errors: session.errors
  });
}

// ─── Offscreen Document for PDF ─────────────────────────────────────────────
async function hasOffscreenDocument() {
  if (!chrome.offscreen) return false;
  const existing = await chrome.offscreen?.hasDocument?.();
  return existing;
}

async function createOffscreenDocument() {
  if (!chrome.offscreen) return false;
  if (await hasOffscreenDocument()) return true;
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Generate PDF from captured screenshots'
    });
    return true;
  } catch (e) {
    console.warn('Offscreen document not available:', e.message);
    return false;
  }
}

async function closeOffscreenDocument() {
  if (!chrome.offscreen) return;
  if (await hasOffscreenDocument()) {
    await chrome.offscreen.closeDocument();
  }
}

// Public API used by popup for PDF generation
async function generatePDFOffscreen(sessionId) {
  const sessionData = await WebCaptureUtils.StorageManager.getCaptureData(sessionId);
  if (!sessionData?.screenshots?.length) {
    throw new Error('No screenshots available for PDF generation');
  }

  const created = await createOffscreenDocument();
  if (!created) {
    throw new Error('PDF generation requires Chrome 109+ with offscreen document support');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('PDF generation timed out')), 60000);

    const listener = (message) => {
      if (message.action === 'pdfGenerated' && message.sessionId === sessionId) {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        closeOffscreenDocument();
        resolve(message);
      }
      if (message.action === 'pdfError' && message.sessionId === sessionId) {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        closeOffscreenDocument();
        reject(new Error(message.error));
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'generatePDF',
      sessionId,
      screenshots: sessionData.screenshots
    });
  });
}

// Expose for popup usage
self.generatePDFOffscreen = generatePDFOffscreen;

// ─── Periodic Cleanup ───────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of captureSessions.entries()) {
    if (session.completed && now - session.startTime > 3600000) {
      captureSessions.delete(id);
    } else if (!session.completed && now - session.startTime > 86400000) {
      // Stale incomplete session (>24h)
      captureSessions.delete(id);
    }
  }
}, 600000); // Every 10 minutes

console.log('Web Capture Pro background service worker loaded');
