export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase()
}

export function getEmailDomain(email: string): string | null {
  const domain = email.split("@")[1]
  return domain ? normalizeDomain(domain) : null
}

export function buildAllowedDomains(
  primaryDomain?: string | null,
  extraDomains?: Array<{ domain: string }>,
): string[] {
  const domains = new Set<string>()

  if (primaryDomain) {
    domains.add(normalizeDomain(primaryDomain))
  }

  for (const domain of extraDomains ?? []) {
    if (domain?.domain) {
      domains.add(normalizeDomain(domain.domain))
    }
  }

  return [...domains]
}

export function isEmailAllowedForDomains(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true

  const emailDomain = getEmailDomain(email)
  if (!emailDomain) return false

  return allowedDomains.includes(emailDomain)
}
