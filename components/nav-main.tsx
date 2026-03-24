"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// A single nav item descriptor
type NavItem = {
  title: string
  url: string
  icon?: Icon
}

// A labeled group of nav items — each renders as its own sidebar section
type NavSection = {
  label: string
  items: NavItem[]
}

export function NavMain({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname()

  return (
    <>
      {sections.map(section => (
        <SidebarGroup key={section.label}>
          <SidebarGroupContent>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map(item => {
                const href = "/dashboard" + item.url
                // Exact match for dashboard root, prefix match for sub-pages
                const isActive =
                  item.url === ""
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/")

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={
                        isActive
                          ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90 hover:text-primary-foreground"
                          : "hover:bg-muted/60"
                      }
                    >
                      <Link href={href}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
