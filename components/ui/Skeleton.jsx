"use client";

// Skeleton primitive: a pulsing placeholder block.
export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />;
}