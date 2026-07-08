// NovaMind — fileValidation.js
import crypto from 'crypto';

/**
 * Detects the MIME type of a file buffer using magic numbers/signatures.
 * Supports PDF, ZIP/Office (DOCX, XLSX, PPTX), Legacy Office, and Plain Text/CSV.
 */
export const getMimeTypeFromSignature = (buffer) => {
  if (!buffer || buffer.length < 8) return 'application/octet-stream';
  
  const hex = buffer.toString('hex', 0, 8);
  
  // PDF: %PDF (25 50 44 46)
  if (hex.startsWith('25504446')) {
    return 'application/pdf';
  }
  
  // ZIP-based Office XML files (DOCX, XLSX, PPTX): PK.. (50 4b 03 04)
  if (hex.startsWith('504b0304')) {
    return 'application/vnd.openxmlformats-officedocument'; // Representing modern Office XML
  }
  
  // CFB (Compound File Binary) - Legacy Office (DOC, XLS, PPT): (d0 cf 11 e0 a1 b1 1a e1)
  if (hex.startsWith('d0cf11e0a1b11ae1')) {
    return 'application/x-cfb';
  }

  // Text / CSV (check if printable ASCII/UTF-8 for the first 512 bytes)
  let isText = true;
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    const byteVal = buffer[i];
    // Reject control characters except Tab (9), LF (10), CR (13)
    if (byteVal < 32 && byteVal !== 9 && byteVal !== 10 && byteVal !== 13) {
      isText = false;
      break;
    }
  }
  if (isText) return 'text/plain';

  return 'application/octet-stream';
};

/**
 * Computes the SHA-256 hash of a file buffer.
 */
export const calculateSha256 = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Validates a file type based on its signature.
 * Returns true if the file type matches the allowed formats.
 */
export const validateFileSignature = (buffer, fileName) => {
  const mime = getMimeTypeFromSignature(buffer);
  const ext = fileName.split('.').pop().toLowerCase();
  
  const ALLOWED_EXTENSIONS = [
    'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'csv'
  ];
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  // Check cross-match boundaries
  if (ext === 'pdf' && mime !== 'application/pdf') return false;
  if (['docx', 'xlsx', 'pptx'].includes(ext) && mime !== 'application/vnd.openxmlformats-officedocument') return false;
  if (['doc', 'xls', 'ppt'].includes(ext) && mime !== 'application/x-cfb') return false;
  
  // Txt and CSV can map to text/plain or octet-stream (if empty/arbitrary)
  if (['txt', 'csv'].includes(ext) && mime !== 'text/plain' && mime !== 'application/octet-stream') return false;
  
  return true;
};
