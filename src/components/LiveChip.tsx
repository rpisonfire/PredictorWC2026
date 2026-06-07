export function LiveChip({ small }: { small?: boolean }) {
  return (
    <span className={`chip bg-wc-red text-white font-black ${small ? "text-[10px]" : ""}`}>
      <span className="inline-block w-2 h-2 rounded-full bg-white" style={{ animation: "wcLivePulse 1s ease-in-out infinite" }} />
      LIVE
      <style>{`@keyframes wcLivePulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </span>
  );
}
