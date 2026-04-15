export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Privacy Policy</h1>
      <div className="prose prose-zinc text-sm text-zinc-600 space-y-4">
        <p><strong>Last updated:</strong> April 15, 2026</p>
        <p>
          jakobpreneur Command Center is a personal content management tool
          built and operated by Jakob Rubenstein. This privacy policy explains
          how data is handled within this application.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Data Collection</h2>
        <p>
          This application is a private tool with a single user (the operator).
          It does not collect, store, or process personal data from any third
          parties or external users. There is no public-facing registration,
          login, or data collection.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Platform Integrations</h2>
        <p>
          This tool connects to social media platforms (YouTube, TikTok,
          Instagram, X) via OAuth to publish content to the operator's own
          accounts. OAuth tokens are stored securely and used solely for
          authenticated API calls to publish original content.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Data Storage</h2>
        <p>
          Content scripts, scheduling data, and platform connection tokens are
          stored in Airtable, a secure cloud database. No personal data from
          viewers or followers is collected or stored.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Data Sharing</h2>
        <p>
          No data is shared with, sold to, or disclosed to any third parties.
          This is a single-user personal tool.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900 mt-6">Contact</h2>
        <p>
          For questions about this privacy policy, contact Jakob Rubenstein at
          Jrubenstein313@gmail.com.
        </p>
      </div>
    </div>
  );
}
