// NovaMind — ExcelChunker.js
export default class ExcelChunker {
  constructor() {
    this.name = 'ExcelChunker';
    this.version = '2.0.0';
  }

  chunk(documentModel) {
    const chunks = [];

    documentModel.forEach((node) => {
      if (node.type !== 'table') return;

      const sheetName = node.sheetName;
      const headers = node.headers;
      const rows = node.rows;

      // Group rows into chunks of 10 rows to retain context
      const ROW_BATCH_SIZE = 10;
      for (let i = 0; i < rows.length; i += ROW_BATCH_SIZE) {
        const batch = rows.slice(i, i + ROW_BATCH_SIZE);
        
        // Build clear Markdown representation of these rows with headers
        let tableStr = `Sheet: ${sheetName}\n| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`;
        batch.forEach((row) => {
          tableStr += `| ${row.join(' | ')} |\n`;
        });

        chunks.push({
          text: tableStr.trim(),
          metadata: {
            sheetName,
            rowRange: `${i + 1}-${i + batch.length}`,
            chunkTokenCount: Math.round(tableStr.trim().length / 4)
          }
        });
      }
    });

    return chunks;
  }
}
