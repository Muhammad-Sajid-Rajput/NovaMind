// NovaMind — Central Chunk Strategy Registry Initialization
import ChunkStrategyRegistry from './ChunkStrategyRegistry.js';
import PDFChunker from './PDFChunker.js';
import WordChunker from './WordChunker.js';
import ExcelChunker from './ExcelChunker.js';
import CSVChunker from './CSVChunker.js';
import PPTChunker from './PPTChunker.js';
import TextChunker from './TextChunker.js';

const registry = new ChunkStrategyRegistry();

registry.register('PDF', new PDFChunker());
registry.register('Word Document', new WordChunker());
registry.register('Excel Spreadsheet', new ExcelChunker());
registry.register('CSV File', new CSVChunker());
registry.register('PowerPoint Presentation', new PPTChunker());
registry.register('Text File', new TextChunker());

export default registry;
