import AdaptiveLoading from "@/app/components/AdaptiveLoading";

export default function CaregiverLoading() {
  return (
    <AdaptiveLoading
      label="Loading caregiver workspace"
      title="Opening caregiver workspace…"
      subtitle="Loading patient list, today’s doses, and refill alerts…"
      eyebrow="Caregiver Portal"
      variant="workspace"
      cards={6}
    />
  );
}
