// NovaMind — PPTChunker.js
export default class PPTChunker {
  constructor() {
    this.name = 'PPTChunker';
    this.version = '2.0.0';
  }

  chunk(documentModel) {
    const chunks = [];
    
    // Group by slideNumber
    const slideGroups = {};
    documentModel.forEach((node) => {
      const slide = node.source?.slideNumber || 1;
      if (!slideGroups[slide]) slideGroups[slide] = [];
      slideGroups[slide].push(node.text);
    });

    Object.keys(slideGroups).forEach((slideStr) => {
      const slideNumber = parseInt(slideStr, 10);
      const slideTexts = slideGroups[slideStr];
      const mergedText = slideTexts.join('\n');

      chunks.push({
        text: mergedText.trim(),
        metadata: {
          slideNumber,
          chunkTokenCount: Math.round(mergedText.trim().length / 4)
        }
      });
    });

    return chunks;
  }
}
