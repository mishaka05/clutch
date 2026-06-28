/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Key, ArrowRight, MonitorPlay } from 'lucide-react';
import AvatarPicker, { AVATAR_OPTIONS } from '../components/AvatarPicker';
import { firebaseService } from '../services/firebase';
import Button from '../components/Button';

interface LandingProps {
  onLoginSuccess: () => void;
}

export default function Landing({ onLoginSuccess }: LandingProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('purple');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeDots, setActiveDots] = useState<{ x: number; y: number; delay: number }[]>([]);

  // Generate subtle random particle background dots
  useEffect(() => {
    (window as any).cloverAnimationStartTime = Date.now();
    const dots = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
    }));
    setActiveDots(dots);
  }, []);

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Operator identification required.');
      return;
    }
    setError('');
    setIsLoggingIn(true);
    
    // Slight delay for mechanical server feedback
    setTimeout(async () => {
      try {
        await firebaseService.signInAsDemo(name, avatarId);
        onLoginSuccess();
      } catch (err) {
        setError('Failed to initialize demo state.');
      } finally {
        setIsLoggingIn(false);
      }
    }, 800);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoggingIn(true);
    setTimeout(async () => {
      try {
        await firebaseService.signInWithGoogle();
        onLoginSuccess();
      } catch (err) {
        setError('Federated Google auth failed in this sandbox. Try entering Demo Mode!');
      } finally {
        setIsLoggingIn(false);
      }
    }, 600);
  };

  const currentAvatarColor = AVATAR_OPTIONS.find((a) => a.id === avatarId)?.color || '#8B5CF6';

  return (
    <div className="relative min-h-screen w-full bg-transparent flex flex-col justify-center items-center md:items-start md:pl-24 lg:pl-32 xl:pl-40 px-4 overflow-hidden font-sans">
      
      <AnimatePresence mode="wait">
        {!showSetup ? (
          /* ==========================================
             STAGE 1: SPLASH GREETING (INSPIRED BY PHOTO)
             ========================================== */
          <motion.div
            key="splash"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center md:items-start text-center md:text-left max-w-lg select-none"
          >
            {/* Urgency Centerpiece: Rotating HUD gears */}
            <div className="relative w-72 h-72 flex justify-center items-center mb-8">
              {/* Outer rotating neon tracker ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-[#8B5CF6]/20 animate-[spin_40s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-6 rounded-full border-2 border-transparent border-t-[#8B5CF6]/40 border-b-[#38BDF8]/40 animate-[spin_20s_linear_infinite]" />
              
              {/* Premium Minimalist Four-Leaf Clover Core */}
              <div className="absolute flex flex-col items-center justify-center">
                <svg
                  id="clover-logo-svg"
                  width="100%"
                  height="100%"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-36 h-36 md:w-40 md:h-40 select-none pointer-events-none drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  style={{ overflow: 'visible' }}
                >
                  <style>{`
                    @keyframes cloverRipple {
                      0% {
                        transform: scale(0.1);
                        stroke-opacity: 0.95;
                      }
                      20% {
                        stroke-opacity: 0.85;
                      }
                      100% {
                        transform: scale(12);
                        stroke-opacity: 0;
                      }
                    }
                    .animate-clover-ripple {
                      transform-origin: 50px 50px;
                      filter: drop-shadow(0 0 4px #00E676) blur(1px);
                      animation: cloverRipple 4.4s cubic-bezier(0.3, 0.1, 0.3, 1) infinite;
                    }
                  `}</style>
                  <defs>
                    <linearGradient id="clover-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9D6CFF" />
                      <stop offset="50%" stopColor="#7A5AF8" />
                      <stop offset="100%" stopColor="#5B8CFF" />
                    </linearGradient>
                  </defs>
                  {/* Soft energy ripples originating from center */}
                  <circle
                    cx="50"
                    cy="50"
                    r="10"
                    fill="none"
                    stroke="#00E676"
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                    className="animate-clover-ripple"
                    style={{ animationDelay: '0s' }}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="10"
                    fill="none"
                    stroke="#00E676"
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                    className="animate-clover-ripple"
                    style={{ animationDelay: '1.1s' }}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="10"
                    fill="none"
                    stroke="#00E676"
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                    className="animate-clover-ripple"
                    style={{ animationDelay: '2.2s' }}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="10"
                    fill="none"
                    stroke="#00E676"
                    strokeWidth="2.2"
                    vectorEffect="non-scaling-stroke"
                    className="animate-clover-ripple"
                    style={{ animationDelay: '3.3s' }}
                  />
                  {/* Base Clover Outline with gradient */}
                  <path
                    d="M 50 50 C 40 40, 32 30, 36 20 C 40 10, 48 14, 50 22 C 52 14, 60 10, 64 20 C 68 30, 60 40, 50 50 C 60 40, 70 32, 80 36 C 90 40, 86 48, 78 50 C 86 52, 90 60, 80 64 C 70 68, 60 60, 50 50 C 60 60, 68 70, 64 80 C 60 90, 52 86, 50 78 C 48 86, 40 90, 36 80 C 32 70, 40 60, 50 50 C 40 60, 30 68, 20 64 C 10 60, 14 52, 22 50 C 14 48, 10 40, 20 36 C 30 32, 40 40, 50 50 Z"
                    fill="none"
                    stroke="url(#clover-gradient)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Pulsing alarm border dots */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FF6B6B] rounded-full animate-ping" />
            </div>

            <h1 className="text-4xl md:text-5xl font-space font-extrabold tracking-tighter text-[#8B5CF6] mb-2 uppercase drop-shadow-[0_0_30px_rgba(139,92,246,0.4)]">
              CLUTCH
            </h1>
            <p className="text-amber-500 font-mono tracking-widest text-xs mb-10 uppercase font-semibold">
              // Your deadlines are watching.
            </p>

            <Button
              id="get-started-btn"
              onClick={() => setShowSetup(true)}
              variant="primary"
              size="lg"
            >
              Initialize System
            </Button>
          </motion.div>
        ) : (
          /* ==========================================
             STAGE 2: COGNITIVE ACCESS & CUSTOMIZER
             ========================================== */
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl bg-black/40 border border-white/[0.08] rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] flex flex-col relative"
          >
            {/* Quick Back Arrow */}
            <button
              id="back-splash-btn"
              onClick={() => setShowSetup(false)}
              className="absolute top-6 left-6 text-slate-500 hover:text-[#8B5CF6] transition-colors cursor-pointer text-xs font-mono tracking-wider uppercase font-bold"
            >
              &larr; Reset
            </button>

            {/* Title */}
            <div className="text-center mb-6 pt-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-white/[0.03] px-3.5 py-1.5 rounded-full border border-white/[0.06] backdrop-blur-sm">
                Operator Configuration
              </span>
              <h2 className="text-2xl font-space font-medium mt-4 text-white uppercase tracking-tight">
                Establish Credentials
              </h2>
            </div>

            {/* Centerpiece Large Avatar Preview with animated frames */}
            <div className="flex justify-center mb-6">
              <div className="relative p-2 rounded-full bg-slate-950/60 border border-white/[0.04]">
                {/* Glowing border rings matching selected avatar */}
                <div
                  className="absolute inset-0 rounded-full border border-dashed opacity-40 animate-[spin_30s_linear_infinite]"
                  style={{ borderColor: currentAvatarColor }}
                />
                <div
                  className="absolute inset-1.5 rounded-full border opacity-30 animate-[ping_3s_ease-in-out_infinite]"
                  style={{ borderColor: currentAvatarColor }}
                />
                
                <AvatarPicker
                  selectedId={avatarId}
                  onSelect={() => {}}
                  interactive={false}
                  size="lg"
                />
              </div>
            </div>

            {/* Customizer form */}
            <form onSubmit={handleDemoLogin} className="space-y-6">
              
              {/* Name field */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  User / Operator Name
                </label>
                <input
                  id="name-input"
                  type="text"
                  maxLength={18}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3.5 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/30 transition-all font-sans text-sm"
                />
              </div>

              {/* Avatar options picker */}
              <div className="space-y-3">
                <label className="block text-center text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  Select Visual Persona (Avatar)
                </label>
                <AvatarPicker
                  selectedId={avatarId}
                  onSelect={(id) => {
                    setAvatarId(id);
                    if (error) setError('');
                  }}
                  interactive={true}
                  size="md"
                />
              </div>

              {/* Error logs */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs font-mono rounded-xl text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* CTA Action Splitter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* 1. DEMO MODE ENTRY (HIGHEST PRIORITY) */}
                <Button
                  id="demo-login-btn"
                  type="submit"
                  disabled={isLoggingIn}
                  variant="primary"
                  size="md"
                  className="w-full"
                >
                  {isLoggingIn ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <MonitorPlay size={14} />
                      Enter Demo Mode
                    </>
                  )}
                </Button>

                {/* 2. GOOGLE AUTHENTICATION UI (FULLY IMPLEMENTED PATH) */}
                <Button
                  id="google-login-btn"
                  type="button"
                  disabled={isLoggingIn}
                  onClick={handleGoogleLogin}
                  variant="secondary"
                  size="md"
                  className="w-full"
                >
                  <Key size={14} className="text-[#8B5CF6]" />
                  Google Sign-In
                </Button>
              </div>

              {/* Security footprint footer */}
              <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-slate-500 text-center pt-2 select-none uppercase tracking-wider font-semibold">
                <Shield size={10} />
                <span>Authorized secure Sandbox. Auth keys encrypted.</span>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
