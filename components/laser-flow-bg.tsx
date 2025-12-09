"use client";

export function LaserFlowBg() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
      {/* Horizontal laser beams */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent top-[20%] animate-[laserFlow1_8s_ease-in-out_infinite]" />
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent top-[40%] animate-[laserFlow2_10s_ease-in-out_infinite]" />
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent top-[60%] animate-[laserFlow3_12s_ease-in-out_infinite]" />
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent top-[80%] animate-[laserFlow4_9s_ease-in-out_infinite]" />
      </div>
      
      {/* Vertical laser beams */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute h-full w-[2px] bg-gradient-to-b from-transparent via-primary to-transparent left-[25%] animate-[laserFlowVertical1_7s_ease-in-out_infinite]" />
        <div className="absolute h-full w-[2px] bg-gradient-to-b from-transparent via-primary/60 to-transparent left-[50%] animate-[laserFlowVertical2_9s_ease-in-out_infinite]" />
        <div className="absolute h-full w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent left-[75%] animate-[laserFlowVertical3_11s_ease-in-out_infinite]" />
      </div>

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1)_0%,transparent_70%)]" />
    </div>
  );
}
