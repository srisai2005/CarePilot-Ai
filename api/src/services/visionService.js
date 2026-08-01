/**
 * Azure AI Vision — Read API (OCR).
 * Docs: https://learn.microsoft.com/azure/ai-services/computer-vision/how-to/call-read-api
 *
 * Works for prescriptions, lab reports, and medicine label photos (PDF/JPG/PNG).
 * Flow: submit the file -> poll the operation-location URL -> collect lines of text.
 */
const axios = require('axios');
const fs = require('fs');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

const READ_API_VERSION = 'v3.2';

function assertConfigured() {
  if (!env.vision.isConfigured) {
    throw new AppError(
      'Azure AI Vision is not configured. Set VISION_ENDPOINT and VISION_KEY in backend/.env',
      500
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs OCR on a local file (image or PDF) and returns the plain text plus
 * raw line/word data (useful later for highlighting on the source image).
 */
async function runOcr(filePath) {
  assertConfigured();

  const fileBuffer = fs.readFileSync(filePath);
  const submitUrl = `${env.vision.endpoint}/vision/${READ_API_VERSION}/read/analyze`;

  const submitResp = await axios.post(submitUrl, fileBuffer, {
    headers: {
      'Ocp-Apim-Subscription-Key': env.vision.key,
      'Content-Type': 'application/octet-stream',
    },
  });

  const operationLocation = submitResp.headers['operation-location'];
  if (!operationLocation) {
    throw new AppError('Azure AI Vision did not return an operation-location header.', 502);
  }

  // Poll until the async Read operation finishes (typically < 5s for a page or two).
  let result;
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(1000);
    const pollResp = await axios.get(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': env.vision.key },
    });
    if (pollResp.data.status === 'succeeded') {
      result = pollResp.data;
      break;
    }
    if (pollResp.data.status === 'failed') {
      throw new AppError('Azure AI Vision OCR failed to process the document.', 502);
    }
    // status is "notStarted" or "running" -> keep polling
  }

  if (!result) {
    throw new AppError('Azure AI Vision OCR timed out.', 504);
  }

  const pages = result.analyzeResult?.readResults || [];
  const lines = [];
  for (const page of pages) {
    for (const line of page.lines || []) {
      lines.push(line.text);
    }
  }

  return {
    text: lines.join('\n'),
    pageCount: pages.length,
    lineCount: lines.length,
    raw: result.analyzeResult,
  };
}

module.exports = { runOcr };
