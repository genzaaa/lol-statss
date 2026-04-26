// Streamed instantly while the server is fetching account/summoner/matches.
// Next.js shows this automatically during the route's first render.

export default function SummonerLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Profile header skeleton */}
      <div className="bg-panel border border-line rounded-lg p-5 flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg bg-panel2" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-panel2 rounded w-48" />
          <div className="h-3 bg-panel2 rounded w-24" />
        </div>
      </div>

      {/* Three cards skeleton */}
      <div className="grid md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-panel border border-line rounded-lg p-4 h-28">
            <div className="h-3 bg-panel2 rounded w-24 mb-3" />
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-panel2" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-panel2 rounded w-20" />
                <div className="h-3 bg-panel2 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mastery skeleton */}
      <div className="bg-panel border border-line rounded-lg p-4">
        <div className="h-4 bg-panel2 rounded w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-panel2/50 rounded-md" />
          ))}
        </div>
      </div>

      {/* Match list skeleton */}
      <div>
        <div className="h-5 bg-panel2 rounded w-32 mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-panel/50 border border-line"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
