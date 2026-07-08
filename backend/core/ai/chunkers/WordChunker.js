// NovaMind — WordChunker.js
export default class WordChunker {
  constructor() {
    this.name = 'WordChunker';
    this.version = '2.0.0';
  }

  chunk(documentModel) {
    const chunks = [];
    let currentHeadingPath = [];
    let currentText = '';
    let startParagraphIdx = 0;

    documentModel.forEach((node) => {
      if (node.type === 'heading') {
        // Push existing chunk before starting new section
        if (currentText.trim()) {
          chunks.push({
            text: currentText.trim(),
            metadata: {
              headingPath: [...currentHeadingPath],
              lineRange: [String(startParagraphIdx + 1), String(node.source?.paragraphIndex || startParagraphIdx + 1)],
              chunkTokenCount: Math.round(currentText.trim().length / 4)
            }
          });
          currentText = '';
        }
        currentHeadingPath = [node.text];
        startParagraphIdx = node.source?.paragraphIndex || 0;
      } else {
        if ((currentText + node.text).length > 1000 && currentText.trim()) {
          chunks.push({
            text: currentText.trim(),
            metadata: {
              headingPath: [...currentHeadingPath],
              lineRange: [String(startParagraphIdx + 1), String(node.source?.paragraphIndex || startParagraphIdx + 1)],
              chunkTokenCount: Math.round(currentText.trim().length / 4)
            }
          });
          currentText = '';
          startParagraphIdx = node.source?.paragraphIndex || 0;
        }
        currentText += node.text + '\n';
      }
    });

    if (currentText.trim()) {
      chunks.push({
        text: currentText.trim(),
        metadata: {
          headingPath: [...currentHeadingPath],
          lineRange: [String(startParagraphIdx + 1), String(startParagraphIdx + 1)],
          chunkTokenCount: Math.round(currentText.trim().length / 4)
        }
      });
    }

    return chunks;
  }
}
