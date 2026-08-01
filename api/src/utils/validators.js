const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  // Browser MediaRecorder ("record a voice note" feature) produces webm/opus.
  'audio/webm',
]);

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.wav', '.mp3', '.webm']);

function isAllowedFile(file) {
  const path = require('path');
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext);
}

function isImage(file) {
  return /^image\//.test(file.mimetype) || /\.(jpe?g|png)$/i.test(file.originalname || '');
}

function isPdf(file) {
  return file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
}

function isAudio(file) {
  return /^audio\//.test(file.mimetype) || /\.(wav|mp3|webm)$/i.test(file.originalname || '');
}

module.exports = { isAllowedFile, isImage, isPdf, isAudio, ALLOWED_EXT };
