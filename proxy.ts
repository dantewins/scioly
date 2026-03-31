// proxy.ts
import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isDashboard = pathname.startsWith("/dashboard")
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/set-password"

  const userId = await getUserId(req, { strict: false })

  if (isDashboard && !userId) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
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
