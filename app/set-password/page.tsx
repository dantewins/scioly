import { SetPasswordClient } from "./set-password-client"

interface SetPasswordPageProps {
  searchParams: Promise<{
    token?: string | string[]
  }>
}

function readToken(rawToken: string | string[] | undefined): string {
  if (Array.isArray(rawToken)) {
    return rawToken[0] ?? ""
  }

  return rawToken ?? ""
}

export default async function SetPasswordPage({
  searchParams,
}: SetPasswordPageProps) {
  const { token: rawToken } = await searchParams

  return <SetPasswordClient token={readToken(rawToken)} />
}
