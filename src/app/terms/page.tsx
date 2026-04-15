export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Terms of Service</h1>
      <div className="prose prose-zinc text-sm text-zinc-600 space-y-4">
        <p><strong>Last updated:</strong> April 15, 2026</p>
        <p>
          jakobpreneur Command Center is a personal content management tool
          built and operated by Jakob Rubenstein for managing the @jakobpreneur
          social media brand.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Usage</h2>
        <p>
          This application is a private tool used solely by its creator for
          scheduling and publishing original content across social media
          platforms. It is not a public service and does not accept external
          users or registrations.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Content</h2>
        <p>
          All content created, managed, and published through this tool is
          original content owned by Jakob Rubenstein. No user-generated content
          from third parties is collected, stored, or distributed.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Third-Party Services</h2>
        <p>
          This tool integrates with third-party platforms including YouTube,
          TikTok, Instagram, and X for the purpose of publishing content to
          the operator's own accounts. API access is used strictly for
          authenticated publishing to owned accounts.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Contact</h2>
        <p>
          For questions about these terms, contact Jakob Rubenstein at
          Jrubenstein313@gmail.com.
        </p>
      </div>
    </div>
  );
}
