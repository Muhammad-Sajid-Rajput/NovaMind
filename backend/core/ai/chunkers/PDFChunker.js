// NovaMind — PDFChunker.js
export default class PDFChunker {
  constructor() {
    this.name = 'PDFChunker';
    this.version = '2.0.0';
  }

  chunk(documentModel) {
    const chunks = [];
    
    // Group paragraph nodes. For PDFs, we chunk page-by-page if pages are large,
    // or group paragraphs within the same page.
    const pageGroups = {};
    documentModel.forEach((node) => {
      const page = node.source?.page || 1;
      if (!pageGroups[page]) pageGroups[page] = [];
      pageGroups[page].push(node.text);
    });

    Object.keys(pageGroups).forEach((pageStr) => {
      const pageNumber = parseInt(pageStr, 10);
      const paragraphs = pageGroups[pageStr];
      
      // Let's create chunks of max 1000 characters within each page
      let currentText = '';
      paragraphs.forEach((p) => {
        if ((currentText + p).length > 1000 && currentText.trim()) {
          chunks.push({
            text: currentText.trim(),
            metadata: {
              pageNumber,
              chunkTokenCount: Math.round(currentText.trim().length / 4)
            }
          });
          currentText = '';
        }
        currentText += p + '\n';
      });

      if (currentText.trim()) {
        chunks.push({
          text: currentText.trim(),
          metadata: {
            pageNumber,
            chunkTokenCount: Math.round(currentText.trim().length / 4)
          }
        });
      }
    });

    return chunks;
  }
}
