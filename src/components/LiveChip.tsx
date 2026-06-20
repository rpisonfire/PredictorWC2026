export function LiveChip({ small }: { small?: boolean }) {
  return (
    <span className={`live-pulse chip bg-wc-red text-white font-black ${small ? "text-[10px]" : ""}`}>
      <span className="inline-block w-2 h-2 rounded-full bg-white" />
      LIVE
    </span>
  );
}
