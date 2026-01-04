// Content script for Web Capture Pro
// Runs in the context of web pages

console.log('Web Capture Pro content script loaded');

// Listen for messages from background script
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
  }
});

async function handleCapturePage(message, sendResponse) {
  const { sessionId, mode, tabId } = message;
  
  console.log(`Capturing page in ${mode} mode`);
  
  if (mode === 'screenshot') {
    // For screenshots, we just need to ensure page is loaded
    // The actual screenshot is taken by background script using chrome.tabs.captureVisibleTab
    
    // Scroll to top first
    window.scrollTo(0, 0);
    
    // Wait a moment for any lazy loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Notify background to capture
    chrome.runtime.sendMessage({
      action: 'captureScreenshot',
      sessionId: sessionId,
      tabId: tabId
    }, (response) => {
      sendResponse(response);
    });
    
  } else if (mode === 'text') {
    // Extract text content
    const textContent = extractTextFromPage();
    const pageTitle = document.title;
    const pageUrl = window.location.href;
    
    chrome.runtime.sendMessage({
      action: 'extractText',
      sessionId: sessionId,
      textContent: textContent,
      pageTitle: pageTitle,
      pageUrl: pageUrl
    }, (response) => {
      sendResponse(response);
    });
  }
}

function extractTextFromPage() {
  let content = '';
  
  // Try to find common documentation structures
  const selectors = [
    'article',           // HTML5 article
    '.documentation',    // Common doc class
    '.docs-content',     // Docs sites
    '.content',          // Generic content
    'main',              // HTML5 main
    '#main-content',     // Common ID
    '.main-content',
    'body'               // Fallback
  ];
  
  let targetElement = null;
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim().length > 100) {
      targetElement = el;
      break;
    }
  }
  
  if (!targetElement) {
    targetElement = document.body;
  }
  
  // Extract structured text
  content += `# ${document.title}\n\n`;
  content += `URL: ${window.location.href}\n`;
  content += `Captured: ${new Date().toISOString()}\n\n`;
  
  // Extract headings and paragraphs
  const headings = targetElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const paragraphs = targetElement.querySelectorAll('p, li');
  
  if (headings.length > 0) {
    content += '## Content Structure\n\n';
    headings.forEach(h => {
      const level = parseInt(h.tagName.substring(1));
      const prefix = '#'.repeat(level);
      const text = h.textContent.trim().replace(/\s+/g, ' ');
      if (text) {
        content += `${prefix} ${text}\n`;
      }
    });
    content += '\n';
  }
  
  // Extract main content
  content += '## Full Content\n\n';
  
  // Get all text blocks
  const textBlocks = [];
  
  // Headings with their content
  const headingsArray = Array.from(headings);
  headingsArray.forEach((h, index) => {
    const hText = h.textContent.trim();
    if (hText) {
      const level = parseInt(h.tagName.substring(1));
      const prefix = '#'.repeat(level);
      textBlocks.push(`${prefix} ${hText}\n`);
      
      // Get following content until next heading
      let next = h.nextElementSibling;
      let sectionContent = '';
      while (next && !/^H[1-6]$/.test(next.tagName)) {
        if (next.tagName === 'P' || next.tagName === 'UL' || next.tagName === 'OL' || next.tagName === 'DIV') {
          const text = next.textContent.trim().replace(/\s+/g, ' ');
          if (text) {
            if (next.tagName === 'UL' || next.tagName === 'OL') {
              const items = Array.from(next.querySelectorAll('li')).map(li => `- ${li.textContent.trim()}`).join('\n');
              sectionContent += items + '\n';
            } else {
              sectionContent += text + '\n\n';
            }
          }
        }
        next = next.nextElementSibling;
      }
      if (sectionContent) {
        textBlocks.push(sectionContent);
      }
    }
  });
  
  // If no headings found, extract all paragraphs
  if (headingsArray.length === 0) {
    paragraphs.forEach(p => {
      const text = p.textContent.trim().replace(/\s+/g, ' ');
      if (text && text.length > 20) {
        if (p.tagName === 'LI') {
          textBlocks.push(`- ${text}\n`);
        } else {
          textBlocks.push(`${text}\n\n`);
        }
      }
    });
  }
  
  content += textBlocks.join('');
  
  // Clean up
  content = content.replace(/\n{3,}/g, '\n\n');
  
  return content;
}

async function handleFindNextLink(message, sendResponse) {
  const { sessionId } = message;
  
  // Strategy 1: Look for "Next" links
  const nextSelectors = [
    'a:contains("Next")',
    'a:contains("next")',
    'a:contains("→")',
    'a[rel="next"]',
    '.next-page',
    '.pagination-next',
    'a.nav-next',
    '.next-link'
  ];
  
  let nextLink = null;
  
  for (const selector of nextSelectors) {
    try {
      const links = document.querySelectorAll(selector);
      if (links.length > 0) {
        nextLink = links[0];
        break;
      }
    } catch (e) {
      // Try jQuery-style selector
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent.toLowerCase().includes('next') || 
            link.textContent.includes('→')) {
          nextLink = link;
          break;
        }
      }
      if (nextLink) break;
    }
  }
  
  // Strategy 2: Look for pagination links
  if (!nextLink) {
    const pagination = document.querySelector('.pagination, nav, [role="navigation"]');
    if (pagination) {
      const links = pagination.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent.toLowerCase();
        if (text.includes('next') || text.includes('→') || 
            (links.length > 1 && Array.from(links).indexOf(link) === links.length - 1)) {
          nextLink = link;
          break;
        }
      }
    }
  }
  
  // Strategy 3: Look for sidebar navigation
  if (!nextLink) {
    const sidebar = document.querySelector('.sidebar, .toc, #sidebar, .nav-sidebar');
    if (sidebar) {
      const links = sidebar.querySelectorAll('a');
      const currentUrl = window.location.href;
      const currentLink = Array.from(links).find(l => l.href === currentUrl);
      if (currentLink) {
        const currentIndex = Array.from(links).indexOf(currentLink);
        if (currentIndex < links.length - 1) {
          nextLink = links[currentIndex + 1];
        }
      }
    }
  }
  
  // Strategy 4: Look for any link that seems like it goes forward
  if (!nextLink) {
    const allLinks = document.querySelectorAll('a[href]');
    const currentPath = window.location.pathname;
    
    // Try to find links with similar paths but "next" sequence
    for (const link of allLinks) {
      const href = link.href;
      if (href.startsWith('http') && href !== currentPath) {
        // Check if it's a documentation page link
        if (href.includes('/docs/') || href.includes('/doc/') || 
            href.includes('/chapter') || href.includes('/section') ||
            href.match(/\d+/)) {
          nextLink = link;
          break;
        }
      }
    }
  }
  
  if (nextLink && nextLink.href) {
    // Check if we've already visited this URL
    chrome.runtime.sendMessage({
      action: 'checkVisited',
      url: nextLink.href
    }, (response) => {
      if (response && !response.visited) {
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
  const text = extractTextFromPage();
  sendResponse({ text: text });
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

// Initialize
waitForLoad().then(() => {
  console.log('Page fully loaded, ready for capture');
});
