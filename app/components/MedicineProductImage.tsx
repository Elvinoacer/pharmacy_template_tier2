"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_SRC = "/images/care/medicine-still-life.png";

export default function MedicineProductImage({
  src,
  alt,
  priority = false,
  sizes,
  className = "object-contain",
}: {
  src: string | null | undefined;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasSource = Boolean(src && !failed);
  const resolvedSrc = hasSource ? (src as string) : FALLBACK_SRC;

  return (
    <Image
      unoptimized={hasSource}
      src={resolvedSrc}
      alt={hasSource ? alt : `Illustrative medicine image for ${alt}`}
      fill
      priority={priority}
      sizes={sizes}
      className={hasSource ? className : "object-cover"}
      onError={hasSource ? () => setFailed(true) : undefined}
    />
  );
}
