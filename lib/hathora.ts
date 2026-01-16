// Hathora API integration for STT, Translation, and TTS

import { LanguageCode, SUPPORTED_LANGUAGES } from './types';

const STT_URL = process.env.HATHORA_STT_URL!;
const LLM_URL = process.env.HATHORA_LLM_URL!;
const TTS_URL = process.env.HATHORA_TTS_URL!;
const API_KEY = process.env.HATHORA_API_KEY!;

// Language names for the LLM translation prompt
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  hi: 'Hindi',
  zh: 'Chinese (Mandarin)',
  ja: 'Japanese',
};

// ============================================
// Speech-to-Text (Parakeet)
// ============================================
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log('[STT] Audio blob size:', audioBlob.size, 'bytes');
  console.log('[STT] Audio blob type:', audioBlob.type);

  if (audioBlob.size < 1000) {
    throw new Error('Recording too short - please hold the button longer');
  }

  // Determine file extension from MIME type
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  const ext = mimeToExt[audioBlob.type] || 'webm';
  const filename = `audio.${ext}`;

  const formData = new FormData();
  formData.append('file', audioBlob, filename);

  console.log('[STT] Sending to:', STT_URL);
  console.log('[STT] Filename:', filename);

  const response = await fetch(STT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json',
    },
    body: formData,
  });

  const responseText = await response.text();
  console.log('[STT] Response status:', response.status);
  console.log('[STT] Response body:', responseText);

  if (!response.ok) {
    throw new Error(`STT failed: ${response.status} - ${responseText}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`STT returned invalid JSON: ${responseText}`);
  }

  // Try various response formats
  const text = data.text || data.transcription || data.transcript || data.result || '';
  console.log('[STT] Extracted text:', text);

  return text;
}

// ============================================
// Text-to-Text Translation (Qwen)
// ============================================
export async function translateText(
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): Promise<string> {
  // Don't translate if same language
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  const systemPrompt = `You are a translator. Translate the following text from ${LANGUAGE_NAMES[sourceLanguage]} into ${LANGUAGE_NAMES[targetLanguage]}. Output ONLY the translation, no preamble, no explanation, no quotes.`;

  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Translation failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || text;
}

// Batch translate to multiple languages (optimized - only translate once per language)
export async function batchTranslate(
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguages: LanguageCode[]
): Promise<Record<LanguageCode, string>> {
  const translations: Record<string, string> = {};

  // Always include original text for source language
  translations[sourceLanguage] = text;

  // Filter out source language and deduplicate
  const uniqueTargets = [...new Set(targetLanguages)].filter(
    (lang) => lang !== sourceLanguage
  );

  // Translate to each unique target language in parallel
  const translationPromises = uniqueTargets.map(async (targetLang) => {
    const translated = await translateText(text, sourceLanguage, targetLang);
    return { lang: targetLang, text: translated };
  });

  const results = await Promise.all(translationPromises);

  for (const result of results) {
    translations[result.lang] = result.text;
  }

  return translations as Record<LanguageCode, string>;
}

// ============================================
// Text-to-Speech (Chatterbox)
// ============================================
export async function synthesizeSpeech(
  text: string,
  language: LanguageCode
): Promise<string> {
  console.log('[TTS] Synthesizing:', text.substring(0, 50), '... in', language);

  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'resemble-ai-chatterbox-multilingual',
      text: text,
      model_config: [
        { name: 'exaggeration', value: '0.5' },
        { name: 'cfg_weight', value: '0.5' },
        { name: 'language_id', value: language },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS failed: ${response.status} - ${error}`);
  }

  // Check content type - API returns raw audio, not JSON
  const contentType = response.headers.get('content-type') || '';
  console.log('[TTS] Response content-type:', contentType);

  if (contentType.includes('audio') || contentType.includes('octet-stream')) {
    // Raw audio response - convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    console.log('[TTS] Got raw audio, size:', arrayBuffer.byteLength, 'bytes');
    return base64;
  } else {
    // JSON response with base64 audio
    const data = await response.json();
    return data.audio || data.data || '';
  }
}

// Batch synthesize for multiple languages
export async function batchSynthesize(
  translations: Record<LanguageCode, string>
): Promise<Record<LanguageCode, string>> {
  const audioResults: Record<string, string> = {};

  const synthesisPromises = Object.entries(translations).map(
    async ([lang, text]) => {
      const audio = await synthesizeSpeech(text, lang as LanguageCode);
      return { lang, audio };
    }
  );

  const results = await Promise.all(synthesisPromises);

  for (const result of results) {
    audioResults[result.lang] = result.audio;
  }

  return audioResults as Record<LanguageCode, string>;
}

// ============================================
// Full Audio Processing Chain
// ============================================
export interface ProcessedAudio {
  originalText: string;
  translations: Record<LanguageCode, string>;
  audioByLanguage: Record<LanguageCode, string>;
}

export async function processAudioChain(
  audioBlob: Blob,
  sourceLanguage: LanguageCode,
  targetLanguages: LanguageCode[]
): Promise<ProcessedAudio> {
  // Step 1: Transcribe
  console.log('[Chain] Step 1: Transcribing audio...');
  const originalText = await transcribeAudio(audioBlob);
  console.log('[Chain] Transcribed:', originalText);

  if (!originalText.trim()) {
    throw new Error('No speech detected in audio');
  }

  // Step 2: Translate to all target languages (deduplicated)
  console.log('[Chain] Step 2: Translating to:', targetLanguages);
  const translations = await batchTranslate(
    originalText,
    sourceLanguage,
    targetLanguages
  );
  console.log('[Chain] Translations:', translations);

  // Step 3: Synthesize speech for each language
  console.log('[Chain] Step 3: Synthesizing speech...');
  const audioByLanguage = await batchSynthesize(translations);
  console.log('[Chain] Audio generated for languages:', Object.keys(audioByLanguage));

  return {
    originalText,
    translations,
    audioByLanguage,
  };
}
