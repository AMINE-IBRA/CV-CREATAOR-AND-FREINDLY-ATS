import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config } from '../lib/config';
import { asyncRoute, HttpError } from '../lib/errors';
import { rateLimit } from '../middleware/rateLimit';
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadBytes, files: 1, fields: 5 },
  fileFilter: (_req, file, callback) => {
    if (['.pdf', '.docx'].includes(path.extname(file.originalname).toLowerCase())) callback(null, true);
    else callback(new HttpError(400, 'Please upload a PDF or DOCX file.'));
  },
});
function validateDocx(buffer: Buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) throw new HttpError(422, 'This file is not a valid DOCX document.');
  let uncompressed = 0; let entries = 0; let hasDocument = false;
  for (let offset = 0; offset + 46 <= buffer.length; offset++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    if (offset + 46 + nameLength + extraLength + commentLength > buffer.length) throw new HttpError(422, 'This DOCX archive is damaged.');
    uncompressed += buffer.readUInt32LE(offset + 24); entries++;
    if (buffer.readUInt16LE(offset + 8) & 1) throw new HttpError(422, 'Password-protected documents are not supported.');
    if (buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8') === 'word/document.xml') hasDocument = true;
    if (uncompressed > 50 * 1024 * 1024 || entries > 2000) throw new HttpError(413, 'The document contains too much compressed content.');
    offset += 45 + nameLength + extraLength + commentLength;
  }
  if (!hasDocument) throw new HttpError(422, 'This ZIP file is not a DOCX document.');
}
router.post('/resume', authenticate, rateLimit(10, 60 * 1000, req => req.user.id), upload.single('file'), asyncRoute(async (req: AuthRequest, res) => {
  if (!req.file) throw new HttpError(400, 'Please select a PDF or DOCX file.');
  const extension = path.extname(req.file.originalname).toLowerCase();
  const buffer = req.file.buffer;
  let text = '';
  if (extension === '.pdf') {
    if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new HttpError(422, 'This file is not a valid PDF.');
    try { const parsed = await require('pdf-parse/lib/pdf-parse.js')(buffer); text = parsed.text; } catch { throw new HttpError(422, 'This PDF could not be read. Try an unlocked text-based PDF; scanned PDFs require OCR.'); }
  } else {
    validateDocx(buffer);
    try { text = (await require('mammoth').extractRawText({ buffer })).value; } catch { throw new HttpError(422, 'The DOCX document could not be read.'); }
  }
  const extracted = text.replace(/\u0000/g, '').trim();
  if (extracted.length < 20) throw new HttpError(422, 'The file has too little selectable text. Scanned files require OCR.');
  if (extracted.length > 60000) throw new HttpError(413, 'This document is too long to import. Upload a resume with fewer pages.');
  res.json({ text: extracted, filename: path.basename(req.file.originalname), size: req.file.size });
}));
export default router;
