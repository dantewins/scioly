"use client"

import { useEffect, useRef } from "react"

interface Star {
  x: number
  y: number
  radius: number
  opacity: number
  twinkleSpeed: number
  direction: number
}

export function StarField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animFrame: number
    const stars: Star[] = []

    function init() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      stars.length = 0
      const count = Math.floor((canvas.width * canvas.height) / 2500)
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.1 + 0.2,
          opacity: Math.random() * 0.6 + 0.1,
          twinkleSpeed: Math.random() * 0.006 + 0.002,
          direction: Math.random() > 0.5 ? 1 : -1,
        })
      }
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const star of stars) {
        star.opacity += star.twinkleSpeed * star.direction
        if (star.opacity >= 0.75 || star.opacity <= 0.05) star.direction *= -1
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()
      }
      animFrame = requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(init)
    observer.observe(canvas)

    init()
    draw()

    return () => {
      cancelAnimationFrame(animFrame)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
    />
  )
}
