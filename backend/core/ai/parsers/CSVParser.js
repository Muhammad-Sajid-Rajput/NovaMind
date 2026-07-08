// NovaMind — CSVParser.js — File Upload Bug Fix
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

import { logger } from '../../utils/logger.js';

export default class CSVParser {
  constructor() {
    this.name = 'CSVParser';
    this.version = '2.0.0';
  }

  async parse(buffer) {
    logger.info('Parsing CSV file...');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0] || 'Sheet1';
    const sheet = workbook.Sheets[sheetName];
    
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (rawRows.length === 0) {
      return {
        type: 'CSV File',
        pages: 1,
        documentModel: []
      };
    }

    const headers = rawRows[0].map(h => String(h || '').trim());
    const dataRows = rawRows.slice(1).map(row => 
      row.map(cell => String(cell !== undefined && cell !== null ? cell : '').trim())
    );

    const documentModel = [{
      type: 'table',
      id: 'table-csv-main',
      sheetName,
      headers,
      rows: dataRows,
      caption: 'CSV Raw Data Table',
      source: {
        rowCount: dataRows.length
      }
    }];

    return {
      type: 'CSV File',
      pages: 1,
      documentModel
    };
  }
}
