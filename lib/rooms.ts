// Room storage with Upstash Redis for Vercel deployment
// Falls back to in-memory for local dev if Redis not configured

import { Redis } from '@upstash/redis';
import { Room, User, AudioMessage, LanguageCode } from './types';

// Initialize Redis if configured
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// In-memory fallback for local development
const memoryRooms = new Map<string, { users: Record<string, User>; createdAt: number }>();
const memoryMessages = new Map<string, AudioMessage[]>();

// Key prefixes for Redis
const ROOM_KEY = (code: string) => `room:${code}`;
const MESSAGES_KEY = (code: string) => `messages:${code}`;
const ROOM_TTL = 3600; // 1 hour

// Generate a simple 6-character room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate a simple user ID
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function createRoom(): Promise<string> {
  const code = generateRoomCode();
  const roomData = { users: {}, createdAt: Date.now() };

  if (redis) {
    // Upstash automatically serializes objects to JSON
    await redis.set(ROOM_KEY(code), roomData, { ex: ROOM_TTL });
    await redis.set(MESSAGES_KEY(code), [], { ex: ROOM_TTL });
  } else {
    memoryRooms.set(code, roomData);
    memoryMessages.set(code, []);
  }

  return code;
}

export async function getRoom(code: string): Promise<{ users: Record<string, User>; createdAt: number } | null> {
  const upperCode = code.toUpperCase();

  if (redis) {
    // Upstash automatically parses JSON
    const data = await redis.get<{ users: Record<string, User>; createdAt: number }>(ROOM_KEY(upperCode));
    return data || null;
  } else {
    return memoryRooms.get(upperCode) || null;
  }
}

export async function roomExists(code: string): Promise<boolean> {
  const room = await getRoom(code);
  return room !== null;
}

export async function joinRoom(
  code: string,
  userId: string,
  name: string,
  language: LanguageCode
): Promise<User | null> {
  const upperCode = code.toUpperCase();
  const room = await getRoom(upperCode);
  if (!room) return null;

  const user: User = {
    id: userId,
    name,
    language,
    joinedAt: Date.now(),
  };

  room.users[userId] = user;

  if (redis) {
    await redis.set(ROOM_KEY(upperCode), room, { ex: ROOM_TTL });
  } else {
    memoryRooms.set(upperCode, room);
  }

  return user;
}

export async function leaveRoom(code: string, userId: string): Promise<boolean> {
  const upperCode = code.toUpperCase();
  const room = await getRoom(upperCode);
  if (!room) return false;

  delete room.users[userId];

  if (redis) {
    await redis.set(ROOM_KEY(upperCode), room, { ex: ROOM_TTL });
  } else {
    memoryRooms.set(upperCode, room);
  }

  return true;
}

export async function getRoomUsers(code: string): Promise<User[]> {
  const room = await getRoom(code);
  if (!room) return [];
  return Object.values(room.users);
}

export async function getOtherUsersLanguages(
  code: string,
  excludeUserId: string
): Promise<LanguageCode[]> {
  const users = await getRoomUsers(code);
  const languages = new Set<LanguageCode>();

  for (const user of users) {
    if (user.id !== excludeUserId) {
      languages.add(user.language);
    }
  }

  return Array.from(languages);
}

export async function addAudioMessage(code: string, message: AudioMessage): Promise<void> {
  const upperCode = code.toUpperCase();

  if (redis) {
    const messages = await redis.get<AudioMessage[]>(MESSAGES_KEY(upperCode)) || [];
    messages.push(message);
    // Keep only last 50 messages
    const trimmed = messages.slice(-50);
    await redis.set(MESSAGES_KEY(upperCode), trimmed, { ex: ROOM_TTL });
  } else {
    const messages = memoryMessages.get(upperCode) || [];
    messages.push(message);
    if (messages.length > 50) messages.shift();
    memoryMessages.set(upperCode, messages);
  }
}

export async function getAudioMessages(
  code: string,
  since?: number
): Promise<AudioMessage[]> {
  const upperCode = code.toUpperCase();

  let messages: AudioMessage[];

  if (redis) {
    messages = await redis.get<AudioMessage[]>(MESSAGES_KEY(upperCode)) || [];
  } else {
    messages = memoryMessages.get(upperCode) || [];
  }

  if (since) {
    return messages.filter((m) => m.timestamp > since);
  }
  return messages;
}
