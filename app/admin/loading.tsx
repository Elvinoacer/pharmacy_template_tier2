import AdaptiveLoading from "@/app/components/AdaptiveLoading";

export default function AdminLoading() {
  return <AdaptiveLoading label="Loading pharmacy workspace" variant="admin" cards={4} />;
}
