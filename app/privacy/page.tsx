"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

export default function PolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background py-12 px-6 sm:px-12 lg:px-24">
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">Last updated: March 30, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
            <p>
              We collect information to provide better services to all our users. We collect information in the following ways:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-muted-foreground">
              <li>Information you give us (e.g., account creation info).</li>
              <li>Information we get from your use of our services (e.g., event participation).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Information</h2>
            <p>
              We use the information we collect from all our services to provide, maintain, protect and improve them, to develop new ones, and to protect our platform and our users. We also use this information to offer you tailored content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">3. Information We Share</h2>
            <p>
              We do not share personal information with companies, organizations, and individuals outside of the Science Olympiad organization unless one of the following circumstances applies:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-muted-foreground">
              <li>With your consent.</li>
              <li>For external processing.</li>
              <li>For legal reasons.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Security</h2>
            <p>
              We work hard to protect our platform and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. In particular, we encrypt many of our services using SSL.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Changes</h2>
            <p>
              Our Privacy Policy may change from time to time. We will not reduce your rights under this Privacy Policy without your explicit consent. We will post any privacy policy changes on this page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
