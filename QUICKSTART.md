# Quick Start Guide - Web Capture Pro

## 🚀 Get Started in 5 Minutes

### Step 1: Install the Extension (2 minutes)

**Option A: Using the install script**
```bash
cd /root/web-capture-extension
./install.sh
```

**Option B: Manual installation**
1. Open Chrome/Chromium
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select `/root/web-capture-extension` folder

### Step 2: First Capture Test (2 minutes)

1. **Click the extension icon** in your browser toolbar
2. **Select mode**: Click "📷 Screenshots" (recommended for first test)
3. **Enter test URL**: `https://httpbin.org/html` (simple test page)
4. **Set parameters**:
   - Max Pages: `3`
   - Delay: `2000`
5. **Click "Start Capture"**
6. **Wait** for the progress to complete
7. **Click "Export"** to download the HTML file
8. **Open the file** and press Ctrl+P to save as PDF

### Step 3: Real-World Usage

**For Documentation Sites:**
```
Mode: Text Extract
URL: https://docs.example.com/getting-started
Max Pages: 20
Delay: 3000
```

**For Visual Archives:**
```
Mode: Screenshots
URL: https://example.com/docs/intro
Max Pages: 10
Delay: 2500
```

## 📋 Common Use Cases

### 1. Capture API Documentation
```
Mode: Text Extract
URL: https://api.example.com/docs/v1
Max Pages: 50
Delay: 2000
Result: Markdown + TXT files
```

### 2. Archive Tutorial Series
```
Mode: Screenshots
URL: https://tutorial.example.com/lesson-1
Max Pages: 15
Delay: 3000
Result: HTML file → Print to PDF
```

### 3. Save Research Papers
```
Mode: Text Extract
URL: https://papers.example.com/abstract
Max Pages: 5
Delay: 1500
Result: Clean text for notes
```

## ⚡ Quick Tips

### Speed vs Quality
- **Fast**: Delay 1000-1500ms (simple pages)
- **Balanced**: Delay 2000-3000ms (standard docs)
- **Safe**: Delay 4000-6000ms (heavy pages)

### Page Limits
- **Test**: 2-3 pages first
- **Standard**: 10-20 pages
- **Large**: 50-100 pages

### Export Formats
- **Screenshots**: HTML → Print to PDF
- **Text**: Markdown (.md) + Plain Text (.txt)

## 🎯 Success Checklist

- [ ] Extension appears in toolbar
- [ ] Popup opens when clicked
- [ ] Mode selection works
- [ ] Start button initiates capture
- [ ] Progress bar moves
- [ ] Status messages update
- [ ] Export button downloads file
- [ ] File opens correctly

## 🔧 If Something Goes Wrong

**Capture won't start:**
- Check URL format (must start with http:// or https://)
- Verify permissions in chrome://extensions
- Try a simple test URL first

**No navigation detected:**
- Manually click through pages
- Extension captures each visited page
- Click Export when done

**Empty results:**
- Increase delay time
- Check if page uses JavaScript heavily
- Try screenshot mode instead

**Download fails:**
- Check browser download settings
- Try different filename
- Disable download managers temporarily

## 📚 Next Steps

1. Read the full README.md for detailed documentation
2. Try different websites and modes
3. Adjust settings for optimal results
4. Explore advanced features

## 💡 Pro Tips

- **Test first**: Always start with 2-3 pages
- **Watch the console**: Right-click popup → Inspect → Console
- **Export immediately**: Don't wait until the end
- **Check storage**: Data auto-deletes after 24 hours

## 🆘 Need Help?

1. Click "ℹ️ Help" in the extension popup
2. Check the README.md file
3. Review browser console logs
4. Test with the provided examples

---

**Ready to capture!** 🚀

Start with: `https://httpbin.org/html` (test page)
