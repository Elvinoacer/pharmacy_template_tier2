type BrandMarkProps = {
  size?: number;
  className?: string;
};

/**
 * The symbol is intentionally served from a tightly cropped asset. The old
 * source contains a large transparent canvas, which made the mark disappear
 * when it was rendered in a small navigation tile.
 */
export default function BrandMark({ size = 32, className }: BrandMarkProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ width: size, height: size, display: "inline-flex", flexShrink: 0 }}
    >
      <img
        src="/afyvia-symbol.png"
        alt=""
        width={size}
        height={size}
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
