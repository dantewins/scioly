"use client"

import { useEffect, useSyncExternalStore } from "react"
import { IconBaselineDensitySmall, IconBaselineDensityLarge } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  applyDensityPreference,
  readDensityPreference,
  subscribeDensityPreference,
  writeDensityPreference,
  type DensityPreference,
} from "@/lib/ui-preferences"

export function DensityToggle() {
  const density = useSyncExternalStore(
    subscribeDensityPreference,
    readDensityPreference,
    () => "comfortable" as DensityPreference,
  )

  useEffect(() => {
    applyDensityPreference(density)
  }, [density])

  function toggle() {
    writeDensityPreference(density === "comfortable" ? "compact" : "comfortable")
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={toggle} className="size-8 text-muted-foreground hover:text-foreground">
            {density === "comfortable"
              ? <IconBaselineDensitySmall className="size-4" />
              : <IconBaselineDensityLarge className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Switch to {density === "comfortable" ? "compact" : "comfortable"} density
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
