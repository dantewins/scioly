import type { Metadata } from "next"
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { getCurrentUser } from "@/lib/auth"
import { Toaster } from "sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const dmSerif = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "Scioly",
  description: "Science Olympiad club management platform",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html lang="en" data-density="comfortable" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${dmSerif.variable} font-sans antialiased`}>
        <Toaster position="top-right" richColors />
        <AuthProvider initialUser={user}>{children}</AuthProvider>
      </body>
    </html>
  )
}
