// NovaMind — ExcelParser.js — File Upload Bug Fix
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

import { logger } from '../../utils/logger.js';

export default class ExcelParser {
  constructor() {
    this.name = 'ExcelParser';
    this.version = '2.0.0';
  }

  async parse(buffer) {
    logger.info('Parsing Excel spreadsheet...');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const documentModel = [];

    workbook.SheetNames.forEach((sheetName, sheetIdx) => {
      const sheet = workbook.Sheets[sheetName];
      // Convert sheet to JSON array representing raw rows
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rawRows.length === 0) return;

      // Extract headers from the first non-empty row
      const headers = rawRows[0].map(h => String(h || '').trim());
      const dataRows = rawRows.slice(1).map(row => 
        row.map(cell => String(cell !== undefined && cell !== null ? cell : '').trim())
      );

      documentModel.push({
        type: 'table',
        id: `table-sheet-${sheetIdx}`,
        sheetName,
        headers,
        rows: dataRows,
        caption: `Spreadsheet Sheet: ${sheetName}`,
        source: {
          sheetIdx,
          rowCount: dataRows.length
        }
      });
    });

    return {
      type: 'Excel Spreadsheet',
      pages: workbook.SheetNames.length,
      documentModel
    };
  }
}
