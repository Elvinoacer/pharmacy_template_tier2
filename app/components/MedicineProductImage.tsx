"use client";

import Image from "next/image";
import { useState } from "react";
import { resolveMedicineImage } from "@/app/lib/media-fallbacks";
import { Pill } from "lucide-react";

export default function MedicineProductImage({
  src,
  alt,
  category,
  name,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  className = "object-cover",
  fallbackSrc,
}: {
  src?: string | null;
  alt: string;
  category?: string | null;
  name?: string | null;
  priority?: boolean;
  sizes?: string;
  className?: string;
  fallbackSrc?: string;
}) {
  const targetSrc = resolveMedicineImage(src, category, name || alt);
  const resolvedFallback = fallbackSrc || resolveMedicineImage(null, category, name || alt);

  const [prevTargetSrc, setPrevTargetSrc] = useState(targetSrc);
  const [currentSrc, setCurrentSrc] = useState(targetSrc);
  const [failed, setFailed] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  if (targetSrc !== prevTargetSrc) {
    setPrevTargetSrc(targetSrc);
    setCurrentSrc(targetSrc);
    setFailed(false);
    setAllFailed(false);
  }

  if (allFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-4 text-center">
        <div className="flex flex-col items-center gap-1.5 opacity-60">
          <Pill className="h-8 w-8 text-[var(--brand)] animate-pulse" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {name || alt}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Image
      unoptimized
      src={currentSrc}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => {
        if (!failed && resolvedFallback && resolvedFallback !== currentSrc) {
          setFailed(true);
          setCurrentSrc(resolvedFallback);
        } else {
          setAllFailed(true);
        }
      }}
    />
  );
}
