/**
 * PageLoader — used as the Suspense fallback for lazy-loaded routes.
 * Matches the app's dark "Mocha & Gold" design language so the flash
 * between navigations feels native rather than jarring.
 */
const PageLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
    {/* Pulsing logo mark */}
    <div className="relative">
      <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center animate-pulse">
        <span className="text-primary font-serif font-black text-2xl">C.</span>
      </div>
      {/* Spinning ring */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary animate-spin" />
    </div>

    {/* Skeleton shimmer bars */}
    <div className="flex flex-col items-center gap-3 w-48">
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-primary/30 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
      </div>
      <div className="h-2 w-3/4 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-primary/20 rounded-full animate-[shimmer_1.5s_ease-in-out_0.3s_infinite]" style={{ width: '40%' }} />
      </div>
    </div>
  </div>
);

export default PageLoader;
