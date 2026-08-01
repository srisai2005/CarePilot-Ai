const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { isAllowedFile } = require('../utils/validators');

// Azure Functions (Consumption plan) only guarantees a writable filesystem
// under the OS temp directory (D:\local\Temp on Windows, /tmp on Linux).
// Files here are only used transiently (read once for OCR/transcription,
// then discarded) — see recordService.processUpload — so this is safe.
const UPLOAD_DIR = path.join(os.tmpdir(), 'carepilot-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(
      file.originalname
    )}`;
    cb(null, safeName);
  },
});

function fileFilter(req, file, cb) {
  if (isAllowedFile(file)) return cb(null, true);
  cb(new Error('Unsupported file type. Allowed: PDF, JPG, PNG, JPEG, WAV, MP3.'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

module.exports = { upload, UPLOAD_DIR };
