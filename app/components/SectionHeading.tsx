export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">{eyebrow}</p>
      )}
      <h2
        className="mt-2 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-[#5a6b62]">{description}</p>
      )}
    </div>
  );
}
