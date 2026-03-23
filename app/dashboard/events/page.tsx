import { IconCalendarWeek } from "@tabler/icons-react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

export default function EventsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Events"
        description="Manage Science Olympiad events for the active season."
      />
      <EmptyState
        icon={IconCalendarWeek}
        title="Events are not yet configured"
        description="Event management will be available here."
      />
    </div>
  )
}
