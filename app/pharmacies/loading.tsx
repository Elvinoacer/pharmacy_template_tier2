import AdaptiveLoading from "@/app/components/AdaptiveLoading";

export default function Loading() {
  return <AdaptiveLoading label="Loading pharmacy directory" variant="public" cards={6} />;
}
