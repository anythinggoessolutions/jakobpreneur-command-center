export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Analytics</h1>
        <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed">
          Performance tracking across TikTok, Instagram, YouTube, and X.
          This section will be built next.
        </p>
        <div className="mt-8 grid grid-cols-4 gap-4 max-w-2xl mx-auto">
          {[
            { label: "Views This Week", value: "---" },
            { label: "Followers Gained", value: "---" },
            { label: "Best Video", value: "---" },
            { label: "Videos Posted", value: "---" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-zinc-200 p-4">
              <div className="text-2xl font-bold text-zinc-300">{stat.value}</div>
              <div className="text-xs text-zinc-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
