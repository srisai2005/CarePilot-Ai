const { app } = require('@azure/functions');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { json, withErrorHandling, AppError } = require('./_http');
const recordService = require('../src/services/recordService');
const { isAllowedFile } = require('../src/utils/validators');

const UPLOAD_DIR = path.join(os.tmpdir(), 'carepilot-uploads');

app.http('upload', {
  route: 'upload',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    // Azure Functions v4's request object implements the Fetch API, so
    // formData() parses multipart/form-data natively and reliably — no
    // multer/busboy/streaming-compatibility issues like the old setup had.
    const form = await request.formData();
    const file = form.get('file');
    const docType = form.get('docType') || undefined;

    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new AppError('No file received. Attach a PDF, JPG, PNG, WAV, or MP3.', 400);
    }

    const candidateFile = {
      originalname: file.name,
      mimetype: file.type || 'application/octet-stream',
    };

    if (!isAllowedFile(candidateFile)) {
      throw new AppError('Unsupported file type. Allowed: PDF, JPG, PNG, JPEG, WAV, MP3.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      throw new AppError('The uploaded file is empty.', 400);
    }

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.name || '')}`;
    const tempFilePath = path.join(UPLOAD_DIR, safeName);

    try {
      fs.writeFileSync(tempFilePath, buffer);

      const record = await recordService.processUpload(
        { path: tempFilePath, originalname: file.name, mimetype: candidateFile.mimetype },
        { docType, originalName: file.name }
      );

      return json(201, { record });
    } finally {
      fs.unlink(tempFilePath, () => {});
    }
  }),
});
