import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Scioly",
  description: "Science Olympiad club management platform",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-density="comfortable" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Toaster position="top-right" richColors />
        <AuthProvider initialUser={null}>{children}</AuthProvider>
      </body>
    </html>
  )
}
