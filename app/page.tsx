'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create room
      const createRes = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });

      const createData = await createRes.json();
      if (!createData.success) {
        throw new Error(createData.error);
      }

      // Join the room
      const joinRes = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomCode: createData.roomCode,
          name: name.trim(),
          language,
        }),
      });

      const joinData = await joinRes.json();
      if (!joinData.success) {
        throw new Error(joinData.error);
      }

      // Store user info in sessionStorage
      sessionStorage.setItem(
        'townhall_user',
        JSON.stringify({
          id: joinData.userId,
          name: name.trim(),
          language,
          roomCode: createData.roomCode,
        })
      );

      router.push(`/room/${createData.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomCode: roomCode.trim().toUpperCase(),
          name: name.trim(),
          language,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      sessionStorage.setItem(
        'townhall_user',
        JSON.stringify({
          id: data.userId,
          name: name.trim(),
          language,
          roomCode: data.roomCode,
        })
      );

      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">TownHall</h1>
          <p className="text-purple-300 text-lg">
            Real-time voice chat in any language
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-white/80 text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Language Select */}
          <div className="mb-6">
            <label className="block text-white/80 text-sm font-medium mb-2">
              Your Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code} className="bg-slate-800">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Create Room Button */}
          <button
            onClick={createRoom}
            disabled={isCreating || isJoining}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-semibold rounded-lg transition-colors mb-4"
          >
            {isCreating ? 'Creating...' : 'Create New Room'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="text-white/40 text-sm">or join existing</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          {/* Room Code Input */}
          <div className="mb-4">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter Room Code"
              maxLength={6}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
            />
          </div>

          {/* Join Room Button */}
          <button
            onClick={joinRoom}
            disabled={isCreating || isJoining}
            className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white font-semibold rounded-lg border border-white/20 transition-colors"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Speak your language. Hear theirs.
        </p>
      </div>
    </div>
  );
}
