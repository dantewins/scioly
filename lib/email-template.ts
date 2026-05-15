// Shared email layout. Keep CSS inline — email clients strip <style> blocks
// and class selectors. All caller-supplied strings (heading/intro/body) MUST
// be pre-escaped; this helper does NOT escape them. ctaUrl is run through
// encodeURI internally.

interface RenderEmailOpts {
  heading: string
  intro: string
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  footer?: string
}

function brandName(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    const first = host.split(".")[0]
    return first.charAt(0).toUpperCase() + first.slice(1)
  } catch {
    return "Scioly"
  }
}

const COLORS = {
  bg: "#f6f7fb",
  surface: "#ffffff",
  border: "#e2e4ec",
  text: "#0f172a",
  muted: "#64748b",
  brand: "#2563eb",
  brandText: "#ffffff",
}

export function renderEmail({
  heading,
  intro,
  body,
  ctaLabel,
  ctaUrl,
  footer,
}: RenderEmailOpts): string {
  const safeCtaUrl = ctaUrl ? encodeURI(ctaUrl) : undefined
  const brand = brandName()

  const cta =
    ctaLabel && safeCtaUrl
      ? `
        <tr>
          <td style="padding: 8px 0 24px 0;">
            <a href="${safeCtaUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:${COLORS.brand};color:${COLORS.brandText};font-weight:600;font-size:14px;text-decoration:none;letter-spacing:0.01em;">${ctaLabel}</a>
          </td>
        </tr>`
      : ""

  const bodyBlock = body
    ? `<tr><td style="padding:0 0 16px 0;color:${COLORS.text};font-size:15px;line-height:1.55;">${body}</td></tr>`
    : ""

  const footerText =
    footer ?? "If you have questions, reach out to your club admin."

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 28px;border-bottom:1px solid ${COLORS.border};">
                <span style="font-size:13px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};">${brand}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;color:${COLORS.text};font-weight:600;letter-spacing:-0.01em;">${heading}</h1>
                <p style="margin:0 0 16px 0;color:${COLORS.text};font-size:15px;line-height:1.55;">${intro}</p>
              </td>
            </tr>
            ${bodyBlock ? `<tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${bodyBlock}${cta}</table></td></tr>` : cta ? `<tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${cta}</table></td></tr>` : ""}
            <tr>
              <td style="padding:16px 28px 24px 28px;border-top:1px solid ${COLORS.border};color:${COLORS.muted};font-size:12px;line-height:1.5;">
                ${footerText}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
