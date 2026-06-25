/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Key, ArrowRight, MonitorPlay } from 'lucide-react';
import AvatarPicker, { AVATAR_OPTIONS } from '../components/AvatarPicker';
import { firebaseService } from '../services/firebase';

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

  const currentAvatarColor = AVATAR_OPTIONS.find((a) => a.id === avatarId)?.color || '#7B61FF';

  return (
    <div className="relative min-h-screen w-full bg-[#0D1B2A] flex flex-col justify-center items-center px-4 overflow-hidden font-sans">
      
      {/* Particle background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {activeDots.map((dot, index) => (
          <div
            key={index}
            className="absolute w-1 h-1 bg-slate-500 rounded-full animate-pulse"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              animationDelay: `${dot.delay}s`,
              animationDuration: '3s',
            }}
          />
        ))}
      </div>

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
            className="flex flex-col items-center text-center max-w-lg select-none"
          >
            {/* Urgency Centerpiece: Rotating HUD gears */}
            <div className="relative w-72 h-72 flex justify-center items-center mb-8">
              {/* Outer rotating neon tracker ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-[#00D4FF]/20 animate-[spin_40s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-slate-800" />
              <div className="absolute inset-6 rounded-full border-2 border-transparent border-t-[#7B61FF]/40 border-b-[#00E676]/40 animate-[spin_20s_linear_infinite]" />
              
              {/* Giant number displaying live task density */}
              <div className="absolute flex flex-col items-center">
                <span className="text-[120px] md:text-[140px] font-space font-bold tracking-tighter text-slate-100 leading-none drop-shadow-[0_0_35px_rgba(255,255,255,0.15)] select-none">
                  04
                </span>
              </div>

              {/* Pulsing alarm border dots */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FF3B5C] rounded-full animate-ping" />
            </div>

            <h1 className="text-3xl md:text-4xl font-space font-bold tracking-tight text-[#00D4FF] mb-2 uppercase">
              CLUTCH
            </h1>
            <p className="text-amber-500 font-sans italic text-sm tracking-widest mb-10 uppercase">
              Your deadlines are watching.
            </p>

            <motion.button
              id="get-started-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSetup(true)}
              className="px-10 py-4 bg-gradient-to-r from-[#00D4FF] to-[#7B61FF] hover:from-[#00D4FF] hover:to-[#00D4FF] text-[#0D1B2A] font-space font-bold uppercase rounded-lg tracking-wider transition-all duration-300 shadow-[0_0_30px_rgba(0,212,255,0.4)] cursor-pointer"
            >
              Initialize System
            </motion.button>
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
            className="w-full max-w-xl bg-[#0F1D30]/85 border border-[#1F334E] rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative"
          >
            {/* Quick Back Arrow */}
            <button
              id="back-splash-btn"
              onClick={() => setShowSetup(false)}
              className="absolute top-6 left-6 text-slate-500 hover:text-[#00D4FF] transition-colors cursor-pointer text-sm font-mono tracking-wider uppercase"
            >
              &larr; Reset
            </button>

            {/* Title */}
            <div className="text-center mb-6 pt-4">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                Operator Configuration
              </span>
              <h2 className="text-2xl font-space font-bold mt-3 text-slate-100 uppercase tracking-tight">
                Establish Credentials
              </h2>
            </div>

            {/* Centerpiece Large Avatar Preview with animated frames */}
            <div className="flex justify-center mb-6">
              <div className="relative p-2 rounded-full bg-[#0A121E]">
                {/* Glowing border rings matching selected avatar */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-dashed opacity-40 animate-[spin_30s_linear_infinite]"
                  style={{ borderColor: currentAvatarColor }}
                />
                <div
                  className="absolute inset-1.5 rounded-full border-2 opacity-30 animate-[ping_3s_ease-in-out_infinite]"
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
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">
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
                  className="w-full px-4 py-3 bg-[#132435] border border-[#21354A] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-all font-sans"
                />
              </div>

              {/* Avatar options picker */}
              <div className="space-y-3">
                <label className="block text-center text-xs font-mono uppercase tracking-wider text-slate-400">
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
                  className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs font-mono rounded-lg text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* CTA Action Splitter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* 1. DEMO MODE ENTRY (HIGHEST PRIORITY) */}
                <button
                  id="demo-login-btn"
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#00E676] to-[#00D4FF] text-[#0D1B2A] font-space font-bold uppercase rounded-lg tracking-wider transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,230,118,0.3)] disabled:opacity-50 cursor-pointer text-xs"
                >
                  {isLoggingIn ? (
                    <div className="w-4 h-4 border-2 border-[#0D1B2A] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <MonitorPlay size={14} />
                      Enter Demo Mode
                    </>
                  )}
                </button>

                {/* 2. GOOGLE AUTHENTICATION UI (FULLY IMPLEMENTED PATH) */}
                <button
                  id="google-login-btn"
                  type="button"
                  disabled={isLoggingIn}
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#14253A] border border-[#2B425A] hover:border-[#7B61FF] text-slate-100 font-space font-semibold uppercase rounded-lg tracking-wider transition-all duration-300 hover:shadow-[0_0_15px_rgba(123,97,255,0.2)] disabled:opacity-50 cursor-pointer text-xs"
                >
                  <Key size={14} className="text-[#7B61FF]" />
                  Google Sign-In
                </button>
              </div>

              {/* Security footprint footer */}
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500 text-center pt-2 select-none">
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
