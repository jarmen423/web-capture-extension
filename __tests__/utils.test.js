/**
 * @jest-environment jsdom
 */

// Mock chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb({})),
      set: jest.fn((data, cb) => cb && cb()),
      remove: jest.fn((keys, cb) => cb && cb())
    },
    session: {
      get: jest.fn((keys, cb) => cb({})),
      set: jest.fn((data, cb) => cb && cb()),
      remove: jest.fn((keys, cb) => cb && cb())
    }
  },
  notifications: {
    create: jest.fn()
  }
};

// Load utils.js
require('../utils.js');

const { TextProcessor, NavigationDetector, StorageManager, ErrorHandler } = global.WebCaptureUtils;

describe('TextProcessor', () => {
  test('cleanText normalizes whitespace', () => {
    const input = 'Hello    world\n\n\nTest';
    expect(TextProcessor.cleanText(input)).toBe('Hello world Test');
  });

  test('extractHeadings finds markdown headings', () => {
    const text = '# Hello\n## World\nNormal line\n### Deep';
    const headings = TextProcessor.extractHeadings(text);
    expect(headings).toEqual(['# Hello', '## World', '### Deep']);
  });

  test('toMarkdown formats page metadata', () => {
    const md = TextProcessor.toMarkdown('Title', 'Content', 'https://example.com', 0);
    expect(md).toContain('# Title');
    expect(md).toContain('https://example.com');
    expect(md).toContain('Content');
  });

  test('htmlToMarkdown converts headings', () => {
    document.body.innerHTML = '<h1>Hello</h1><h2>World</h2>';
    const md = TextProcessor.htmlToMarkdown(document.body);
    expect(md).toContain('# Hello');
    expect(md).toContain('## World');
  });

  test('htmlToMarkdown converts paragraphs', () => {
    document.body.innerHTML = '<p>First paragraph</p><p>Second paragraph</p>';
    const md = TextProcessor.htmlToMarkdown(document.body);
    expect(md).toContain('First paragraph');
    expect(md).toContain('Second paragraph');
  });

  test('htmlToMarkdown converts lists', () => {
    document.body.innerHTML = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const md = TextProcessor.htmlToMarkdown(document.body);
    expect(md).toContain('- Item 1');
    expect(md).toContain('- Item 2');
  });

  test('htmlToMarkdown converts code blocks', () => {
    document.body.innerHTML = '<pre><code>const x = 1;</code></pre>';
    const md = TextProcessor.htmlToMarkdown(document.body);
    expect(md).toContain('```');
    expect(md).toContain('const x = 1;');
  });

  test('htmlToMarkdown skips scripts and styles', () => {
    document.body.innerHTML = '<p>Visible</p><script>hidden</script><style>.x{}</style>';
    const md = TextProcessor.htmlToMarkdown(document.body);
    expect(md).toContain('Visible');
    expect(md).not.toContain('hidden');
    expect(md).not.toContain('.x{}');
  });
});

describe('NavigationDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.location;
    window.location = { href: 'https://example.com/page1', pathname: '/page1', origin: 'https://example.com' };
  });

  test('findNextLink detects rel=next', () => {
    document.body.innerHTML = '<a href="https://example.com/page2" rel="next">Next</a>';
    const link = NavigationDetector.findNextLink(document);
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://example.com/page2');
  });

  test('findNextLink detects class-based next links', () => {
    document.body.innerHTML = '<a href="https://example.com/page2" class="next-page">Next Page</a>';
    const link = NavigationDetector.findNextLink(document);
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://example.com/page2');
  });

  test('findNextLink detects text-based next links', () => {
    document.body.innerHTML = '<a href="https://example.com/page2">Next →</a>';
    const link = NavigationDetector.findNextLink(document);
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://example.com/page2');
  });

  test('findNextLink uses custom selector', () => {
    document.body.innerHTML = '<a href="https://example.com/page2" id="my-next">Go</a>';
    const link = NavigationDetector.findNextLink(document, '#my-next');
    expect(link).not.toBeNull();
    expect(link.id).toBe('my-next');
  });

  test('findNextLink returns null when no link found', () => {
    document.body.innerHTML = '<p>No links here</p>';
    const link = NavigationDetector.findNextLink(document);
    expect(link).toBeNull();
  });

  test('isDocumentationLink identifies doc URLs', () => {
    const a = document.createElement('a');
    a.href = 'https://example.com/docs/guide';
    expect(NavigationDetector.isDocumentationLink(a)).toBe(true);
  });
});

describe('StorageManager', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  test('saveCaptureData stores data by sessionId', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ captureData: {} }));
    chrome.storage.local.set.mockImplementation((data, cb) => cb && cb());

    await StorageManager.saveCaptureData('123', { screenshots: [] });
    expect(chrome.storage.local.set).toHaveBeenCalled();
    const arg = chrome.storage.local.set.mock.calls[0][0];
    expect(arg.captureData['123']).toBeDefined();
  });

  test('getCaptureData retrieves session data', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) =>
      cb({ captureData: { '123': { mode: 'text' } } })
    );
    const data = await StorageManager.getCaptureData('123');
    expect(data.mode).toBe('text');
  });

  test('cleanupOldSessions removes stale data', async () => {
    const oldData = {
      captureData: {
        'old': { timestamp: Date.now() - 48 * 60 * 60 * 1000 },
        'new': { timestamp: Date.now() }
      }
    };
    chrome.storage.local.get.mockImplementation((keys, cb) => cb(oldData));
    chrome.storage.local.set.mockImplementation((data, cb) => cb && cb());

    await StorageManager.cleanupOldSessions(24);
    const arg = chrome.storage.local.set.mock.calls[0][0];
    expect(arg.captureData['old']).toBeUndefined();
    expect(arg.captureData['new']).toBeDefined();
  });
});

describe('ErrorHandler', () => {
  test('log returns structured error object', () => {
    const error = new Error('Test error');
    const result = ErrorHandler.log(error, 'context');
    expect(result.message).toBe('Test error');
    expect(result.context).toBe('context');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  test('notifyUser creates notification', () => {
    ErrorHandler.notifyUser('Something broke');
    expect(chrome.notifications.create).toHaveBeenCalled();
    const call = chrome.notifications.create.mock.calls[0][0];
    expect(call.message).toBe('Something broke');
    expect(call.iconUrl).toBe('icons/icon128.png');
  });
});
