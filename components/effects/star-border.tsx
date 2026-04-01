"use client"

import type { ReactNode, CSSProperties } from "react"

interface StarBorderProps {
  children: ReactNode
  color?: string
  speed?: string
  thickness?: number
  className?: string
  style?: CSSProperties
}

export function StarBorder({
  children,
  color = "oklch(0.65 0.18 254 / 0.9)",
  speed = "6s",
  thickness = 1,
  className = "",
  style,
}: StarBorderProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ padding: `${thickness}px`, ...style }}
    >
      <div
        className="pointer-events-none absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animation: `star-movement-bottom ${speed} linear infinite`,
        }}
      />
      <div
        className="pointer-events-none absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full z-0"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animation: `star-movement-top ${speed} linear infinite`,
        }}
      />
      <div className={`relative z-[1] bg-card rounded-[calc(1rem-1px)] ${className}`}>
        {children}
      </div>
    </div>
  )
}
