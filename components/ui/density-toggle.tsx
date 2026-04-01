"use client"

import { useEffect, useState } from "react"
import { IconBaselineDensitySmall, IconBaselineDensityLarge } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

type Density = "comfortable" | "compact"

export function DensityToggle() {
  const [density, setDensity] = useState<Density>("comfortable")

  useEffect(() => {
    const stored = localStorage.getItem("density") as Density | null
    if (stored === "comfortable" || stored === "compact") {
      setDensity(stored)
      document.documentElement.setAttribute("data-density", stored)
    }
  }, [])

  function toggle() {
    const next: Density = density === "comfortable" ? "compact" : "comfortable"
    setDensity(next)
    localStorage.setItem("density", next)
    document.documentElement.setAttribute("data-density", next)
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
