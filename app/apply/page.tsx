import { ApplyForm } from "@/components/forms/apply-form"

export default function ApplyPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-xl">
        <ApplyForm />
      </div>
    </div>
  )
}