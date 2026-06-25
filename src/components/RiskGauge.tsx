/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface RiskGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskGauge({ score, size = 'md' }: RiskGaugeProps) {
  // Dimensions based on size
  const getDims = () => {
    switch (size) {
      case 'sm': return { width: 100, radius: 40, strokeWidth: 8, center: 50 };
      case 'lg': return { width: 220, radius: 90, strokeWidth: 14, center: 110 };
      default: return { width: 160, radius: 65, strokeWidth: 10, center: 80 };
    }
  };

  const { width, radius, strokeWidth, center } = getDims();
  const circumference = 2 * Math.PI * radius;
  
  // We'll draw a semi-circle dial or a 3/4 circle dial. Let's use a 3/4 circle dial for standard speedometer look.
  const angleStart = 135; // Start angle
  const angleLength = 270; // 3/4 of a circle
  
  // Stroke Dash calculations
  const strokeDasharray = `${circumference} ${circumference}`;
  // We offset based on percentage score (0 to 100)
  const percentOffset = ((100 - score) / 100) * (circumference * (angleLength / 360));
  const strokeDashoffset = percentOffset + (circumference * ((360 - angleLength) / 360));

  // Determine color matching risk bands:
  // 0–39 Safe (green), 40–79 Warning (amber), 80–100 Crisis (red)
  const getRiskColor = (s: number) => {
    if (s >= 80) return '#FF3B5C'; // Crisis Red
    if (s >= 40) return '#FFB800'; // Warning Amber
    return '#00E676'; // Neon Green
  };

  const riskColor = getRiskColor(score);
  const needleAngle = -135 + (score / 100) * angleLength;

  return (
    <div className="flex flex-col items-center select-none" style={{ width: `${width}px` }}>
      <div className="relative" style={{ width: `${width}px`, height: `${width}px` }}>
        
        {/* SVG Dial base */}
        <svg width={width} height={width} viewBox={`0 0 ${width} ${width}`} className="transform rotate-0">
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E676" />
              <stop offset="50%" stopColor="#FFB800" />
              <stop offset="100%" stopColor="#FF3B5C" />
            </linearGradient>
            
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background track circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#162537"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={circumference * ((360 - angleLength) / 360)}
            strokeLinecap="round"
            transform={`rotate(${angleStart} ${center} ${center})`}
          />

          {/* Active colored rating indicator bar */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#gauge-grad)"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            strokeLinecap="round"
            transform={`rotate(${angleStart} ${center} ${center})`}
            filter={score >= 80 ? "url(#glow-filter)" : undefined}
          />
        </svg>

        {/* Pointer Needle */}
        <motion.div
          className="absolute inset-0 flex justify-center items-center"
          style={{ originX: '50%', originY: '50%' }}
          initial={{ rotate: -135 }}
          animate={{ rotate: needleAngle }}
          transition={{ type: 'spring', stiffness: 50, damping: 14 }}
        >
          {/* Futuristic needle needle vector */}
          <div className="relative w-full h-full">
            <div 
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{
                top: size === 'lg' ? '24px' : '18px',
                width: '3px',
                height: size === 'lg' ? '80px' : '55px',
                background: riskColor,
                boxShadow: `0 0 10px ${riskColor}`,
                transformOrigin: 'bottom center',
              }}
            />
          </div>
        </motion.div>

        {/* Center hub indicator with numerical risk score value */}
        <div className="absolute inset-0 flex flex-col justify-center items-center pt-6">
          <motion.span 
            className={`font-mono font-bold leading-none select-none tracking-tight
              ${size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-xl' : 'text-3xl'}
            `}
            style={{ color: riskColor, textShadow: score >= 80 ? `0 0 15px ${riskColor}55` : 'none' }}
          >
            {score}
          </motion.span>
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">
            Risk Score
          </span>
        </div>
      </div>
    </div>
  );
}
