// scripts/lib/auth.ts
// Logs in via POST /api/auth/login and returns a Cookie header value usable
// in subsequent requests. Uses Node 20+ `getSetCookie()`.

export async function loginAndGetCookie(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Login failed for ${email} (${res.status}): ${body}`)
  }
  const setCookies = res.headers.getSetCookie()
  if (setCookies.length === 0) {
    throw new Error(`No Set-Cookie on login response for ${email}`)
  }
  // Take the name=value of each Set-Cookie (drop attributes), join with "; ".
  return setCookies.map((c) => c.split(";")[0]).join("; ")
}
