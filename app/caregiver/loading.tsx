import AdaptiveLoading from "@/app/components/AdaptiveLoading";

export default function CaregiverLoading() {
  return <AdaptiveLoading label="Loading caregiver workspace" variant="workspace" cards={6} />;
}
