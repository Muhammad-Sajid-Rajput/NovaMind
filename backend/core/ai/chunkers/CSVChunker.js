// NovaMind — CSVChunker.js
export default class CSVChunker {
  constructor() {
    this.name = 'CSVChunker';
    this.version = '2.0.0';
  }

  chunk(documentModel) {
    const chunks = [];

    documentModel.forEach((node) => {
      if (node.type !== 'table') return;

      const headers = node.headers;
      const rows = node.rows;

      // Group CSV into chunks of 50 rows
      const ROW_BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += ROW_BATCH_SIZE) {
        const batch = rows.slice(i, i + ROW_BATCH_SIZE);
        
        let csvStr = `Headers: ${headers.join(', ')}\n`;
        batch.forEach((row) => {
          csvStr += `${row.join(', ')}\n`;
        });

        chunks.push({
          text: csvStr.trim(),
          metadata: {
            rowRange: `${i + 1}-${i + batch.length}`,
            headers,
            chunkTokenCount: Math.round(csvStr.trim().length / 4)
          }
        });
      }
    });

    return chunks;
  }
}
