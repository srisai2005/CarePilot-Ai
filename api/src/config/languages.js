/**
 * Supported languages for CarePilot AI's AI-generated content — speech
 * recognition, text-to-speech, and OpenAI summaries/chat answers.
 *
 * `code` is a simple app-level key sent from the frontend and stored on
 * records. `sttLocale` is the BCP-47 locale Azure Speech-to-text expects.
 * `ttsVoice` is a specific Azure neural voice name for that language.
 *
 * Note: OCR (Vision) always reads the document in whatever language it was
 * printed/written in — that isn't affected by this setting. This setting
 * controls what language the *AI explains things back to the patient in*
 * (summaries, chat answers) and what language voice notes are transcribed
 * from / read aloud in.
 *
 * Azure Speech's supported locale/voice list occasionally changes — if a
 * language here isn't available in your Azure Speech resource/region, that
 * specific STT/TTS call will fail with a clear Azure error; text features
 * (summaries, chat, extraction) are unaffected either way since those go
 * through Azure OpenAI, not Speech.
 */
const LANGUAGES = [
  { code: 'en-US', label: 'English', sttLocale: 'en-US', ttsVoice: 'en-US-JennyNeural' },
  { code: 'en-IN', label: 'English (India)', sttLocale: 'en-IN', ttsVoice: 'en-IN-NeerjaNeural' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', sttLocale: 'hi-IN', ttsVoice: 'hi-IN-SwaraNeural' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)', sttLocale: 'te-IN', ttsVoice: 'te-IN-ShrutiNeural' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)', sttLocale: 'ta-IN', ttsVoice: 'ta-IN-PallaviNeural' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', sttLocale: 'kn-IN', ttsVoice: 'kn-IN-SapnaNeural' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)', sttLocale: 'ml-IN', ttsVoice: 'ml-IN-SobhanaNeural' },
  { code: 'mr-IN', label: 'मराठी (Marathi)', sttLocale: 'mr-IN', ttsVoice: 'mr-IN-AarohiNeural' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)', sttLocale: 'bn-IN', ttsVoice: 'bn-IN-TanishaaNeural' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)', sttLocale: 'gu-IN', ttsVoice: 'gu-IN-DhwaniNeural' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)', sttLocale: 'pa-IN', ttsVoice: 'pa-IN-VaaniNeural' },
  { code: 'ur-IN', label: 'اردو (Urdu)', sttLocale: 'ur-IN', ttsVoice: 'ur-IN-GulNeural' },
  { code: 'es-ES', label: 'Español (Spanish)', sttLocale: 'es-ES', ttsVoice: 'es-ES-ElviraNeural' },
  { code: 'fr-FR', label: 'Français (French)', sttLocale: 'fr-FR', ttsVoice: 'fr-FR-DeniseNeural' },
  { code: 'ar-SA', label: 'العربية (Arabic)', sttLocale: 'ar-SA', ttsVoice: 'ar-SA-ZariyahNeural' },
  { code: 'zh-CN', label: '中文 (Chinese)', sttLocale: 'zh-CN', ttsVoice: 'zh-CN-XiaoxiaoNeural' },
];

const DEFAULT_LANGUAGE = 'en-US';

const byCode = new Map(LANGUAGES.map((l) => [l.code, l]));

function getLanguage(code) {
  return byCode.get(code) || byCode.get(DEFAULT_LANGUAGE);
}

module.exports = { LANGUAGES, DEFAULT_LANGUAGE, getLanguage };
