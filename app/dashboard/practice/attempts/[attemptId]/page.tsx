import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { getMemberSeason } from "@/lib/db"
import { getMemberPracticeAttemptDetail } from "@/lib/practice-assessments"
import { AttemptWorkspace } from "./attempt-workspace"


interface Props { params: Promise<{ attemptId: string }> }

export default async function AttemptPage({ params }: Props) {
  const { attemptId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "practice")) redirect("/dashboard")

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) redirect("/dashboard/practice")

  const attempt = await getMemberPracticeAttemptDetail(attemptId, user.clubId, ms.id)
  if (!attempt) notFound()

  return <AttemptWorkspace initialAttempt={attempt} />
}
