import { type ReactNode } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

interface RightDetailDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: "sm" | "md" | "lg"
}

const WIDTH_CLASS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
}

export function RightDetailDrawer({
  open, onClose, title, description, children, footer, width = "md",
}: RightDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className={`${WIDTH_CLASS[width]} flex flex-col gap-0 p-0 border-l border-border`}
      >
        <SheetHeader className="px-[var(--card-px)] py-[var(--card-py)] border-b border-border shrink-0">
          <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs text-muted-foreground">{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-[var(--card-px)] py-[var(--card-py)]">
          {children}
        </div>

        {footer && (
          <>
            <Separator />
            <div className="px-[var(--card-px)] py-[var(--card-py)] shrink-0">
              {footer}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
