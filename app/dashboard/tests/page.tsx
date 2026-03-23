import { IconReport } from "@tabler/icons-react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

export default function TestsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Tests"
        description="Track test scores and results."
      />
      <EmptyState
        icon={IconReport}
        title="No tests yet"
        description="Test tracking will be available here."
      />
    </div>
  )
}
