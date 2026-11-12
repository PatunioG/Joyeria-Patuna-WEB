import React from "react";
import { motion } from "motion/react";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

export default function BrandLogo({ className = "", size = "md", animated = true }: BrandLogoProps) {
  const dimensions = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-28 h-28",
    xl: "w-44 h-44"
  };

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`} id="brand-logo-container">
      <motion.div
        className={`relative ${dimensions[size]}`}
        animate={animated ? {
          y: [0, -4, 0],
        } : {}}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Double Gold Orbit Rings */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          style={{ filter: "drop-shadow(0 0 8px rgba(212, 175, 55, 0.35))" }}
        >
          {/* Outer Ring */}
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#d4af37"
            strokeWidth="1"
            fill="none"
            opacity="0.4"
          />
          {/* Intersecting dotted inner orbit */}
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="#b8860b"
            strokeWidth="0.75"
            strokeDasharray="3 3"
            fill="none"
          />

          {/* Premium Stylized Golden Duck Mascot (Line-art & gold geometry) */}
          <g transform="translate(18, 20) scale(0.65)" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Crown detailing on the golden duck */}
            <path
              d="M 40,25 L 45,15 L 50,22 L 55,15 L 60,25 Z"
              fill="#d4af37"
              stroke="#d4af37"
              strokeWidth="1.5"
            />
            {/* Crown pearls */}
            <circle cx="45" cy="15" r="1.5" fill="#ffffff" />
            <circle cx="55" cy="15" r="1.5" fill="#ffffff" />

            {/* Duck head and neck */}
            <path
              d="M 32,45 C 32,30 45,28 50,35 C 55,42 58,45 68,45"
              stroke="url(#goldGradient)"
              strokeWidth="3"
            />

            {/* Sharp beak */}
            <path
              d="M 32,45 L 22,48 L 31,52"
              fill="url(#goldGradient)"
              stroke="#b8860b"
              strokeWidth="1.5"
            />

            {/* Eye (Diamond sparkle) */}
            <path
              d="M 44,40 L 46,37 L 48,40 L 46,43 Z"
              fill="#ffffff"
              stroke="#d4af37"
              strokeWidth="0.5"
            />

            {/* Sleek, streamlined body resembling a high-end luxury emblem */}
            <path
              d="M 31,52 C 22,65 25,85 45,85 C 65,85 75,70 82,55 C 85,50 82,45 78,45 C 65,45 60,52 48,52"
              stroke="url(#goldGradient)"
              strokeWidth="3.5"
              fill="rgba(212, 175, 55, 0.05)"
            />

            {/* Wing details (Elegantly sweeping gold waves) */}
            <path
              d="M 44,58 C 52,58 65,65 70,52 C 60,65 48,64 40,64"
              stroke="url(#goldGradient)"
              strokeWidth="2"
            />
            <path
              d="M 48,68 C 54,68 62,72 65,64 C 58,72 48,72 44,70"
              stroke="#b8860b"
              strokeWidth="1.5"
            />
          </g>

          {/* Sparkles around logo */}
          <g fill="#ffffff">
            <path d="M 80,25 L 82,22 L 80,19 L 78,22 Z" opacity="0.8"/>
            <path d="M 18,75 L 19,72 L 18,69 L 17,72 Z" opacity="0.6"/>
          </g>

          {/* Gradients declaration */}
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbf2c0" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#b8860b" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </div>
  );
}
