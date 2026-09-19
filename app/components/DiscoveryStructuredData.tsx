import { platform } from "@/app/lib/data";
import { serializeJsonLd } from "@/app/lib/seo";

export default function DiscoveryStructuredData({ name, path, section, items }: {
  name: string;
  path: string;
  section: { name: string; path: string };
  items: { name: string; href: string }[];
}) {
  const absolute = (value: string) => new URL(value, platform.siteUrl).href;
  const payload = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name, url: absolute(path), mainEntity: { "@type": "ItemList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: absolute(item.href) })) } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: section.name, item: absolute(section.path) }, { "@type": "ListItem", position: 2, name, item: absolute(path) }] },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(payload) }} />;
}
