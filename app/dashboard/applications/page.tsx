import { ApplicantsTable } from "@/components/tables/applicants-table"

import data from "./data.json"

type Applicant = {
  id: number;
  name: string;
  grade: string;
  school: string;
  email: string;
  phone: string;
  appliedFor: string;
  status: "Pending" | "Accepted" | "Rejected";
};

export default function ApplicantsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <ApplicantsTable data={data as Applicant[]} />
    </div>
  )
}
