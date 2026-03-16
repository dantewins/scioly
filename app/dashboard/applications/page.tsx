import { ApplicantsTable } from "@/components/tables/applicants-table"

export default function ApplicantsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <ApplicantsTable />
    </div>
  )
}