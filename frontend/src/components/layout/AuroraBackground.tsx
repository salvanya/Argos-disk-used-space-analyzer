export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="aurora-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />
    </div>
  );
}
