import AdaptiveLoading from "@/app/components/AdaptiveLoading";

export default function PlatformLoading() {
  return (
    <AdaptiveLoading
      label="Loading platform operations"
      title="Opening platform control…"
      subtitle="Loading network telemetry, pharmacy applications, and system jobs…"
      eyebrow="Platform Control"
      variant="admin"
      cards={6}
    />
  );
}
