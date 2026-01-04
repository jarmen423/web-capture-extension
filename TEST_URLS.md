# Test URLs for Web Capture Pro

## 🧪 Quick Test URLs

These URLs are perfect for testing the extension:

### 1. Basic HTML Test (Recommended First Test)
```
URL: https://httpbin.org/html
Mode: Screenshots or Text
Max Pages: 2
Delay: 2000
Expected: Simple HTML page with basic elements
```

### 2. JSON API Test
```
URL: https://httpbin.org/json
Mode: Text Extract
Max Pages: 1
Delay: 1500
Expected: JSON data displayed as text
```

### 3. Python Documentation (Real World)
```
URL: https://docs.python.org/3/tutorial/
Mode: Text Extract
Max Pages: 5
Delay: 3000
Expected: Python tutorial sections
```

### 4. MDN Web Docs (Real World)
```
URL: https://developer.mozilla.org/en-US/docs/Web/HTML
Mode: Screenshots
Max Pages: 3
Delay: 4000
Expected: HTML documentation pages
```

### 5. GitHub Wiki (If Available)
```
URL: https://github.com/nodejs/node/wiki
Mode: Text Extract
Max Pages: 5
Delay: 2500
Expected: Node.js wiki content
```

## 📚 Documentation Site Examples

### Programming Languages

**JavaScript:**
```
URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript
Mode: Text Extract
Max Pages: 5
Delay: 3000
```

**Python:**
```
URL: https://docs.python.org/3/library/
Mode: Screenshots
Max Pages: 3
Delay: 3500
```

**Go:**
```
URL: https://golang.org/doc/
Mode: Text Extract
Max Pages: 5
Delay: 2500
```

### Frameworks & Tools

**React:**
```
URL: https://reactjs.org/docs/getting-started.html
Mode: Text Extract
Max Pages: 5
Delay: 3000
```

**Docker:**
```
URL: https://docs.docker.com/get-started/
Mode: Screenshots
Max Pages: 3
Delay: 4000
```

**Kubernetes:**
```
URL: https://kubernetes.io/docs/home/
Mode: Text Extract
Max Pages: 5
Delay: 3500
```

## 🎯 Progressive Testing Strategy

### Level 1: Basic Functionality (2 minutes)
```
Test: httpbin.org/html
Goal: Verify extension loads and captures
Success: HTML file downloads
```

### Level 2: Multi-Page Navigation (5 minutes)
```
Test: Python tutorial (5 pages)
Goal: Test auto-navigation
Success: 5 screenshots or text extracts
```

### Level 3: Real Documentation (10 minutes)
```
Test: MDN or similar
Goal: Test with real content
Success: Complete documentation capture
```

### Level 4: Your Target Site
```
Test: Your documentation site
Goal: Production use
Success: Complete capture of your content
```

## ⚡ Speed Tests

### Fast Test (1 minute)
```
URL: https://httpbin.org/html
Max Pages: 1
Delay: 1000
Mode: Screenshots
```

### Standard Test (3 minutes)
```
URL: https://httpbin.org/html
Max Pages: 3
Delay: 2000
Mode: Both
```

### Stress Test (10 minutes)
```
URL: https://docs.python.org/3/tutorial/
Max Pages: 10
Delay: 3000
Mode: Text Extract
```

## 🔍 Troubleshooting Test URLs

### If Auto-Detection Fails
```
URL: https://en.wikipedia.org/wiki/JavaScript
Mode: Manual navigation
Instructions:
1. Start capture
2. Click "Next page" links manually
3. Extension captures each page
4. Export when done
```

### If Text Extraction is Empty
```
URL: https://httpbin.org/html
Mode: Text Extract
Max Pages: 1
Delay: 5000
Expected: Should show HTML content
```

### If Screenshots Fail
```
URL: https://httpbin.org/html
Mode: Screenshots
Max Pages: 1
Delay: 2000
Expected: Should capture visible tab
```

## 📊 Expected Results by Site Type

### Simple HTML Sites
- **Speed:** Fast (1-2s per page)
- **Screenshots:** Excellent
- **Text:** Excellent
- **Navigation:** Good

### JavaScript-Heavy Sites
- **Speed:** Slow (3-8s per page)
- **Screenshots:** Good
- **Text:** Variable
- **Navigation:** May need manual

### Documentation Sites
- **Speed:** Medium (2-4s per page)
- **Screenshots:** Good
- **Text:** Excellent
- **Navigation:** Good

### Single-Page Apps
- **Speed:** Variable
- **Screenshots:** Good
- **Text:** May need manual
- **Navigation:** Manual only

## 🎓 Learning URLs

### For Understanding Text Extraction
```
URL: https://www.w3.org/TR/html52/
Mode: Text Extract
Max Pages: 2
Delay: 3000
Note: See how structured content is extracted
```

### For Understanding Screenshots
```
URL: https://web.dev/learn/html/
Mode: Screenshots
Max Pages: 3
Delay: 4000
Note: See visual capture quality
```

## 🚫 Known Issues

### Sites That May Not Work Perfectly

**Wikipedia:**
- Auto-navigation may not detect correctly
- Use manual navigation
- Text extraction works well

**GitHub Issues/Pages:**
- Requires authentication for private repos
- Public repos work fine
- May need longer delays

**React/Vue Docs:**
- Some dynamic content
- Increase delay to 5000ms+
- Screenshots work better than text

**PDFs/Downloads:**
- Extension captures pages, not downloads
- Use browser's native PDF viewer
- Download links won't be followed

## ✅ Success Indicators

### Screenshots Mode
- ✅ Progress bar moves
- ✅ Status shows "Captured X/Y"
- ✅ HTML file downloads
- ✅ File contains images
- ✅ Can print to PDF

### Text Mode
- ✅ Progress bar moves
- ✅ Status shows "Extracted X/Y"
- ✅ Two files download (.md, .txt)
- ✅ Files contain readable text
- ✅ Headings preserved

## 🎯 Recommended First Test

**Use this exact configuration:**

```
Mode: Screenshots
URL: https://httpbin.org/html
Max Pages: 2
Delay: 2000
```

**Expected timeline:**
- 0s: Click Start
- 2s: Page 1 captured
- 4s: Page 2 captured
- 5s: Export available
- 6s: Download complete

**Total time:** ~6 seconds

**File size:** ~500KB

**Success rate:** 99%

---

**Ready to test!** Start with the first URL and work your way up.
