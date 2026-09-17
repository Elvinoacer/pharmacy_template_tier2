import AdaptiveLoading from "@/app/components/AdaptiveLoading";

export default function PortalLoading() {
  return (
    <AdaptiveLoading
      label="Loading patient portal"
      title="Opening health workspace…"
      subtitle="Loading your prescriptions, refills, and medication schedule…"
      eyebrow="Personal Care"
      variant="workspace"
      cards={4}
    />
  );
}
