// Supported languages (intersection of Parakeet STT and Chatterbox TTS)
// Including Russian and Hindi as requested
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  hi: 'Hindi',
  zh: 'Chinese',
  ja: 'Japanese',
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export interface User {
  id: string;
  name: string;
  language: LanguageCode;
  joinedAt: number;
}

export interface Room {
  code: string;
  users: Map<string, User>;
  createdAt: number;
}

export interface AudioMessage {
  id: string;
  senderId: string;
  senderName: string;
  originalText: string;
  timestamp: number;
  // Map of languageCode -> audio blob URL
  audioByLanguage: Record<LanguageCode, string>;
}

export interface RoomState {
  code: string;
  users: User[];
  messages: AudioMessage[];
}

// API Response types
export interface TranscriptionResponse {
  text: string;
}

export interface TranslationResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface TTSResponse {
  audio: string; // base64 encoded audio
}
