"use client"

export type ThemePreference = "light" | "dark"
export type DensityPreference = "comfortable" | "compact"

const THEME_STORAGE_KEY = "theme"
const DENSITY_STORAGE_KEY = "density"

const themeListeners = new Set<() => void>()
const densityListeners = new Set<() => void>()

function notify(listeners: Set<() => void>) {
  for (const listener of listeners) {
    listener()
  }
}

function subscribeToPreference(
  listeners: Set<() => void>,
  storageKey: string,
  callback: () => void,
) {
  listeners.add(callback)

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === storageKey) {
      callback()
    }
  }

  window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(callback)
    window.removeEventListener("storage", onStorage)
  }
}

export function readThemePreference(): boolean {
  if (typeof window === "undefined") return false

  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  return stored === "dark" || (!stored && prefersDark)
}

export function applyThemePreference(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark)
}

export function writeThemePreference(isDark: boolean) {
  if (typeof window === "undefined") return

  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light")
  applyThemePreference(isDark)
  notify(themeListeners)
}

export function subscribeThemePreference(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  return subscribeToPreference(themeListeners, THEME_STORAGE_KEY, callback)
}

export function readDensityPreference(): DensityPreference {
  if (typeof window === "undefined") return "comfortable"

  const stored = localStorage.getItem(DENSITY_STORAGE_KEY)
  return stored === "compact" ? "compact" : "comfortable"
}

export function applyDensityPreference(density: DensityPreference) {
  document.documentElement.setAttribute("data-density", density)
}

export function writeDensityPreference(density: DensityPreference) {
  if (typeof window === "undefined") return

  localStorage.setItem(DENSITY_STORAGE_KEY, density)
  applyDensityPreference(density)
  notify(densityListeners)
}

export function subscribeDensityPreference(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  return subscribeToPreference(densityListeners, DENSITY_STORAGE_KEY, callback)
}
