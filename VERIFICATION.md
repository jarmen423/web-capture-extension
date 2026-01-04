# Installation Verification Checklist

## ✅ Pre-Installation Check

- [ ] Running Chrome or Chromium browser
- [ ] Have root/admin access to `/root/web-capture-extension`
- [ ] At least 100MB free disk space
- [ ] Internet connection available

## ✅ File Verification

Run this command:
```bash
cd /root/web-capture-extension
ls -la
```

You should see these 13 files:

```
manifest.json          ✓ Required (666 bytes)
background.js          ✓ Required (7.1KB)
content.js             ✓ Required (8.5KB)
popup.html             ✓ Required (6.8KB)
popup.js               ✓ Required (14KB)
utils.js               ✓ Required (4.2KB)
icon.svg               ✓ Optional (902 bytes)
package.json           ✓ Info (621 bytes)
install.sh             ✓ Helper (2.0KB)
README.md              ✓ Docs (7.8KB)
QUICKSTART.md          ✓ Docs (3.5KB)
SETUP.md               ✓ Docs (8.3KB)
TEST_URLS.md           ✓ Tests (New)
VERIFICATION.md        ✓ This file
```

**Total files:** 13  
**Total size:** ~106KB

## ✅ Installation Verification

### Method 1: Using Install Script
```bash
cd /root/web-capture-extension
./install.sh
```

**Expected output:**
- All files verified ✓
- Installation instructions displayed
- No errors

### Method 2: Manual Installation

**Step 1: Open Chrome Extensions**
- Type: `chrome://extensions/`
- Press Enter
- Should see extensions page

**Step 2: Enable Developer Mode**
- Find toggle in top-right
- Should be able to toggle ON
- Page should show "Load unpacked" button

**Step 3: Load Extension**
- Click "Load unpacked"
- Navigate to `/root/web-capture-extension`
- Should see folder selected
- Click "Select" or "Open"

**Step 4: Verify Installation**
- Extension appears in list
- Name: "Web Capture Pro"
- No error messages
- Icon visible in toolbar

## ✅ Post-Installation Verification

### Extension Popup Test
1. Click extension icon in toolbar
2. Popup should open
3. Should see:
   - "Web Capture Pro" title
   - Mode selection buttons
   - Input fields
   - Start button
   - Help buttons

### Button Functionality Test
- [ ] Screenshot mode button clicks
- [ ] Text mode button clicks
- [ ] Input fields accept text
- [ ] Number fields accept numbers
- [ ] Start button is clickable
- [ ] Help buttons work

### Permission Verification
1. Go to `chrome://extensions/`
2. Find Web Capture Pro
3. Click "Details"
4. Verify permissions:
   - ✅ Active tab
   - ✅ All sites
   - ✅ Download files
   - ✅ Show notifications

## ✅ Functional Testing

### Test 1: Basic Capture
**Configuration:**
```
Mode: Screenshots
URL: https://httpbin.org/html
Max Pages: 2
Delay: 2000
```

**Expected results:**
- [ ] Progress bar appears
- [ ] Status updates to "Starting..."
- [ ] Status shows "Captured 1/2"
- [ ] Status shows "Captured 2/2"
- [ ] Status shows "Complete"
- [ ] Export button appears
- [ ] HTML file downloads
- [ ] File opens in browser
- [ ] Screenshots visible in file

### Test 2: Text Extraction
**Configuration:**
```
Mode: Text Extract
URL: https://httpbin.org/html
Max Pages: 2
Delay: 2000
```

**Expected results:**
- [ ] Progress bar appears
- [ ] Status updates correctly
- [ ] Two files download (.md and .txt)
- [ ] Files contain readable text
- [ ] Markdown formatting preserved

### Test 3: Real Documentation
**Configuration:**
```
Mode: Text Extract
URL: https://docs.python.org/3/tutorial/
Max Pages: 3
Delay: 3000
```

**Expected results:**
- [ ] Auto-navigation works
- [ ] 3 pages captured
- [ ] Export successful
- [ ] Content is structured

## ✅ Troubleshooting Verification

### If Installation Fails

**Check file permissions:**
```bash
ls -la /root/web-capture-extension/
chmod -R 755 /root/web-capture-extension/
```

**Verify manifest.json:**
```bash
python3 -m json.tool manifest.json
```

**Check for missing files:**
```bash
cd /root/web-capture-extension
for file in manifest.json background.js content.js popup.html popup.js utils.js; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file MISSING"
  fi
done
```

### If Capture Fails

**Check browser console:**
1. Right-click popup → Inspect
2. Open Console tab
3. Look for red errors
4. Note error messages

**Check background page:**
1. `chrome://extensions/`
2. Web Capture Pro → "service worker"
3. View console logs

**Verify URL format:**
- Must start with `http://` or `https://`
- Cannot be `localhost` (unless configured)
- No trailing slashes needed

## ✅ Export Verification

### File Download Test
- [ ] Download dialog appears
- [ ] File saves to Downloads folder
- [ ] File has correct extension (.html, .md, .txt)
- [ ] File size > 0 bytes
- [ ] File opens without errors

### File Content Test
**HTML files:**
- [ ] Contains `<html>` tag
- [ ] Contains `<img>` tags (screenshots)
- [ ] Has styling
- [ ] Shows screenshots

**Markdown files:**
- [ ] Starts with `#` heading
- [ ] Contains `**URL:**` metadata
- [ ] Has structured content
- [ ] Lists preserved

**Text files:**
- [ ] Readable plain text
- [ ] No broken characters
- [ ] Logical structure

## ✅ Performance Verification

### Expected Timings
- Simple page (1-2s per capture)
- Standard docs (2-4s per capture)
- Heavy pages (4-8s per capture)

### Memory Usage
- Should not crash browser
- Should not freeze system
- Should release memory after export

## ✅ Complete Installation Checklist

**Before Installation:**
- [ ] Files present in `/root/web-capture-extension`
- [ ] Chrome/Chromium installed
- [ ] Internet connection active

**During Installation:**
- [ ] Extension loaded without errors
- [ ] Appears in extensions list
- [ ] Shows in toolbar

**After Installation:**
- [ ] Popup opens correctly
- [ ] All buttons functional
- [ ] Test 1 passes
- [ ] Test 2 passes
- [ ] Test 3 passes
- [ ] Files export correctly
- [ ] Content is readable

## 🎯 Success Criteria

**Installation is successful if:**

✅ All 13 files present  
✅ Extension loads in Chrome  
✅ Popup opens without errors  
✅ Can enter URLs and settings  
✅ Start button initiates capture  
✅ Progress updates correctly  
✅ Files download successfully  
✅ Exported files are readable  

## 📞 Support Checklist

If you encounter issues:

1. **Check this verification file** ✓
2. **Run install.sh** ✓
3. **Check QUICKSTART.md** ✓
4. **Review SETUP.md** ✓
5. **Read README.md** ✓
6. **Check browser console** ✓
7. **Verify file permissions** ✓

## 🎉 Verification Complete

If all checks pass:
- ✅ Installation successful
- ✅ Extension ready to use
- ✅ All features functional
- ✅ Ready for production use

**Next step:** Start capturing websites! 🚀
