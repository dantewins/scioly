import type { ReactNode } from "react"

interface ShinyTextProps {
  children: ReactNode
  speed?: number
  className?: string
  disabled?: boolean
}

export function ShinyText({ children, speed = 5, className = "", disabled = false }: ShinyTextProps) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={
        disabled
          ? {}
          : {
              backgroundImage:
                "linear-gradient(120deg, currentColor 40%, rgba(255,255,255,0.85) 50%, currentColor 60%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              animation: `shiny-sweep ${speed}s linear infinite`,
            }
      }
    >
      {children}
    </span>
  )
}
