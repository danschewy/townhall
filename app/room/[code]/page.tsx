'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRecorder } from '@/hooks/useRecorder';
import { SUPPORTED_LANGUAGES, LanguageCode, User } from '@/lib/types';
import { PremiumBanner } from '@/components/PremiumBanner';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  audio: string; // base64
}

interface UserSession {
  id: string;
  name: string;
  language: LanguageCode;
  roomCode: string;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.code as string;

  const [user, setUser] = useState<UserSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const { isRecording, startRecording, stopRecording, error: recorderError } =
    useRecorder();

  const lastPollTimestamp = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Load user session from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('townhall_user');
    if (!stored) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(stored) as UserSession;
    if (userData.roomCode !== roomCode.toUpperCase()) {
      router.push('/');
      return;
    }

    setUser(userData);

    // Set cookie for Flowglad to track user
    document.cookie = `townhall_user_id=${userData.id}; path=/; max-age=86400`;
  }, [roomCode, router]);

  // Play audio from queue
  const playNextAudio = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    const audioBase64 = audioQueueRef.current.shift()!;

    try {
      // Convert base64 to audio and play
      const audioData = atob(audioBase64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        isPlayingRef.current = false;
        playNextAudio(); // Play next in queue
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        isPlayingRef.current = false;
        playNextAudio();
      };

      audio.play().catch(() => {
        isPlayingRef.current = false;
        playNextAudio();
      });
    } catch {
      isPlayingRef.current = false;
      playNextAudio();
    }
  }, []);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(
        `/api/poll?roomCode=${roomCode}&userId=${user.id}&language=${user.language}&since=${lastPollTimestamp.current}`
      );
      const data = await res.json();

      if (data.success) {
        // Update users list
        setUsers(data.users || []);

        // Add new messages and queue audio
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const newMessages = data.messages.filter(
              (m: Message) => !prev.some((p) => p.id === m.id)
            );
            return [...prev, ...newMessages].slice(-20); // Keep last 20
          });

          // Queue audio for playback
          for (const msg of data.messages) {
            if (msg.audio) {
              audioQueueRef.current.push(msg.audio);
            }
          }
          playNextAudio();
        }

        lastPollTimestamp.current = data.timestamp || Date.now();
      }
    } catch {
      // Silently fail on poll errors
    }
  }, [user, roomCode, playNextAudio]);

  // Start polling when user is loaded
  useEffect(() => {
    if (!user) return;

    // Initial poll
    pollMessages();

    // Poll every 1 second
    pollIntervalRef.current = setInterval(pollMessages, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user, pollMessages]);

  // Handle push-to-talk
  const handleRecordStart = async () => {
    setError('');
    await startRecording();
  };

  const handleRecordStop = async () => {
    if (!user) return;

    setIsProcessing(true);
    setStatus('Processing your message...');

    try {
      const audioBlob = await stopRecording();
      if (!audioBlob) {
        throw new Error('No audio recorded');
      }

      setStatus('Transcribing...');

      // Send to API for processing
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.pcm');
      formData.append('roomCode', roomCode);
      formData.append('userId', user.id);
      formData.append('language', user.language);

      const res = await fetch('/api/audio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      setStatus(`Sent: "${data.originalText}"`);

      // Clear status after a moment
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process audio');
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (user) {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          roomCode,
          userId: user.id,
        }),
      });
      sessionStorage.removeItem('townhall_user');
    }
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">TownHall</h1>
            <p className="text-white/60 text-sm">
              Room: <span className="font-mono">{roomCode}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white text-sm">{user.name}</p>
              <p className="text-white/60 text-xs">
                {SUPPORTED_LANGUAGES[user.language]}
              </p>
            </div>
            <button
              onClick={leaveRoom}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col md:flex-row gap-4">
        {/* Users Panel */}
        <div className="md:w-64 space-y-4">
          <PremiumBanner />
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h2 className="text-white/80 font-medium mb-3">
              In Room ({users.length})
            </h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className={`p-2 rounded-lg ${
                  u.id === user.id ? 'bg-purple-500/20' : 'bg-white/5'
                }`}
              >
                <p className="text-white text-sm">{u.name}</p>
                <p className="text-white/50 text-xs">
                  {SUPPORTED_LANGUAGES[u.language]}
                </p>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Messages */}
          <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10 overflow-y-auto min-h-[300px]">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/40">
                <p>Messages will appear here when others speak</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-purple-300 font-medium text-sm">
                        {msg.senderName}
                      </span>
                      <span className="text-white/30 text-xs">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-white/80 text-sm">{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            {/* Error display */}
            {(error || recorderError) && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
                {error || recorderError}
              </div>
            )}

            {/* Status display */}
            {status && (
              <div className="mb-4 p-3 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-300 text-sm">
                {status}
              </div>
            )}

            {/* Push to talk button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onMouseDown={handleRecordStart}
                onMouseUp={handleRecordStop}
                onTouchStart={handleRecordStart}
                onTouchEnd={handleRecordStop}
                disabled={isProcessing}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
                    : isProcessing
                    ? 'bg-purple-500/50 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 hover:scale-105'
                }`}
              >
                <div className="text-center">
                  {isRecording ? (
                    <>
                      <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-white animate-pulse" />
                      <span className="text-white text-xs">Recording...</span>
                    </>
                  ) : isProcessing ? (
                    <>
                      <div className="w-8 h-8 mx-auto mb-1 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-white/60 text-xs">Processing</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-10 h-10 mx-auto mb-1 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                      <span className="text-white text-xs">Hold to Talk</span>
                    </>
                  )}
                </div>
              </button>

              <p className="text-white/40 text-sm">
                Hold the button and speak in{' '}
                {SUPPORTED_LANGUAGES[user.language]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
