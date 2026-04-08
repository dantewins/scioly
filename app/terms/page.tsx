"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background py-[var(--page-py)] px-[var(--page-px)]">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button
          variant="ghost"
          className="mb-8 pl-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
          onClick={() => router.back()}
        >
          <IconArrowLeft className="mr-2 size-4" />
          Back
        </Button>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">Last updated: March 30, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using this Science Olympiad platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on this platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">3. User Conduct</h2>
            <p>
              Users are expected to conduct themselves in a respectful and sportsmanlike manner. Harassment, cheating, and the distribution of prohibited materials are strictly forbidden and may result in immediate account termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Disclaimer</h2>
            <p>
              The materials on this platform are provided on an &apos;as is&apos; basis. The platform makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Revisions and Errata</h2>
            <p>
              The materials appearing on this platform could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its website are accurate, complete, or current.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
