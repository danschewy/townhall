"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES, LanguageCode } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      // Create room
      const createRes = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });

      const createData = await createRes.json();
      if (!createData.success) {
        throw new Error(createData.error);
      }

      // Join the room
      const joinRes = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
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
        "townhall_user",
        JSON.stringify({
          id: joinData.userId,
          name: name.trim(),
          language,
          roomCode: createData.roomCode,
        })
      );

      router.push(`/room/${createData.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
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
        "townhall_user",
        JSON.stringify({
          id: data.userId,
          name: name.trim(),
          language,
          roomCode: data.roomCode,
        })
      );

      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Demo Video & GitHub Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <a
            href="https://loom.com/share/9719e198cb654d5fa810307ae3c00f33"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-400 hover:via-red-400 hover:to-orange-400 text-white font-bold rounded-full shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105 animate-pulse hover:animate-none"
          >
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Watch Demo</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
              2 min
            </span>
          </a>
          <a
            href="https://github.com/danschewy/townhall"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-white font-bold rounded-full shadow-lg shadow-gray-900/50 hover:shadow-gray-700/50 border border-gray-600 transition-all duration-300 hover:scale-105"
          >
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>View Source</span>
            <svg
              className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">VoiceLink</h1>
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
            {isCreating ? "Creating..." : "Create New Room"}
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
            {isJoining ? "Joining..." : "Join Room"}
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
