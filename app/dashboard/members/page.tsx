import { MembersTable } from "@/components/tables/members-table"

export default function MembersPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <MembersTable />
    </div>
  )
}
