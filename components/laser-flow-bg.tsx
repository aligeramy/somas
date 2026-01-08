"use client";

export function LaserFlowBg() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
      {/* Horizontal laser beams */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-[20%] h-[2px] w-full animate-[laserFlow1_8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="absolute top-[40%] h-[2px] w-full animate-[laserFlow2_10s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute top-[60%] h-[2px] w-full animate-[laserFlow3_12s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute top-[80%] h-[2px] w-full animate-[laserFlow4_9s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      {/* Vertical laser beams */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-[25%] h-full w-[2px] animate-[laserFlowVertical1_7s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-primary to-transparent" />
        <div className="absolute left-[50%] h-full w-[2px] animate-[laserFlowVertical2_9s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
        <div className="absolute left-[75%] h-full w-[2px] animate-[laserFlowVertical3_11s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1)_0%,transparent_70%)]" />
    </div>
  );
}
