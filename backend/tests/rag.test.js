// NovaMind — rag.test.js — File Upload Bug Fix
import parserRegistry from '../core/ai/parsers/index.js';
import chunkStrategyRegistry from '../core/ai/chunkers/index.js';

describe('Production Multi-Document RAG Ingestion Pipeline Tests', () => {
  
  describe('ParserRegistry & Resolvers', () => {
    it('should successfully resolve parser implementations for standard file extensions', () => {
      const pdfParser = parserRegistry.getParser('document.pdf');
      const wordParser = parserRegistry.getParser('resume.docx');
      const excelParser = parserRegistry.getParser('financials.xlsx');
      const csvParser = parserRegistry.getParser('data.csv');
      const pptParser = parserRegistry.getParser('presentation.pptx');
      const textParser = parserRegistry.getParser('notes.txt');

      expect(pdfParser.name).toBe('PDFParser');
      expect(wordParser.name).toBe('WordParser');
      expect(excelParser.name).toBe('ExcelParser');
      expect(csvParser.name).toBe('CSVParser');
      expect(pptParser.name).toBe('PPTParser');
      expect(textParser.name).toBe('TextParser');
    });

    it('should throw an error for unregistered extensions', () => {
      expect(() => {
        parserRegistry.getParser('image.png');
      }).toThrow('No parser registered for file extension');
    });
  });

  describe('ChunkStrategyRegistry & Adaptive Strategies', () => {
    it('should successfully resolve chunking strategy implementations for parsed document types', () => {
      const pdfStrategy = chunkStrategyRegistry.getStrategy('PDF');
      const wordStrategy = chunkStrategyRegistry.getStrategy('Word Document');
      const excelStrategy = chunkStrategyRegistry.getStrategy('Excel Spreadsheet');
      const csvStrategy = chunkStrategyRegistry.getStrategy('CSV File');
      const pptStrategy = chunkStrategyRegistry.getStrategy('PowerPoint Presentation');
      const textStrategy = chunkStrategyRegistry.getStrategy('Text File');

      expect(pdfStrategy.name).toBe('PDFChunker');
      expect(wordStrategy.name).toBe('WordChunker');
      expect(excelStrategy.name).toBe('ExcelChunker');
      expect(csvStrategy.name).toBe('CSVChunker');
      expect(pptStrategy.name).toBe('PPTChunker');
      expect(textStrategy.name).toBe('TextChunker');
    });
  });

  describe('Adaptive Chunking Partition Logic', () => {
    it('should chunk PDF document models by page boundaries', () => {
      const pdfStrategy = chunkStrategyRegistry.getStrategy('PDF');
      const model = [
        { type: 'paragraph', text: 'Paragraph on page 1', source: { page: 1 } },
        { type: 'paragraph', text: 'Another paragraph on page 1', source: { page: 1 } },
        { type: 'paragraph', text: 'Paragraph on page 2', source: { page: 2 } }
      ];

      const chunks = pdfStrategy.chunk(model);
      expect(chunks.length).toBe(2);
      expect(chunks[0].metadata.pageNumber).toBe(1);
      expect(chunks[1].metadata.pageNumber).toBe(2);
    });

    it('should chunk Word document models by heading boundaries', () => {
      const wordStrategy = chunkStrategyRegistry.getStrategy('Word Document');
      const model = [
        { type: 'heading', text: 'Section A', source: { paragraphIndex: 0 } },
        { type: 'paragraph', text: 'Paragraph body A1', source: { paragraphIndex: 1 } },
        { type: 'heading', text: 'Section B', source: { paragraphIndex: 2 } },
        { type: 'paragraph', text: 'Paragraph body B1', source: { paragraphIndex: 3 } }
      ];

      const chunks = wordStrategy.chunk(model);
      expect(chunks.length).toBe(2);
      expect(chunks[0].metadata.headingPath).toEqual(['Section A']);
      expect(chunks[0].metadata.lineRange).toEqual(['1', '2']);
      expect(chunks[1].metadata.headingPath).toEqual(['Section B']);
    });

    it('should chunk Excel tables by row groups preserving headers', () => {
      const excelStrategy = chunkStrategyRegistry.getStrategy('Excel Spreadsheet');
      const model = [{
        type: 'table',
        sheetName: 'Sheet1',
        headers: ['Semester', 'GPA'],
        rows: [
          ['Semester 1', '3.5'],
          ['Semester 2', '3.64']
        ],
        source: { sheetIdx: 0 }
      }];

      const chunks = excelStrategy.chunk(model);
      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toContain('Sheet: Sheet1');
      expect(chunks[0].text).toContain('| Semester | GPA |');
      expect(chunks[0].text).toContain('| Semester 1 | 3.5 |');
    });

    it('should chunk CSV columns by row batch ranges', () => {
      const csvStrategy = chunkStrategyRegistry.getStrategy('CSV File');
      const model = [{
        type: 'table',
        sheetName: 'Sheet1',
        headers: ['Name', 'Age'],
        rows: [
          ['Munna', '22'],
          ['Sajid', '23']
        ]
      }];

      const chunks = csvStrategy.chunk(model);
      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toContain('Headers: Name, Age');
      expect(chunks[0].text).toContain('Munna, 22');
      expect(chunks[0].metadata.rowRange).toBe('1-2');
    });

    it('should chunk PPT slide nodes matching slide boundaries', () => {
      const pptStrategy = chunkStrategyRegistry.getStrategy('PowerPoint Presentation');
      const model = [
        { type: 'paragraph', text: 'Bullet point 1', source: { slideNumber: 1 } },
        { type: 'paragraph', text: 'Bullet point 2', source: { slideNumber: 1 } },
        { type: 'paragraph', text: 'Bullet point 3', source: { slideNumber: 2 } }
      ];

      const chunks = pptStrategy.chunk(model);
      expect(chunks.length).toBe(2);
      expect(chunks[0].metadata.slideNumber).toBe(1);
      expect(chunks[1].metadata.slideNumber).toBe(2);
    });
  });

});
