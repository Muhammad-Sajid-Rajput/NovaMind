// NovaMind — TextChunker.js
export default class TextChunker {
  constructor() {
    this.name = 'TextChunker';
    this.version = '2.0.0';
  }

  chunk(documentModel) {
    const chunks = [];
    let currentText = '';
    let startIdx = 0;

    documentModel.forEach((node, idx) => {
      if ((currentText + node.text).length > 1000 && currentText.trim()) {
        chunks.push({
          text: currentText.trim(),
          metadata: {
            paragraphRange: `${startIdx + 1}-${idx}`,
            chunkTokenCount: Math.round(currentText.trim().length / 4)
          }
        });
        currentText = '';
        startIdx = idx;
      }
      currentText += node.text + '\n';
    });

    if (currentText.trim()) {
      chunks.push({
        text: currentText.trim(),
        metadata: {
          paragraphRange: `${startIdx + 1}-${documentModel.length}`,
          chunkTokenCount: Math.round(currentText.trim().length / 4)
        }
      });
    }

    return chunks;
  }
}
