import { NextRequest, NextResponse } from 'next/server';
import { processAudioChain } from '@/lib/hathora';
import {
  getOtherUsersLanguages,
  getRoomUsers,
  addAudioMessage,
  roomExists,
} from '@/lib/rooms';
import { LanguageCode, AudioMessage } from '@/lib/types';

// POST /api/audio - Process audio and distribute to room
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob;
    const roomCode = formData.get('roomCode') as string;
    const userId = formData.get('userId') as string;
    const userLanguage = formData.get('language') as LanguageCode;

    if (!audioFile || !roomCode || !userId || !userLanguage) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!(await roomExists(roomCode))) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // Get languages of other users in the room (deduplicated)
    const targetLanguages = await getOtherUsersLanguages(roomCode, userId);

    // Also include the sender's language so they can hear themselves
    if (!targetLanguages.includes(userLanguage)) {
      targetLanguages.push(userLanguage);
    }

    if (targetLanguages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No other users in room',
      });
    }

    // Get user info for the message
    const users = await getRoomUsers(roomCode);
    const sender = users.find((u) => u.id === userId);

    console.log(
      `[Audio] Processing audio from ${sender?.name || userId} in ${userLanguage}`
    );
    console.log(`[Audio] Target languages: ${targetLanguages.join(', ')}`);

    // Process the full chain: STT -> Translate -> TTS
    const result = await processAudioChain(
      audioFile,
      userLanguage,
      targetLanguages
    );

    // Create audio message for distribution
    const message: AudioMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId: userId,
      senderName: sender?.name || 'Unknown',
      originalText: result.originalText,
      timestamp: Date.now(),
      audioByLanguage: result.audioByLanguage,
    };

    // Store the message for polling
    await addAudioMessage(roomCode, message);

    return NextResponse.json({
      success: true,
      messageId: message.id,
      originalText: result.originalText,
      translations: result.translations,
    });
  } catch (error) {
    console.error('Audio processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      },
      { status: 500 }
    );
  }
}
