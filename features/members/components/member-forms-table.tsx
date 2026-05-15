import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableShell,
} from "@/components/ui/table"

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
    <>
      {/* Mobile: card list */}
      <ul className="space-y-2 md:hidden">
        {submissions.map((fs) => (
          <li
            key={fs.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border/80 bg-card px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm leading-tight tracking-tight truncate">{fs.formType.name}</p>
              <p className="label-caps text-muted-foreground mt-0.5">
                {fs.formType.category.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
            <StatusBadge status={fs.status} withDot />
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <TableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-32">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((fs) => (
              <TableRow key={fs.id}>
                <TableCell className="font-serif text-base leading-tight tracking-tight">
                  {fs.formType.name}
                </TableCell>
                <TableCell className="label-caps text-muted-foreground">
                  {fs.formType.category.replace(/_/g, " ").toLowerCase()}
                </TableCell>
                <TableCell><StatusBadge status={fs.status} withDot /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </>
  )
}
