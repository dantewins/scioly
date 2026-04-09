// proxy.ts
import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/cookies"

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isDashboard = pathname.startsWith("/dashboard")
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/set-password"

  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value)
  const userId = await getUserId(req, { strict: false })

  if (isDashboard && !userId) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    const res = NextResponse.redirect(url)
    if (hasCookie) {
      // Cookie was present but failed validation — purge it so the browser stops resending.
      res.cookies.delete(SESSION_COOKIE)
    }
    return res
  }

  if (isAuthPage && userId) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/set-password"],
}
