// Options page script for Web Capture Pro

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const saveStatus = document.getElementById('saveStatus');
  const clearStatus = document.getElementById('clearStatus');

  // Load settings
  chrome.storage.local.get(['defaultMaxPages', 'defaultDelay', 'defaultFullPage'], (result) => {
    if (result.defaultMaxPages) document.getElementById('defaultMaxPages').value = result.defaultMaxPages;
    if (result.defaultDelay) document.getElementById('defaultDelay').value = result.defaultDelay;
    if (result.defaultFullPage) document.getElementById('defaultFullPage').checked = true;
  });

  saveBtn.addEventListener('click', () => {
    const defaultMaxPages = parseInt(document.getElementById('defaultMaxPages').value);
    const defaultDelay = parseInt(document.getElementById('defaultDelay').value);
    const defaultFullPage = document.getElementById('defaultFullPage').checked;

    if (defaultMaxPages < 1 || defaultMaxPages > 100) {
      showStatus(saveStatus, 'Max pages must be between 1 and 100', 'error');
      return;
    }
    if (defaultDelay < 500) {
      showStatus(saveStatus, 'Delay must be at least 500ms', 'error');
      return;
    }

    chrome.storage.local.set({ defaultMaxPages, defaultDelay, defaultFullPage }, () => {
      showStatus(saveStatus, 'Settings saved successfully', 'success');
    });
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('This will delete all captured screenshots and extracted text. Are you sure?')) return;

    chrome.storage.local.remove(['captureData', 'activeSession'], () => {
      showStatus(clearStatus, 'All stored data has been cleared', 'success');
    });
  });

  function showStatus(el, message, type) {
    el.textContent = message;
    el.className = 'status ' + type;
    setTimeout(() => { el.className = 'status'; }, 3000);
  }
});
