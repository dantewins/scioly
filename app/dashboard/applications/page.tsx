import { ApplicantsTable } from "@/components/tables/applicants-table"

export default function ApplicantsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <ApplicantsTable />
    </div>
  )
}
