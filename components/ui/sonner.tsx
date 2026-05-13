"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      offset={20}
      gap={10}
      visibleToasts={4}
      // No tone-colored icons — text and icon share one color.
      icons={{ success: null, info: null, warning: null, error: null, loading: null }}
      toastOptions={{
        classNames: {
          toast:
            "group toast relative overflow-hidden border border-azure-200/70 " +
            "bg-gradient-to-br from-azure-50 via-card to-azure-100/60 " +
            "text-foreground shadow-azure-soft backdrop-blur-sm " +
            "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-azure-500",
          title: "font-serif text-base leading-tight tracking-tight text-foreground pl-2",
          description: "text-xs text-muted-foreground pl-2 mt-1",
          actionButton:
            "bg-azure-600 text-white hover:bg-azure-700 rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium",
          cancelButton:
            "bg-muted text-muted-foreground hover:bg-muted/80 rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium",
          closeButton:
            "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent",
          success: "",
          info: "",
          warning: "",
          error: "",
          loading: "",
        },
      }}
      style={
        {
          "--normal-bg": "transparent",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--azure-300)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
