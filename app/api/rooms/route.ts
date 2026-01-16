import { NextRequest, NextResponse } from 'next/server';
import {
  createRoom,
  roomExists,
  joinRoom,
  leaveRoom,
  getRoomUsers,
  generateUserId,
} from '@/lib/rooms';
import { LanguageCode } from '@/lib/types';

// POST /api/rooms - Create a new room or join existing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomCode, name, language, userId } = body;

    if (action === 'create') {
      const code = await createRoom();
      return NextResponse.json({ success: true, roomCode: code });
    }

    if (action === 'join') {
      if (!roomCode || !name || !language) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const upperCode = roomCode.toUpperCase();

      if (!(await roomExists(upperCode))) {
        return NextResponse.json(
          { success: false, error: 'Room not found' },
          { status: 404 }
        );
      }

      const newUserId = generateUserId();
      const user = await joinRoom(upperCode, newUserId, name, language as LanguageCode);

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Failed to join room' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        userId: newUserId,
        user,
        roomCode: upperCode,
      });
    }

    if (action === 'leave') {
      if (!roomCode || !userId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      await leaveRoom(roomCode, userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Room API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/rooms?code=XXXX - Get room info
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Room code required' },
      { status: 400 }
    );
  }

  if (!(await roomExists(code))) {
    return NextResponse.json(
      { success: false, error: 'Room not found' },
      { status: 404 }
    );
  }

  const users = await getRoomUsers(code);

  return NextResponse.json({
    success: true,
    roomCode: code.toUpperCase(),
    users,
  });
}
