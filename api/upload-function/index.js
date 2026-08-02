/**
 * Dedicated Azure Function for POST /api/upload.
 *
 * Why this exists as its own Function instead of going through the
 * Express app in ../server/ (which handles every other /api/* route):
 *
 * The rest of the API is wrapped with `azure-function-express`, which lets
 * an unmodified Express app run inside a single catch-all Function. That
 * works fine for JSON/text routes. It does NOT work for multipart file
 * uploads: multer (and the busboy library it's built on) parses the
 * request by calling `req.pipe(busboy)`, which assumes `req` is a live,
 * streaming Node `http.IncomingMessage`. But Azure Functions hands the
 * Function host a request that has *already been fully read into memory*
 * (`req.body` / `req.rawBody`) before your code runs — azure-function-express's
 * emulated `req` object doesn't behave like a real readable stream, so
 * multer's internal parsing breaks, typically surfacing as an opaque
 * "Cannot read properties of undefined (reading 'length')" error deep in
 * busboy, with req.file always ending up undefined.
 *
 * The fix: don't stream-parse at all. Azure Functions already gives us the
 * complete multipart body as a Buffer up front, so we feed that whole
 * buffer directly into busboy's non-streaming write()/end() API instead of
 * piping — this sidesteps the incompatibility entirely.
 *
 * Because this route ("upload") is more specific than the catch-all route
 * ("{*segments}") in ../server/function.json, Azure Functions' routing
 * automatically prefers this one for POST /api/upload and leaves every
 * other path going through the Express app as before.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Busboy = require('busboy');

const recordService = require('../src/services/recordService');
const { isAllowedFile } = require('../src/utils/validators');

const UPLOAD_DIR = path.join(os.tmpdir(), 'carepilot-uploads');

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || req.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(Object.assign(new Error('Expected multipart/form-data.'), { statusCode: 400 }));
      return;
    }

    // Azure Functions gives us the whole body up front — as a Buffer for
    // binary content types, otherwise fall back to req.rawBody.
    const bodyBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.rawBody || req.body || '', 'binary');

    const busboy = Busboy({ headers: { 'content-type': contentType }, limits: { fileSize: 25 * 1024 * 1024 } });

    let fileChunks = [];
    let fileName = null;
    let mimeType = null;
    let fileTooLarge = false;
    const fields = {};

    busboy.on('file', (_fieldname, fileStream, info) => {
      fileName = info.filename;
      mimeType = info.mimeType || info.mimetype;
      fileStream.on('data', (chunk) => fileChunks.push(chunk));
      fileStream.on('limit', () => { fileTooLarge = true; });
    });

    busboy.on('field', (name, val) => {
      fields[name] = val;
    });

    busboy.on('finish', () => {
      if (fileTooLarge) {
        reject(Object.assign(new Error('File is too large (25MB max).'), { statusCode: 413 }));
        return;
      }
      resolve({ buffer: Buffer.concat(fileChunks), fileName, mimeType, fields });
    });

    busboy.on('error', reject);

    busboy.end(bodyBuffer);
  });
}

module.exports = async function (context, req) {
  let tempFilePath = null;
  try {
    const { buffer, fileName, mimeType, fields } = await parseMultipart(req);

    if (!fileName || !buffer || !buffer.length) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'No file received. Attach a PDF, JPG, PNG, WAV, or MP3.' },
      };
      return;
    }

    const candidateFile = {
      originalname: fileName,
      mimetype: mimeType || 'application/octet-stream',
    };

    if (!isAllowedFile(candidateFile)) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Unsupported file type. Allowed: PDF, JPG, PNG, JPEG, WAV, MP3.' },
      };
      return;
    }

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(fileName)}`;
    tempFilePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(tempFilePath, buffer);

    const record = await recordService.processUpload(
      { path: tempFilePath, originalname: fileName, mimetype: candidateFile.mimetype },
      { docType: fields.docType, originalName: fileName }
    );

    context.res = {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: { record },
    };
  } catch (err) {
    context.log.error('[upload function] failed:', err.message, err.stack);
    context.res = {
      status: err.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: err.publicMessage || err.message || 'Upload failed.' },
    };
  } finally {
    // Best-effort cleanup — the file was only ever needed transiently for OCR/transcription.
    if (tempFilePath) {
      fs.unlink(tempFilePath, () => {});
    }
  }
};
