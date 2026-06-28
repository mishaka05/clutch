/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export interface AvatarOption {
  id: string;
  name: string;
  color: string;
  glowClass: string;
  borderColor: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'purple', name: 'Oracle', color: '#8B5CF6', glowClass: 'glow-purple', borderColor: 'border-[#8B5CF6]' },
  { id: 'cyan', name: 'Specter', color: '#38BDF8', glowClass: 'glow-cyan', borderColor: 'border-[#38BDF8]' },
  { id: 'green', name: 'Ghost', color: '#22C55E', glowClass: 'glow-green', borderColor: 'border-[#22C55E]' },
  { id: 'amber', name: 'Viper', color: '#FBBF24', glowClass: 'glow-amber', borderColor: 'border-[#FBBF24]' }
];

interface AvatarPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  interactive?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function AvatarPicker({ selectedId, onSelect, interactive = true, size = 'md' }: AvatarPickerProps) {
  
  const getDimensions = () => {
    switch (size) {
      case 'xs': return 'w-7 h-7';
      case 'sm': return 'w-12 h-12';
      case 'md': return 'w-20 h-20';
      case 'lg': return 'w-32 h-32';
      case 'xl': return 'w-48 h-48 md:w-56 md:h-56';
      default: return 'w-20 h-20';
    }
  };

  return (
    <div className={`flex ${interactive ? 'flex-wrap justify-center gap-4' : 'justify-center'}`}>
      {AVATAR_OPTIONS.map((avatar) => {
        const isSelected = avatar.id === selectedId;
        if (!interactive && !isSelected) return null;

        return (
          <div key={avatar.id} className="relative flex flex-col items-center">
            <button
              id={`avatar-btn-${avatar.id}`}
              onClick={() => interactive && onSelect(avatar.id)}
              disabled={!interactive}
              className={`
                relative rounded-full overflow-hidden transition-all duration-300 bg-[#0A121E] border-2
                ${getDimensions()}
                ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
                ${isSelected ? `${avatar.borderColor} shadow-[0_0_20px_rgba(0,0,0,0.4)]` : 'border-slate-800 opacity-60 hover:opacity-100'}
              `}
              style={{
                boxShadow: isSelected ? `0 0 25px ${avatar.color}33` : 'none'
              }}
            >
              {/* Dynamic SVG Avatars */}
              <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                {/* Background Pattern */}
                <defs>
                  <linearGradient id={`grad-${avatar.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0B132B" />
                    <stop offset="100%" stopColor={isSelected ? avatar.color : '#1C2541'} stopOpacity="0.4" />
                  </linearGradient>
                  
                  {/* Cyber grid clipping */}
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#2C3A5A" strokeWidth="0.5" opacity="0.15"/>
                  </pattern>
                </defs>

                <circle cx="50" cy="50" r="48" fill={`url(#grad-${avatar.id})`} />
                <circle cx="50" cy="50" r="48" fill="url(#grid)" />

                {/* Ambient glow details */}
                <circle cx="50" cy="50" r="38" fill="none" stroke={avatar.color} strokeWidth="0.5" strokeDasharray="3 3" opacity={isSelected ? 0.6 : 0.2} />

                {/* PRESENTS */}
                {avatar.id === 'purple' && (
                  /* ORACLE - Cyber Goth Princess (Matches reference girl) */
                  <g>
                    {/* Background elements */}
                    <circle cx="50" cy="45" r="28" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.3" />
                    <path d="M22 45 L78 45" stroke="#8B5CF6" strokeWidth="0.5" opacity="0.2" />
                    <path d="M50 17 L50 73" stroke="#8B5CF6" strokeWidth="0.5" opacity="0.2" />
                    
                    {/* Space Buns */}
                    <circle cx="34" cy="30" r="8" fill="#1A1F3C" stroke="#8B5CF6" strokeWidth="1.5" />
                    <circle cx="34" cy="30" r="4" fill="#8B5CF6" opacity="0.8" />
                    
                    <circle cx="66" cy="30" r="8" fill="#1A1F3C" stroke="#8B5CF6" strokeWidth="1.5" />
                    <circle cx="66" cy="30" r="4" fill="#8B5CF6" opacity="0.8" />
                    
                    {/* Hair strands */}
                    <path d="M30 40 Q40 25 50 25 T70 40" fill="none" stroke="#4C3D8C" strokeWidth="14" strokeLinecap="round" />
                    <path d="M30 40 Q40 25 50 25 T70 40" fill="none" stroke="#8B5CF6" strokeWidth="10" strokeLinecap="round" />
                    
                    {/* Face Base */}
                    <path d="M36 40 L64 40 L60 62 Q50 74 40 62 Z" fill="#EAD9FF" />
                    
                    {/* Eyes and Visor/Cyber Details */}
                    <path d="M38 46 H62" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="43" cy="46" r="1.5" fill="#FFFFFF" />
                    <circle cx="57" cy="46" r="1.5" fill="#FFFFFF" />
                    
                    {/* Cheek neon decals */}
                    <path d="M37 54 L41 58" stroke="#8B5CF6" strokeWidth="1.5" />
                    <path d="M63 54 L59 58" stroke="#8B5CF6" strokeWidth="1.5" />
                    
                    {/* Hair overlay */}
                    <path d="M30 38 Q34 50 34 62" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                    <path d="M70 38 Q66 50 66 62" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                    
                    {/* Futuristic High Collar Clothes */}
                    <path d="M32 72 L68 72 L66 84 Q50 90 34 84 Z" fill="#131422" stroke="#8B5CF6" strokeWidth="1" />
                    <path d="M42 72 L42 85 M58 72 L58 85" stroke="#FF6B6B" strokeWidth="1.5" opacity="0.8" />
                  </g>
                )}

                {avatar.id === 'cyan' && (
                  /* SPECTER - Neon Hacker */
                  <g>
                    {/* Tech triangles behind */}
                    <polygon points="50,15 80,68 20,68" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.25" />
                    
                    {/* Spiky cyber hair */}
                    <path d="M28 42 L35 24 L50 20 L65 24 L72 42" fill="none" stroke="#0A4C5C" strokeWidth="12" strokeLinecap="round" />
                    <path d="M28 42 L35 24 L50 20 L65 24 L72 42" fill="none" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />

                    {/* Face Base */}
                    <path d="M38 42 L62 42 L58 64 Q50 75 42 64 Z" fill="#E1FAFF" />

                    {/* Asymmetric Cyber visor */}
                    <path d="M34 44 L66 42 Q64 54 50 54 T34 44 Z" fill="#0A1E2B" stroke="#38BDF8" strokeWidth="1.5" />
                    <path d="M38 47 L62 45" stroke="#38BDF8" strokeWidth="2" />
                    
                    {/* Audio Earphones */}
                    <rect x="28" y="44" width="6" height="12" rx="3" fill="#38BDF8" />
                    <rect x="66" y="44" width="6" height="12" rx="3" fill="#38BDF8" />
                    <path d="M34 44 Q50 30 66 44" fill="none" stroke="#38BDF8" strokeWidth="2" opacity="0.6" />

                    {/* Cyber neck connector */}
                    <rect x="47" y="65" width="6" height="10" fill="#0A4C5C" />
                    <path d="M35 74 L65 74 L60 88 Q50 94 40 88 Z" fill="#0C1923" stroke="#38BDF8" strokeWidth="1" />
                  </g>
                )}

                {avatar.id === 'green' && (
                  /* GHOST - Bio-Matrix Engineer */
                  <g>
                    {/* Hexagon behind */}
                    <polygon points="50,16 75,30 75,60 50,74 25,60 25,30" fill="none" stroke="#22C55E" strokeWidth="0.8" opacity="0.3" />
                    
                    {/* Sleek helmet-buns hair */}
                    <circle cx="30" cy="35" r="7" fill="#0E2F1F" stroke="#22C55E" strokeWidth="1" />
                    <circle cx="70" cy="35" r="7" fill="#0E2F1F" stroke="#22C55E" strokeWidth="1" />
                    <path d="M30 35 Q50 20 70 35" fill="none" stroke="#22C55E" strokeWidth="6" />

                    {/* Face Base */}
                    <path d="M38 38 L62 38 L59 62 Q50 72 41 62 Z" fill="#E6FFFA" />

                    {/* Matrix style circular visor */}
                    <rect x="33" y="42" width="34" height="8" rx="4" fill="#00381B" stroke="#22C55E" strokeWidth="1.5" />
                    <circle cx="41" cy="46" r="2.5" fill="#22C55E" />
                    <circle cx="59" cy="46" r="2.5" fill="#22C55E" />
                    <line x1="45" y1="46" x2="55" y2="46" stroke="#22C55E" strokeWidth="1" strokeDasharray="1 1" />

                    {/* Neck and tactical vest */}
                    <path d="M34 70 L66 70 L63 88 Q50 93 37 88 Z" fill="#13241C" stroke="#22C55E" strokeWidth="1" />
                    <circle cx="50" cy="78" r="3" fill="#22C55E" />
                  </g>
                )}

                {avatar.id === 'amber' && (
                  /* VIPER - Void Runner */
                  <g>
                    {/* Angular speed lines behind */}
                    <path d="M15 35 L40 18 M85 35 L60 18" stroke="#FBBF24" strokeWidth="1.5" opacity="0.3" />
                    <path d="M12 55 L35 48 M88 55 L65 48" stroke="#FBBF24" strokeWidth="1" opacity="0.2" />

                    {/* High ponytail */}
                    <path d="M50 25 Q70 10 82 28 Q70 40 50 35" fill="#1A1408" stroke="#FBBF24" strokeWidth="1" />

                    {/* Face Base */}
                    <path d="M38 38 L62 38 L58 61 Q50 72 42 61 Z" fill="#FFF6EA" />

                    {/* Futuristic Amber Goggles */}
                    <polygon points="34,42 66,42 61,51 39,51" fill="#291D00" stroke="#FBBF24" strokeWidth="1.5" />
                    <polygon points="38,44 62,44 58,49 42,49" fill="#FBBF24" opacity="0.8" />

                    {/* Neck and flight jacket */}
                    <rect x="47" y="61" width="6" height="10" fill="#3A2D13" />
                    <path d="M32 71 L68 71 L65 89 Q50 93 35 89 Z" fill="#201A0E" stroke="#FBBF24" strokeWidth="1.2" />
                    <path d="M48 71 L42 89 M52 71 L58 89" stroke="#38BDF8" strokeWidth="1.5" opacity="0.6" />
                  </g>
                )}
              </svg>
            </button>
            {interactive && (
              <span className={`text-[11px] uppercase mt-1 font-mono tracking-wider ${isSelected ? 'text-[#38BDF8] font-semibold' : 'text-slate-500'}`}>
                {avatar.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
