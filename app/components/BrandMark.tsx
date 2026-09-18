export default function BrandMark({ size = 18, className }: { size?: number; className?: string }) {
  const style = { width: size, height: size, objectFit: "contain" } as React.CSSProperties;
  return (
    <picture className={className} aria-hidden>
      <source srcSet="/afyvia_logo.webp" type="image/webp" />
      <img src="/afyvia_logo-removebg-preview.png" alt="Afyvia" style={style} />
    </picture>
  );
}
