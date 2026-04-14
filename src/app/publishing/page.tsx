export default function PublishingPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-100 border border-zinc-200 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Publishing</h1>
        <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed">
          Multi-platform scheduling and posting queue.
          This section will be built next.
        </p>
        <div className="mt-8 grid grid-cols-4 gap-4 max-w-2xl mx-auto">
          {[
            { label: "TikTok", connected: false },
            { label: "Instagram", connected: false },
            { label: "YouTube", connected: false },
            { label: "X / Twitter", connected: false },
          ].map((platform) => (
            <div key={platform.label} className="bg-white rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <div className={`w-2 h-2 rounded-full ${platform.connected ? "bg-green-500" : "bg-zinc-300"}`} />
                <span className="text-xs text-zinc-400">{platform.connected ? "Connected" : "Not connected"}</span>
              </div>
              <div className="text-sm font-semibold text-zinc-600">{platform.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
