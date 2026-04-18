// Offscreen document script for PDF generation
// Runs in a hidden offscreen document with DOM access

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.action === 'generatePDF') {
    handleGeneratePDF(message);
    sendResponse({ success: true, received: true });
  }
});

async function handleGeneratePDF(message) {
  const { sessionId, screenshots } = message;

  try {
    if (!screenshots || screenshots.length === 0) {
      throw new Error('No screenshots provided');
    }

    // Wait for jsPDF to load
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
      throw new Error('jsPDF library not loaded');
    }

    const { jsPDF } = jspdf;

    // Determine page size from first image
    const firstImage = await loadImage(screenshots[0].dataUrl);
    const aspectRatio = firstImage.width / firstImage.height;

    // Use A4 portrait, scaling image to fit width
    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const margin = 10; // mm
    const usableWidth = pageWidth - margin * 2;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < screenshots.length; i++) {
      const shot = screenshots[i];
      const img = await loadImage(shot.dataUrl);

      // Calculate image dimensions to fit within usable width
      const imgWidth = usableWidth;
      const imgHeight = imgWidth / (img.width / img.height);

      // If image is taller than page, scale to fit height
      const usableHeight = pageHeight - margin * 2;
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (imgHeight > usableHeight) {
        finalHeight = usableHeight;
        finalWidth = finalHeight * (img.width / img.height);
      }

      const x = (pageWidth - finalWidth) / 2;
      const y = margin;

      if (i > 0) {
        pdf.addPage();
      }

      // Add header text
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${i + 1} — ${shot.url || ''}`, margin, margin - 2);

      // Add image
      pdf.addImage(shot.dataUrl, 'PNG', x, y, finalWidth, finalHeight);

      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const footerY = pageHeight - margin + 4;
      pdf.text(`Captured by Web Capture Pro — ${new Date(shot.timestamp).toISOString()}`, margin, footerY);
      pdf.text(`${i + 1} / ${screenshots.length}`, pageWidth - margin, footerY, { align: 'right' });
    }

    const pdfDataUrl = pdf.output('datauristring');

    chrome.runtime.sendMessage({
      action: 'pdfGenerated',
      sessionId,
      pdfDataUrl
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    chrome.runtime.sendMessage({
      action: 'pdfError',
      sessionId,
      error: error.message
    });
  }
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

console.log('Web Capture Pro offscreen document loaded');
