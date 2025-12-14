export function DarkVeil() {
  return (
    <div className="absolute inset-0 -z-10 bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03)_0%,transparent_50%)]" />
    </div>
  );
}
