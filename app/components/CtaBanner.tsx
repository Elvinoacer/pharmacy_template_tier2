import Link from "next/link";
import Image from "next/image";

export default function CtaBanner({
  title = "Ready to visit or need a refill?",
  description = "Call us, message on WhatsApp, or use a quick online form — we are here to help.",
  primaryHref = "/contact",
  primaryLabel = "Contact us",
  secondaryHref = "/refill",
  secondaryLabel = "Request a refill",
}: {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/40">
        <div className="absolute inset-0">
          <Image
            src="/images/services/home-care-support.webp"
            alt="Calm modern wellness space"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#041510]/92 via-[#084c3f]/85 to-[#0d6e5a]/75" />
        </div>
        <div className="relative px-8 py-14 sm:px-12 lg:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200/90">Get in touch</p>
          <h2
            className="mt-3 max-w-lg text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {title}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-teal-50/80 sm:text-base">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#084c3f] shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
            >
              {primaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
