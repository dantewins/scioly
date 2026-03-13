"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

const START_EVENT = "dashboard:navigation-start"

export function TopProgressBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const finishingRef = useRef<NodeJS.Timeout | null>(null)
  const startedRef = useRef(false)

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (finishingRef.current) clearTimeout(finishingRef.current)
    intervalRef.current = null
    finishingRef.current = null
  }

  const start = () => {
    clearTimers()
    startedRef.current = true
    setVisible(true)
    setProgress(12)

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 82) return prev
        const next = prev + Math.random() * 12
        return Math.min(next, 82)
      })
    }, 180)
  }

  const done = () => {
    if (!startedRef.current) return

    clearTimers()
    setProgress(100)

    finishingRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
      startedRef.current = false
    }, 250)
  }

  useEffect(() => {
    const handleStart = () => start()
    window.addEventListener(START_EVENT, handleStart)

    return () => {
      window.removeEventListener(START_EVENT, handleStart)
      clearTimers()
    }
  }, [])

  useEffect(() => {
    done()
  }, [pathname])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-primary transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  )
}

export function startDashboardProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT))
  }
}