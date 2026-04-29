import { FeedbackForm } from "@/components/feedback-form";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    url?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <div className="vw-page flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1 px-4 pb-16 pt-28 sm:px-6 md:pt-32">
        <div className="vw-narrow">
          <p className="vw-kicker">Feedback</p>
          <h1 className="vw-display mt-4 text-balance text-4xl sm:text-5xl">
            Help tune the feed.
          </h1>
          <p className="vw-copy mt-5 max-w-[62ch] text-pretty text-lg">
            Report a bug, flag an incorrect summary, suggest a vendor, or tell me where the signal
            ranking feels off. Identity is optional, used only if I need to follow up.
          </p>

          <div className="mt-8">
            <FeedbackForm initialType={params.type} initialPageUrl={params.url} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
