"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Drawer as DrawerPrimitive } from "vaul"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({ isMobile: false })

function ResponsiveDialog(props: React.ComponentProps<typeof DialogPrimitive.Root> & React.ComponentProps<typeof DrawerPrimitive.Root>) {
  const isMobile = useIsMobile()
  const Wrapper = isMobile ? Drawer : Dialog
  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      <Wrapper {...props} />
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  const Trigger = isMobile ? DrawerTrigger : DialogTrigger
  return <Trigger {...props} />
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  const Close = isMobile ? DrawerClose : DialogClose
  return <Close {...props} />
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) {
    return (
      <DrawerContent className={className}>
        <div className="max-h-[85vh] overflow-y-auto px-[var(--card-px)] pb-[var(--card-py)]">
          {children}
        </div>
      </DrawerContent>
    )
  }
  return (
    <DialogContent className={cn("max-h-[90vh] overflow-y-auto", className)} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <DrawerHeader className={cn("px-0", className)} {...props} />
  return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <DrawerTitle className={cn("text-lg leading-none", className)} {...props} />
  return <DialogTitle className={className} {...props} />
}

function ResponsiveDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <DrawerDescription className={className} {...props} />
  return <DialogDescription className={className} {...props} />
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const { isMobile } = React.useContext(ResponsiveDialogContext)
  if (isMobile) return <DrawerFooter className={cn("px-0", className)} {...props} />
  return <DialogFooter className={className} {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
}
