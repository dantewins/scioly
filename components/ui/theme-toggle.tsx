"use client"

import { useEffect, useSyncExternalStore } from "react"
import { IconSun, IconMoon } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  applyThemePreference,
  readThemePreference,
  subscribeThemePreference,
  writeThemePreference,
} from "@/lib/ui-preferences"

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    () => false,
  )

  useEffect(() => {
    applyThemePreference(dark)
  }, [dark])

  function toggle() {
    writeThemePreference(!dark)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={toggle} className="size-8 text-muted-foreground hover:text-foreground">
            {dark ? <IconSun className="size-4" /> : <IconMoon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{dark ? "Light mode" : "Dark mode"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
