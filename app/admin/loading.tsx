import AdaptiveLoading from "@/app/components/AdaptiveLoading";

export default function AdminLoading() {
  return (
    <AdaptiveLoading
      label="Loading pharmacy workspace"
      title="Opening pharmacy workspace…"
      subtitle="Loading today’s tasks, clinical requests, and stock levels…"
      eyebrow="Pharmacy Operations"
      variant="admin"
      cards={4}
    />
  );
}
