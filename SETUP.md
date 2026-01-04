# Detailed Setup Guide - Web Capture Pro

## 📦 Complete Installation Instructions

### Prerequisites

**System Requirements:**
- Chrome 88+ or Chromium-based browser
- 100MB free disk space
- Internet connection
- Basic file system access

**Browser Setup:**
1. Install Chrome or Chromium:
   ```bash
   # On Kali Linux
   apt-get update
   apt-get install chromium
   ```

### Installation Methods

#### Method 1: Using Install Script (Recommended)

```bash
# Navigate to extension directory
cd /root/web-capture-extension

# Run installation guide
./install.sh

# Follow the on-screen instructions
```

#### Method 2: Manual Chrome Installation

1. **Open Chrome Extensions:**
   - Type `chrome://extensions/` in address bar
   - Press Enter

2. **Enable Developer Mode:**
   - Find toggle in top-right corner
   - Click to enable

3. **Load Extension:**
   - Click "Load unpacked" button
   - Navigate to `/root/web-capture-extension`
   - Select the folder
   - Click "Select" or "Open"

4. **Verify Installation:**
   - Extension appears in toolbar
   - Icon shows Web Capture Pro
   - Click to open popup

#### Method 3: Command Line Installation

```bash
# Create Chrome profile directory
mkdir -p ~/.config/chrome-extensions

# Copy extension files
cp -r /root/web-capture-extension ~/.config/chrome-extensions/

# Launch Chrome with extension
chromium --load-extension=~/.config/chrome-extensions/web-capture-pro
```

### File Structure Verification

Your extension folder should contain:

```
web-capture-extension/
├── manifest.json          (Required)
├── background.js          (Required)
├── content.js             (Required)
├── popup.html             (Required)
├── popup.js               (Required)
├── utils.js               (Required)
├── icon.svg               (Optional)
├── install.sh             (Helper script)
├── README.md              (Documentation)
├── QUICKSTART.md          (Quick guide)
└── SETUP.md               (This file)
```

**Verify all files:**
```bash
cd /root/web-capture-extension
ls -la
```

Expected output should show all required files.

## 🔧 Configuration

### Extension Permissions

After installation, verify these permissions:

1. Go to `chrome://extensions/`
2. Find "Web Capture Pro"
3. Click "Details"
4. Check "Site access" section

Required permissions:
- ✅ Active tab
- ✅ All sites
- ✅ Download files
- ✅ Show notifications

### Browser Settings

**Enable Downloads:**
1. Chrome Settings → Privacy & Security
2. Site Settings → Additional content settings
3. Automatic downloads → Allow

**Disable Pop-up Blocker (for this extension):**
1. Chrome Settings → Privacy & Security
2. Site Settings → Pop-ups and redirects
3. Add extension URL to allowed list

## 🧪 Testing the Extension

### Test 1: Basic Functionality

**Goal:** Verify extension loads and responds

```bash
# Open test page in Chrome
chromium httpbin.org/html

# Click extension icon
# Should see popup with controls
```

**Expected Results:**
- Popup opens
- Mode buttons work
- Input fields accept text
- Start button is clickable

### Test 2: Screenshot Capture

**Setup:**
- URL: `https://httpbin.org/html`
- Mode: Screenshots
- Max Pages: 2
- Delay: 2000

**Steps:**
1. Enter URL
2. Select Screenshots mode
3. Set parameters
4. Click Start
5. Wait for completion
6. Click Export
7. Open downloaded HTML

**Expected:**
- Progress bar moves
- Status updates
- HTML file downloads
- File contains screenshots

### Test 3: Text Extraction

**Setup:**
- URL: `https://httpbin.org/html`
- Mode: Text Extract
- Max Pages: 2
- Delay: 2000

**Steps:**
1. Enter URL
2. Select Text mode
3. Start capture
4. Export when complete

**Expected:**
- Two files download (.md and .txt)
- Files contain readable text
- Formatting is preserved

### Test 4: Real Documentation Site

**Example URLs to try:**

1. **Python Documentation:**
   ```
   URL: https://docs.python.org/3/tutorial/
   Mode: Text Extract
   Max Pages: 5
   Delay: 3000
   ```

2. **MDN Web Docs:**
   ```
   URL: https://developer.mozilla.org/en-US/docs/Web/HTML
   Mode: Screenshots
   Max Pages: 3
   Delay: 4000
   ```

3. **GitHub Wiki:**
   ```
   URL: https://github.com/example/project/wiki
   Mode: Text Extract
   Max Pages: 10
   Delay: 2500
   ```

## 🎓 Advanced Usage

### Custom Navigation

If auto-detection fails:

1. Start capture with any URL
2. Manually navigate through pages
3. Extension captures each visited page
4. Click Export when done

### Batch Processing

For multiple sites:

```bash
# Create a list of URLs
cat > urls.txt << 'URLS'
https://site1.com/docs
https://site2.com/docs
https://site3.com/docs
URLS

# Process each (manual)
# Open each URL in extension and capture
```

### Performance Optimization

**For Fast Sites:**
- Delay: 1000-1500ms
- Max Pages: 20-50

**For Slow Sites:**
- Delay: 5000-8000ms
- Max Pages: 5-10

**For Mixed Sites:**
- Delay: 3000ms
- Max Pages: 15-20

## 🔍 Troubleshooting

### Issue: Extension Not Loading

**Symptoms:**
- "Load unpacked" button grayed out
- Error message in extensions page

**Solutions:**
```bash
# Check file permissions
chmod -R 755 /root/web-capture-extension

# Verify manifest.json syntax
python3 -m json.tool manifest.json

# Check for missing files
ls -la /root/web-capture-extension/
```

### Issue: Capture Not Starting

**Checklist:**
- [ ] URL starts with http:// or https://
- [ ] Max Pages is 1-100
- [ ] Delay is 500-10000ms
- [ ] Extension has all permissions
- [ ] No JavaScript errors in console

### Issue: Empty Results

**Possible Causes:**
- Page uses heavy JavaScript
- Content loaded via AJAX
- Delay too short

**Solutions:**
1. Increase delay to 5000ms+
2. Try screenshot mode
3. Check browser console for errors
4. Test with simple page first

### Issue: Download Fails

**Check:**
1. Chrome download settings
2. Antivirus blocking downloads
3. Disk space available
4. File permissions

**Fix:**
```bash
# Check disk space
df -h

# Check permissions
ls -la ~/Downloads/
```

## 📊 Monitoring & Debugging

### Browser Console

1. Right-click extension popup
2. Select "Inspect"
3. Open Console tab
4. Look for errors/warnings

### Background Page Console

1. Go to `chrome://extensions/`
2. Find Web Capture Pro
3. Click "service worker" or "background page"
4. View console logs

### Storage Inspection

1. Open extension popup
2. Right-click → Inspect → Application tab
3. Navigate to Storage → Local Storage
4. View captured data

## 🔄 Updates & Maintenance

### Updating the Extension

```bash
# Pull latest changes
cd /root/web-capture-extension
git pull

# Or manually replace files
# Then reload in Chrome:
# chrome://extensions/ → Web Capture Pro → Refresh icon
```

### Clearing Stored Data

**Method 1: Via Extension**
- Export data first
- Close popup
- Reopen to clear old sessions

**Method 2: Via Browser**
1. `chrome://extensions/`
2. Web Capture Pro → Details
3. Clear storage button

**Method 3: Via Console**
```javascript
// In background page console
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
});
```

### Uninstalling

1. `chrome://extensions/`
2. Find Web Capture Pro
3. Click "Remove"
4. Confirm removal

## 📞 Support Resources

### Getting Help

1. **Built-in Help:** Click "ℹ️ Help" in popup
2. **Quick Start:** See QUICKSTART.md
3. **Full Docs:** See README.md
4. **Console Logs:** Check browser console

### Common Error Messages

**"Invalid URL"**
- Fix: Add http:// or https:// prefix

**"Permission denied"**
- Fix: Check extension permissions

**"No navigation found"**
- Fix: Manually navigate or increase delay

**"Download failed"**
- Fix: Check browser download settings

## 🎯 Success Metrics

Your installation is successful if:

✅ Extension appears in toolbar  
✅ Popup opens without errors  
✅ Can enter URLs and settings  
✅ Start button initiates capture  
✅ Progress bar updates  
✅ Files download successfully  
✅ Exported files are readable  

## 🚀 Next Steps

1. **Complete Quick Start:** Run through QUICKSTART.md examples
2. **Test Real Sites:** Try your target documentation
3. **Adjust Settings:** Optimize for your use case
4. **Explore Features:** Try both modes
5. **Save Results:** Export and organize captures

---

**Installation Complete!** 🎉

You're ready to capture websites and documentation!
