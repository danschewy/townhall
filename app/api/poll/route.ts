import { NextRequest, NextResponse } from 'next/server';
import { getAudioMessages, getRoomUsers, roomExists } from '@/lib/rooms';
import { LanguageCode } from '@/lib/types';

// GET /api/poll?roomCode=XXX&userId=XXX&language=XX&since=timestamp
// Poll for new audio messages
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const roomCode = params.get('roomCode');
  const userId = params.get('userId');
  const language = params.get('language') as LanguageCode;
  const since = params.get('since');

  if (!roomCode || !userId || !language) {
    return NextResponse.json(
      { success: false, error: 'Missing required params' },
      { status: 400 }
    );
  }

  if (!(await roomExists(roomCode))) {
    return NextResponse.json(
      { success: false, error: 'Room not found' },
      { status: 404 }
    );
  }

  // Get messages since timestamp
  const sinceTimestamp = since ? parseInt(since, 10) : 0;
  const allMessages = await getAudioMessages(roomCode, sinceTimestamp);

  // Filter out messages from the requesting user and get audio for their language
  const messagesForUser = allMessages
    .filter((msg) => msg.senderId !== userId)
    .map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.originalText, // Show original text for reference
      timestamp: msg.timestamp,
      // Get audio in the user's language
      audio: msg.audioByLanguage[language] || null,
    }))
    .filter((msg) => msg.audio !== null);

  // Also get current users in room
  const users = await getRoomUsers(roomCode);

  return NextResponse.json({
    success: true,
    messages: messagesForUser,
    users,
    timestamp: Date.now(),
  });
}
