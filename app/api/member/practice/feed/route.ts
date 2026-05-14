import { withActiveMemberAuth, ok, err } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { getMemberPracticeFeed } from "@/lib/practice-assessments"

export const dynamic = "force-dynamic"

export const GET = withActiveMemberAuth(async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  const feed = await getMemberPracticeFeed(season.id, ms.id)
  return ok(feed)
})
