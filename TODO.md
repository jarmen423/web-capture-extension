# Remaining Tasks for Web Capture Pro

To make this product fully shippable and robust, the following tasks should be addressed:

## High Priority

- [ ] **True PDF Generation**:
  - Currently, we export an HTML file that users must print to PDF.
  - **Goal**: Integrate `jsPDF` (or `html2pdf.js`) to generate a real PDF file directly within the extension.
  - **Action**: Add the library to the repo and update `compilePDF` in `background.js` (or move logic to offscreen document if needed for complex rendering).

- [ ] **Unit & Integration Tests**:
  - Currently, there are no automated tests.
  - **Goal**: Set up a testing framework (e.g., Jest + Puppeteer/Playwright).
  - **Action**: Create tests for `utils.js` (text processing) and end-to-end tests for the capture flow.

- [ ] **Robust Navigation Logic Refactoring**:
  - Currently, `content.js` has robust navigation logic, while `utils.js` has a simplified placeholder.
  - **Goal**: Move the robust logic from `content.js` into `WebCaptureUtils.NavigationDetector` in `utils.js`.
  - **Benefit**: Centralizes logic and makes it testable.

## Medium Priority

- [ ] **Error Handling & Recovery**:
  - **Goal**: Handle network timeouts or 404s gracefully.
  - **Action**: Add retry logic in `background.js` if a page load fails.

- [ ] **Pause/Resume UX**:
  - **Goal**: Improve the visual feedback when paused.
  - **Action**: Maybe flash the badge or change icon color when paused.

- [ ] **Manual Selection Mode**:
  - **Goal**: Allow users to click on the "Next" button element to train the navigator if auto-detection fails.

## Low Priority

- [ ] **Cloud Storage Integration**:
  - Save directly to Google Drive / Dropbox.

- [ ] **OCR Support**:
  - Extract text from screenshots using Tesseract.js.
