import { Badge } from "@/components/ui/badge"

interface FormSubmission {
  id: string
  status: string
  formType: { id: string; name: string; category: string }
}

interface Props {
  submissions: FormSubmission[]
}

export function MemberFormsTable({ submissions }: Props) {
  if (submissions.length === 0) {
    return <p className="text-sm text-muted-foreground">No form submissions.</p>
  }

  return (
    <div className="overflow-x-auto">
    <div className="overflow-hidden rounded-[var(--radius)] border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Form</th>
            <th className="text-left px-4 py-2 font-medium">Category</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((fs) => (
            <tr key={fs.id} className="border-t">
              <td className="px-4 py-2">{fs.formType.name}</td>
              <td className="px-4 py-2 text-muted-foreground">{fs.formType.category}</td>
              <td className="px-4 py-2"><Badge variant="outline">{fs.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
