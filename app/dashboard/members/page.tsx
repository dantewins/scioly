import { MembersTable } from "@/components/tables/members-table"

export default function MembersPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <MembersTable />
    </div>
  )
}
