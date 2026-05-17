import { chromium } from "playwright"
import { parseArgs } from "node:util"
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"

const { values: args } = parseArgs({
  options: {
    base:     { type: "string", default: "http://localhost:3000" },
    url:      { type: "string", default: "/dashboard" },
    out:      { type: "string", default: "public/showcase.png" },
    width:    { type: "string", default: "1920" },
    height:   { type: "string", default: "958" },
    scale:    { type: "string", default: "2" },
    theme:    { type: "string", default: "light" },          // light | dark | both
    email:    { type: "string", default: "owner@mast.edu" },
    password: { type: "string", default: "password123" },
    wait:     { type: "string", default: "1200" },
    fullPage: { type: "boolean", default: false },
    noLogin:  { type: "boolean", default: false },
  },
  strict: true,
})

const width = parseInt(args.width!, 10)
const height = parseInt(args.height!, 10)
const scale = parseFloat(args.scale!)
const waitMs = parseInt(args.wait!, 10)
const base = args.base!.replace(/\/$/, "")
const targetUrl = args.url!.startsWith("http") ? args.url! : `${base}${args.url}`

async function captureOne(theme: "light" | "dark", outPath: string) {
  console.log(`[screenshot] ${theme.padEnd(5)} ${targetUrl} → ${outPath}`)

  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    colorScheme: theme,
    reducedMotion: "reduce",
  })

  // Seed localStorage so the app's theme switcher picks up the right mode on first paint.
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t)
    } catch {}
  }, theme)

  if (!args.noLogin) {
    const loginResp = await ctx.request.post(`${base}/api/auth/login`, {
      data: { email: args.email, password: args.password },
    })
    if (!loginResp.ok()) {
      console.error(`[screenshot] login failed: ${loginResp.status()} ${await loginResp.text()}`)
      await browser.close()
      process.exit(1)
    }
  }

  const page = await ctx.newPage()
  await page.goto(targetUrl, { waitUntil: "networkidle" })

  // Belt-and-suspenders: force the .dark class to match the requested theme.
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark")
  }, theme)

  // Wait for web fonts so Instrument Serif renders sharp instead of falling back.
  await page.evaluate(() => document.fonts.ready)

  // Let fade-ins, top-loader, and any chart entrance settle.
  await page.waitForTimeout(waitMs)

  await mkdir(dirname(outPath), { recursive: true })
  await page.screenshot({
    path: outPath,
    type: "png",
    fullPage: args.fullPage,
  })

  await browser.close()
  console.log(`[screenshot] wrote ${outPath} @ ${width * scale}×${height * scale}`)
}

async function main() {
  if (args.theme === "both") {
    const base = args.out!.replace(/\.png$/i, "")
    await captureOne("light", `${base}-light.png`)
    await captureOne("dark", `${base}-dark.png`)
  } else if (args.theme === "dark") {
    await captureOne("dark", args.out!)
  } else if (args.theme === "light") {
    await captureOne("light", args.out!)
  } else {
    console.error(`[screenshot] unknown theme: ${args.theme}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
