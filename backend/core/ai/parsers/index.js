// NovaMind — Central Parser Registry Initialization
import ParserRegistry from './ParserRegistry.js';
import PDFParser from './PDFParser.js';
import WordParser from './WordParser.js';
import ExcelParser from './ExcelParser.js';
import CSVParser from './CSVParser.js';
import PPTParser from './PPTParser.js';
import TextParser from './TextParser.js';

const registry = new ParserRegistry();

registry.register(['pdf'], new PDFParser());
registry.register(['docx', 'doc'], new WordParser());
registry.register(['xlsx', 'xls'], new ExcelParser());
registry.register(['csv'], new CSVParser());
registry.register(['pptx', 'ppt'], new PPTParser());
registry.register(['txt'], new TextParser());

export default registry;
