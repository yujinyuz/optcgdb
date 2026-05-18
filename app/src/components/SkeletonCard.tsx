export default function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden bg-white dark:bg-[#1a1d2e] shadow-md shadow-black/5 dark:shadow-white/5 animate-pulse">
      {/* Top strip placeholder */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-[#13151f]">
        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-[#2e303a]" />
        <div className="h-4 w-8 bg-slate-200 dark:bg-[#2e303a] rounded" />
      </div>

      {/* Center icon placeholder */}
      <div className="shrink-0 py-2 flex items-center justify-center bg-slate-50/50 dark:bg-[#13151f]/50">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#2e303a]" />
      </div>

      {/* Text placeholders */}
      <div className="px-2.5 py-2 space-y-1.5">
        <div className="h-3 w-full bg-slate-200 dark:bg-[#2e303a] rounded" />
        <div className="h-3 w-3/4 bg-slate-200 dark:bg-[#2e303a] rounded" />
        <div className="h-2.5 w-12 mx-auto bg-slate-200 dark:bg-[#2e303a] rounded" />
        <div className="h-4 w-full bg-slate-200 dark:bg-[#2e303a] rounded" />
        <div className="h-3 w-16 mx-auto bg-slate-200 dark:bg-[#2e303a] rounded" />
      </div>

      {/* Bottom banner placeholder */}
      <div className="mt-auto px-2.5 py-1.5 bg-slate-900 dark:bg-black flex items-center justify-between">
        <div className="h-3 w-10 bg-white/10 rounded" />
        <div className="h-3 w-5 bg-white/10 rounded" />
      </div>
    </div>
  )
}
