// Utility functions for Web Capture Pro
// Shared by background service worker and popup

const WebCaptureUtils = {
  ICON_URL: 'icons/icon128.png',

  // Text processing utilities
  TextProcessor: {
    cleanText(text) {
      return text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    },

    extractHeadings(text) {
      const lines = text.split('\n');
      return lines.filter(line => line.match(/^#{1,6}\s/));
    },

    toMarkdown(title, content, url, timestamp) {
      return `# ${title}\n\n**URL:** ${url}\n**Captured:** ${new Date(timestamp).toISOString()}\n\n${content}\n`;
    },

    // Convert an HTML element tree to clean Markdown
    htmlToMarkdown(root) {
      const lines = [];

      function walk(node) {
        if (!node) return;

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\s+/g, ' ');
          if (text) lines.push(text);
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();

        // Skip invisible/script/style/nav elements
        if (['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript'].includes(tag)) {
          return;
        }

        // Block-level handling
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          const level = parseInt(tag.substring(1));
          const prefix = '#'.repeat(level);
          const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
          if (text) {
            if (lines.length > 0 && !lines.at(-1).endsWith('\n')) lines.push('\n');
            lines.push(`${prefix} ${text}\n\n`);
          }
          return;
        }

        if (tag === 'p') {
          const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
          if (text) {
            if (lines.length > 0 && !lines.at(-1).endsWith('\n')) lines.push('\n');
            lines.push(`${text}\n\n`);
          }
          return;
        }

        if (tag === 'pre') {
          const code = node.querySelector('code');
          const text = (code ? code.textContent : node.textContent).replace(/\n+$/, '');
          if (text) {
            if (lines.length > 0 && !lines.at(-1).endsWith('\n')) lines.push('\n');
            const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
            lines.push(`\`\`\`${lang}\n${text}\n\`\`\`\n\n`);
          }
          return;
        }

        if (tag === 'ul' || tag === 'ol') {
          if (lines.length > 0 && !lines.at(-1).endsWith('\n')) lines.push('\n');
          const items = node.querySelectorAll(':scope > li');
          items.forEach((li, i) => {
            const prefix = tag === 'ol' ? `${i + 1}. ` : '- ';
            const text = (li.textContent || '').trim().replace(/\s+/g, ' ');
            if (text) lines.push(`${prefix}${text}\n`);
          });
          lines.push('\n');
          return;
        }

        if (tag === 'table') {
          const rows = node.querySelectorAll('tr');
          if (rows.length === 0) return;
          if (lines.length > 0 && !lines.at(-1).endsWith('\n')) lines.push('\n');
          rows.forEach((row, rIdx) => {
            const cells = row.querySelectorAll('th, td');
            const cellTexts = Array.from(cells).map(c => (c.textContent || '').trim().replace(/\s+/g, ' ').replace(/\|/g, '\\|'));
            lines.push(`| ${cellTexts.join(' | ')} |\n`);
            if (rIdx === 0) {
              lines.push(`| ${cellTexts.map(() => '---').join(' | ')} |\n`);
            }
          });
          lines.push('\n');
          return;
        }

        if (tag === 'a') {
          const href = node.getAttribute('href') || '';
          const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
          if (text && href && !href.startsWith('javascript:')) {
            lines.push(`[${text}](${href})`);
          } else if (text) {
            lines.push(text);
          }
          return;
        }

        if (tag === 'br') {
          lines.push('\n');
          return;
        }

        // Inline elements and unhandled block elements: recurse
        for (const child of node.childNodes) {
          walk(child);
        }

        if (['div', 'section', 'article', 'main'].includes(tag)) {
          if (lines.length > 0 && !lines.at(-1).endsWith('\n')) lines.push('\n');
        }
      }

      walk(root);
      let md = lines.join('');
      md = md.replace(/\n{3,}/g, '\n\n');
      return md.trim();
    },

    // Readability-style content scoring
    findBestContentRoot(document) {
      const candidates = [];
      const selectors = [
        'article',
        '.documentation',
        '.docs-content',
        '.content',
        'main',
        '#main-content',
        '.main-content',
        '[role="main"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 200) {
          candidates.push({ el, score: el.innerText.length });
        }
      }

      // Fallback: score all divs and sections
      if (candidates.length === 0) {
        const all = document.querySelectorAll('div, section');
        for (const el of all) {
          const text = el.innerText.trim();
          if (text.length < 200) continue;
          const links = el.querySelectorAll('a').length;
          const paragraphs = el.querySelectorAll('p').length;
          const linkDensity = links / (text.length / 100);
          const score = text.length * (1 - linkDensity) * Math.log(paragraphs + 2);
          candidates.push({ el, score });
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      return candidates[0]?.el || document.body;
    }
  },

  // Navigation detection utilities
  NavigationDetector: {
    findNextLink(document, customSelector) {
      if (customSelector) {
        try {
          const el = document.querySelector(customSelector);
          if (el && el.href) return el;
        } catch (e) {
          // invalid selector, fall through
        }
      }

      // Strategy 1: rel="next"
      let link = document.querySelector('a[rel="next"]');
      if (link && link.href) return link;

      // Strategy 2: class-based next links
      const classSelectors = [
        '.next-page',
        '.pagination-next',
        'a.nav-next',
        '.next-link',
        '.pager-next',
        '.btn-next'
      ];
      for (const sel of classSelectors) {
        const el = document.querySelector(sel);
        if (el && el.href) return el;
      }

      // Strategy 3: text-based next links (manual iteration)
      const textPatterns = [
        /^next\s*→?$/i,
        /^→\s*next$/i,
        /^next\s*page$/i,
        /^older\s*posts?$/i,
        /^→$/,
        /^continue\s*reading$/i,
        /^read\s*more$/i
      ];
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      for (const pattern of textPatterns) {
        const found = allLinks.find(a => {
          const text = (a.textContent || '').trim();
          return text && pattern.test(text) && a.href && !a.href.includes('#');
        });
        if (found) return found;
      }

      // Strategy 4: pagination container
      const pagination = document.querySelector('.pagination, [role="navigation"]');
      if (pagination) {
        const links = Array.from(pagination.querySelectorAll('a[href]'));
        const current = links.find(a => a.href === document.location.href);
        if (current) {
          const idx = links.indexOf(current);
          if (idx >= 0 && idx + 1 < links.length) return links[idx + 1];
        }
        // If no current match, look for active/current class
        const active = pagination.querySelector('.active, .current, [aria-current="page"]');
        if (active) {
          const parentLi = active.closest('li, .page-item');
          if (parentLi && parentLi.nextElementSibling) {
            const nextA = parentLi.nextElementSibling.querySelector('a[href]');
            if (nextA) return nextA;
          }
        }
      }

      // Strategy 5: sidebar / TOC navigation
      const sidebar = document.querySelector('.sidebar, .toc, #sidebar, .nav-sidebar, .menu, .nav-menu, [role="menu"]');
      if (sidebar) {
        const links = Array.from(sidebar.querySelectorAll('a[href]'));
        const currentUrl = document.location.href;
        const currentLink = links.find(l => {
          return l.href === currentUrl || l.href === currentUrl.replace(/#$/, '');
        });
        if (currentLink) {
          const idx = links.indexOf(currentLink);
          if (idx >= 0 && idx + 1 < links.length) {
            // Ensure next link is on the same origin/path family
            const next = links[idx + 1];
            if (next.href.startsWith(document.location.origin)) return next;
          }
        }
      }

      return null;
    },

    isDocumentationLink(link) {
      const href = link.href || '';
      const text = (link.textContent || '').toLowerCase();
      return href.includes('/docs/') ||
             href.includes('/doc/') ||
             href.includes('/documentation/') ||
             href.includes('/chapter') ||
             href.includes('/section') ||
             href.includes('/guide/') ||
             href.includes('/tutorial/') ||
             /\d+/.test(href) ||
             text.includes('next') ||
             text.includes('chapter') ||
             text.includes('section') ||
             text.includes('page');
    }
  },

  // Storage management
  StorageManager: {
    async saveCaptureData(sessionId, data) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['captureData'], (result) => {
          const captureData = result.captureData || {};
          captureData[sessionId] = { ...captureData[sessionId], ...data, timestamp: Date.now() };
          chrome.storage.local.set({ captureData }, resolve);
        });
      });
    },

    async getCaptureData(sessionId) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['captureData'], (result) => {
          const captureData = result.captureData || {};
          resolve(captureData[sessionId]);
        });
      });
    },

    async cleanupOldSessions(hours = 24) {
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
          chrome.storage.local.set({ captureData }, resolve);
        });
      });
    },

    async setActiveSession(session) {
      return new Promise((resolve) => {
        chrome.storage.session.set({ activeSession: session }, resolve);
      });
    },

    async getActiveSession() {
      return new Promise((resolve) => {
        chrome.storage.session.get(['activeSession'], (result) => {
          resolve(result.activeSession || null);
        });
      });
    },

    async clearActiveSession() {
      return new Promise((resolve) => {
        chrome.storage.session.remove(['activeSession'], resolve);
      });
    }
  },

  // Error handling
  ErrorHandler: {
    log(error, context = '') {
      console.error(`[WebCapturePro] ${context}:`, error);
      return {
        message: error?.message || String(error),
        stack: error?.stack,
        context: context,
        timestamp: Date.now()
      };
    },

    notifyUser(message, type = 'error') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: WebCaptureUtils.ICON_URL,
        title: `Web Capture Pro - ${type.toUpperCase()}`,
        message: message
      });
    }
  },

  // DOM utilities for content script
  DOMUtils: {
    isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    },

    scrollToTop() {
      window.scrollTo(0, 0);
    },

    getScrollInfo() {
      return {
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        scrollHeight: document.body?.scrollHeight || document.documentElement?.scrollHeight || 0
      };
    }
  }
};

// Expose globally for service worker (importScripts) and popup (script tag)
if (typeof self !== 'undefined') {
  self.WebCaptureUtils = WebCaptureUtils;
}
