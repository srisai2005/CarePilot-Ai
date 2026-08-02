/**
 * Azure AI Speech.
 *   - Speech-to-text: REST short-audio recognition endpoint. Used to transcribe
 *     doctor voice notes (WAV/MP3) recorded after a visit.
 *   - Text-to-speech: REST synthesis endpoint. Used to read plain-language
 *     summaries aloud for patients who prefer listening.
 *
 * Docs: https://learn.microsoft.com/azure/ai-services/speech-service/rest-speech-to-text
 *       https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
 */
const axios = require('axios');
const fs = require('fs');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

function assertConfigured() {
  if (!env.speech.isConfigured) {
    throw new AppError(
      'Azure AI Speech is not configured. Set SPEECH_KEY and SPEECH_REGION in backend/.env',
      500
    );
  }
}

/**
 * Transcribes a local audio file (wav or mp3) to text using the short-audio
 * REST recognition endpoint. Suitable for voice notes up to ~60 seconds;
 * for longer recordings this can be swapped for Azure's async Batch
 * Transcription API using the same credentials.
 *
 * `locale` is a BCP-47 tag (e.g. 'hi-IN', 'te-IN') — see config/languages.js
 * for the app's supported list. Defaults to English (India) if omitted.
 */
async function transcribeAudio(filePath, mimetype, locale = 'en-IN') {
  assertConfigured();

  const audioBuffer = fs.readFileSync(filePath);
  let contentType = 'audio/wav; codecs=audio/pcm; samplerate=16000';
  if (mimetype && mimetype.includes('mp3')) contentType = 'audio/mpeg';
  if (mimetype && mimetype.includes('webm')) contentType = 'audio/webm; codecs=opus';

  const url =
    `https://${env.speech.region}.stt.speech.microsoft.com/speech/recognition/conversation/` +
    `cognitiveservices/v1?language=${encodeURIComponent(locale)}&format=detailed`;

  const resp = await axios.post(url, audioBuffer, {
    headers: {
      'Ocp-Apim-Subscription-Key': env.speech.key,
      'Content-Type': contentType,
      Accept: 'application/json',
    },
    maxBodyLength: Infinity,
  });

  const data = resp.data;
  if (data.RecognitionStatus !== 'Success' && data.RecognitionStatus !== undefined) {
    throw new AppError(
      `Speech-to-text could not transcribe the audio (status: ${data.RecognitionStatus}). ` +
        `Try a clearer recording or a shorter clip.`,
      422
    );
  }

  const bestText =
    data.DisplayText ||
    (data.NBest && data.NBest[0] && data.NBest[0].Display) ||
    '';

  return { text: bestText, confidence: data.NBest?.[0]?.Confidence ?? null, raw: data };
}

/**
 * Converts text to speech (SSML) and returns an MP3 audio buffer.
 * `voice` should be one of the Azure neural voice names from
 * config/languages.js (e.g. 'hi-IN-SwaraNeural'). The SSML `xml:lang` is
 * derived from the voice name itself so it always matches.
 */
async function synthesizeSpeech(text, voice = 'en-US-JennyNeural') {
  assertConfigured();

  const langMatch = /^([a-z]{2,3}-[A-Za-z]{2,4})-/.exec(voice);
  const xmlLang = langMatch ? langMatch[1] : 'en-US';

  const ssml = `<speak version="1.0" xml:lang="${xmlLang}">
  <voice name="${voice}">${escapeXml(text)}</voice>
</speak>`;

  const url = `https://${env.speech.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const resp = await axios.post(url, ssml, {
    headers: {
      'Ocp-Apim-Subscription-Key': env.speech.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'CarePilotAI',
    },
    responseType: 'arraybuffer',
  });

  return Buffer.from(resp.data);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { transcribeAudio, synthesizeSpeech };
