import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Creator Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 tracking-tight mb-6">
          jakobpreneur Command Center
        </h1>
        <p className="text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          A creator platform for AI captions, hashtags, and social media
          content optimization. Plan, generate, and publish short-form video
          content across TikTok, Instagram, YouTube Shorts, and X from one
          dashboard.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/content"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-colors"
          >
            Open dashboard
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="mt-20 grid sm:grid-cols-3 gap-6">
        <FeatureCard
          title="AI captions & hashtags"
          body="Per-platform captions, hooks, and hashtag sets generated for TikTok, Instagram Reels, and YouTube Shorts."
        />
        <FeatureCard
          title="Carousel generation"
          body="Branded 1080×1350 image carousels for Instagram, rendered server-side from creator-supplied scripts."
        />
        <FeatureCard
          title="Multi-platform publishing"
          body="OAuth-authenticated publishing to YouTube, TikTok, Instagram, and X. Scheduling, retries, and per-post analytics."
        />
      </div>

      <div className="mt-20 rounded-2xl border border-zinc-200 bg-zinc-50 p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-zinc-900 mb-3">
          About this platform
        </h2>
        <div className="space-y-3 text-sm text-zinc-600 leading-relaxed">
          <p>
            jakobpreneur Command Center is a content optimization platform for
            short-form video creators. It generates platform-specific captions,
            hashtags, and visual assets, then publishes the result to the
            connected creator accounts via the official APIs of each platform.
          </p>
          <p>
            By using this platform you agree to our{" "}
            <Link href="/terms" className="underline hover:text-zinc-900">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-zinc-900">
              Privacy Policy
            </Link>
            . Content published through the platform must comply with the
            community guidelines of each destination platform (including
            TikTok, Instagram, YouTube, and X).
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h3 className="font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-600 leading-relaxed">{body}</p>
    </div>
  );
}
