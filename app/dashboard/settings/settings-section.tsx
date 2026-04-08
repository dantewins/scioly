import type { ReactNode } from "react"
import type { Icon } from "@tabler/icons-react"

interface SettingsSectionProps {
  icon: Icon
  title: string
  children: ReactNode
}

export function SettingsSection({ icon: IconComponent, title, children }: SettingsSectionProps) {
  return (
    <section className="layout-section">
      <div className="control-row">
        <IconComponent className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}
