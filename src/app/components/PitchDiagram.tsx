"use client";

export default function PitchDiagram({
  onClick,
  children,
}: {
  onClick?: (x: number, y: number) => void;
  children?: React.ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100;
    onClick(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
  }

  return (
    <div
      onClick={handleClick}
      data-pitch
      className="relative w-full aspect-[2/3] rounded-xl overflow-hidden border border-black/20 bg-emerald-600 select-none"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to top, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 10%, transparent 10%, transparent 20%)",
      }}
    >
      <svg viewBox="0 0 100 150" className="absolute inset-0 h-full w-full pointer-events-none">
        <rect x="2" y="2" width="96" height="146" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
        <line x1="2" y1="75" x2="98" y2="75" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
        <circle cx="50" cy="75" r="9" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
        <circle cx="50" cy="75" r="0.8" fill="white" fillOpacity="0.7" />

        {/* alt kale (kendi kalemiz) */}
        <rect x="26" y="2" width="48" height="16" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
        <rect x="38" y="2" width="24" height="6" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
        <circle cx="50" cy="22" r="0.8" fill="white" fillOpacity="0.7" />

        {/* üst kale (rakip kalesi) */}
        <rect
          x="26"
          y="132"
          width="48"
          height="16"
          fill="none"
          stroke="white"
          strokeOpacity="0.7"
          strokeWidth="0.6"
        />
        <rect x="38" y="142" width="24" height="6" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
        <circle cx="50" cy="128" r="0.8" fill="white" fillOpacity="0.7" />
      </svg>
      {children}
    </div>
  );
}
