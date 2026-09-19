import type { PrismaClient } from "../app/generated/prisma/client";

export const DIRECTORY_SEED_SOURCE = "https://practice.pharmacyboardkenya.org/LicenseStatus?register=facilities";
export const DIRECTORY_SEED_BATCH = "kenya-public-directory-2026-09";

const coverImages = [
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
  "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=82",
];

type DirectoryPharmacySeed = {
  slug: string;
  name: string;
  city: string;
  county: string;
  address: string;
  latitude: number;
  longitude: number;
  tagline: string;
  sourceUrl: string;
  phone?: string;
  whatsapp?: string;
};

/**
 * Public names and landmarks are taken from public pharmacy branch pages,
 * provider directories and public health-service listings. Coordinates are intentionally approximate landmark pins so
 * the directory helps people get oriented without pretending to be a verified
 * premises survey. Admins can replace them when a pharmacy claims its listing.
 */
export const DIRECTORY_PHARMACY_SEEDS: DirectoryPharmacySeed[] = [
  { slug: "goodlife-westlands-sarit", name: "Goodlife Pharmacy — Westlands / Sarit", city: "Nairobi", county: "Nairobi", address: "Sarit Centre, Westlands", latitude: -1.2645, longitude: 36.8043, tagline: "Your Westlands pharmacy stop.", sourceUrl: "https://www.goodlife.co.ke/health-services/", phone: "0700168204" },
  { slug: "pharmart-galleria", name: "Pharmart Galleria Chemist", city: "Nairobi", county: "Nairobi", address: "Galleria Mall, Lang'ata Road", latitude: -1.3376, longitude: 36.7678, tagline: "Community pharmacy care at Galleria.", sourceUrl: "https://pharmart.co.ke/about-us/", phone: "+254718239550" },
  { slug: "pharmart-abc-chemist", name: "Pharmart ABC Chemist", city: "Nairobi", county: "Nairobi", address: "ABC Place, Waiyaki Way", latitude: -1.2705, longitude: 36.7928, tagline: "Health and wellness essentials in Westlands.", sourceUrl: "https://pharmart.co.ke/about-us/", phone: "+254733899129" },
  { slug: "portal-pharmacy-two-rivers", name: "Portal Pharmacy — Two Rivers", city: "Nairobi", county: "Nairobi", address: "Two Rivers Mall, Ground Floor", latitude: -1.2078, longitude: 36.8006, tagline: "Prescription pickup and pharmacist support.", sourceUrl: "https://portalpharmacy.arani.co.ke/", phone: "+254740637700" },
  { slug: "centurion-pharmacy-ngong", name: "Centurion Pharmacy — Ngong", city: "Ngong", county: "Kajiado", address: "Ngong Milele Mall, Ngong Road", latitude: -1.3616, longitude: 36.6565, tagline: "A convenient pharmacy stop in Ngong.", sourceUrl: "https://portalpharmacy.arani.co.ke/", phone: "+254790486224" },
  { slug: "portal-pharmacy-banda-street", name: "Portal Pharmacy — Banda Street", city: "Nairobi", county: "Nairobi", address: "Banda Street, Nairobi CBD", latitude: -1.2833, longitude: 36.8259, tagline: "Pharmacist support in the CBD.", sourceUrl: "https://portalpharmacy.arani.co.ke/", phone: "+254731303582" },
  { slug: "haltons-pharmacy-kisumu", name: "Haltons Pharmacy — Kisumu", city: "Kisumu", county: "Kisumu", address: "Oginga Odinga Street, next to Guardian Bank", latitude: -0.102, longitude: 34.7617, tagline: "Accessible pharmacy care in Kisumu.", sourceUrl: "https://hrmis.tsc.go.ke/tsc-cgi/hcpinfo", phone: "+254737994460" },
  { slug: "haltons-pharmacy-nakuru", name: "Haltons Pharmacy — Nakuru", city: "Nakuru", county: "Nakuru", address: "Masters Plaza, Ground Floor, Kenyatta Avenue", latitude: -0.2833, longitude: 36.0667, tagline: "Everyday pharmacy care in Nakuru.", sourceUrl: "https://hrmis.tsc.go.ke/tsc-cgi/hcpinfo", phone: "+254780994490" },
  { slug: "haltons-pharmacy-nanyuki", name: "Haltons Pharmacy — Nanyuki", city: "Nanyuki", county: "Laikipia", address: "Nanyuki town centre", latitude: 0.0167, longitude: 37.0728, tagline: "Highlands pharmacy support in Nanyuki.", sourceUrl: "https://collaborationkenya.minet.com/MinetKe/Teachersmedicalscheme/files/2023_07_14_01_11_14pm_ServiceProvidersList.pdf", phone: "+254739994480" },
  { slug: "one-stop-pharmacy-kilimani", name: "One Stop Pharmacy — Kilimani", city: "Nairobi", county: "Nairobi", address: "Kilimani, Nairobi", latitude: -1.2921, longitude: 36.7875, tagline: "A neighbourhood pharmacy option in Kilimani.", sourceUrl: "https://collaborationkenya.minet.com/MinetKe/Teachersmedicalscheme/files/2023_07_14_01_11_14pm_ServiceProvidersList.pdf" },
  { slug: "malibu-pharmacy-kisumu", name: "Malibu Pharmacy", city: "Kisumu", county: "Kisumu", address: "Kisumu town centre", latitude: -0.1025, longitude: 34.761, tagline: "Community pharmacy care in Kisumu.", sourceUrl: "https://collaborationkenya.minet.com/MinetKe/Teachersmedicalscheme/files/2023_07_14_01_11_14pm_ServiceProvidersList.pdf" },
  { slug: "kaiti-pharmacy-wote", name: "Kaiti Pharmacy", city: "Wote", county: "Makueni", address: "Wote town centre", latitude: -1.7808, longitude: 37.6288, tagline: "Local pharmacy support in Wote.", sourceUrl: "https://collaborationkenya.minet.com/MinetKe/Teachersmedicalscheme/files/2023_07_14_01_11_14pm_ServiceProvidersList.pdf" },
  { slug: "garnet-pharmacy-galleria", name: "Garnet Pharmacy", city: "Nairobi", county: "Nairobi", address: "Galleria Shopping Mall, New Wing", latitude: -1.3376, longitude: 36.7678, tagline: "Pharmacy and health essentials at Galleria.", sourceUrl: "https://galleria.co.ke/store-types/pharmacy/" },
  { slug: "orion-pharmacy-forest-road", name: "Orion Pharmacy", city: "Nairobi", county: "Nairobi", address: "Forest Road Plaza", latitude: -1.272, longitude: 36.826, tagline: "A city pharmacy near Forest Road.", sourceUrl: "https://www.kisumu.go.ke/wp-content/uploads/KISUMU-COUNTY-PROVIDER-PANEL-2024.pdf", phone: "+254722656000" },
  { slug: "queensville-pharmacy-mayfair", name: "Queensville Pharmacy", city: "Nairobi", county: "Nairobi", address: "Mayfair Centre, Ralph Bunche Road", latitude: -1.294, longitude: 36.807, tagline: "Accessible pharmacy care near Upper Hill.", sourceUrl: "https://www.kisumu.go.ke/wp-content/uploads/KISUMU-COUNTY-PROVIDER-PANEL-2024.pdf", phone: "+254780670089" },
  { slug: "doveypharma-ring-road", name: "Doveypharma", city: "Nairobi", county: "Nairobi", address: "Ring Road, Nairobi", latitude: -1.298, longitude: 36.782, tagline: "A convenient pharmacy option along Ring Road.", sourceUrl: "https://www.kisumu.go.ke/wp-content/uploads/KISUMU-COUNTY-PROVIDER-PANEL-2024.pdf", phone: "+254709747549" },
  { slug: "inkamed-aga-khan-walk", name: "Inkamed Pharmaceuticals", city: "Nairobi", county: "Nairobi", address: "Aga Khan Walk, Uchumi House", latitude: -1.282, longitude: 36.821, tagline: "Pharmacy support in central Nairobi.", sourceUrl: "https://www.kisumu.go.ke/wp-content/uploads/KISUMU-COUNTY-PROVIDER-PANEL-2024.pdf" },
  { slug: "tf-pharmacy-kma-centre", name: "TF Pharmacy", city: "Nairobi", county: "Nairobi", address: "KMA Centre, Nairobi", latitude: -1.287, longitude: 36.819, tagline: "A practical pharmacy stop in Nairobi CBD.", sourceUrl: "https://www.kisumu.go.ke/wp-content/uploads/KISUMU-COUNTY-PROVIDER-PANEL-2024.pdf", phone: "+254721499695" },
  { slug: "lyntons-pharmacy-nairobi", name: "Lynton's Pharmacy", city: "Nairobi", county: "Nairobi", address: "Nairobi", latitude: -1.286, longitude: 36.817, tagline: "A local pharmacy option in Nairobi.", sourceUrl: "https://kengensrbs.co.ke/wp-content/uploads/2024/03/2.UAP_OM-Health-Provider-Panel.pdf" },
  { slug: "goodlife-eldoret", name: "Goodlife Pharmacy — Eldoret", city: "Eldoret", county: "Uasin Gishu", address: "Eldoret town centre", latitude: -0.5143, longitude: 35.2698, tagline: "Rift Valley pharmacy care.", sourceUrl: "https://www.goodlife.co.ke/health-services/", phone: "0114344181" },
];

type DirectorySeedPrisma = Pick<
  PrismaClient,
  "pharmacy" | "pharmacySettings" | "pharmacyIntegration" | "pharmacyBranch"
>;

export async function seedDirectoryPharmacies(prisma: DirectorySeedPrisma) {
  const now = new Date();
  const currentSlugs = DIRECTORY_PHARMACY_SEEDS.map((seed) => seed.slug);
  const stale = await prisma.pharmacy.findMany({
    where: { isSeeded: true, slug: { notIn: currentSlugs } },
    select: { id: true },
  });
  const staleIds = stale.map((row) => row.id);
  if (staleIds.length > 0) {
    await prisma.pharmacySettings.deleteMany({ where: { pharmacyId: { in: staleIds } } });
    await prisma.pharmacyIntegration.deleteMany({ where: { pharmacyId: { in: staleIds } } });
    await prisma.pharmacyBranch.deleteMany({ where: { pharmacyId: { in: staleIds } } });
    await prisma.pharmacy.deleteMany({ where: { id: { in: staleIds } } });
  }

  for (const [index, seed] of DIRECTORY_PHARMACY_SEEDS.entries()) {
    const image = coverImages[index];
    const description = `${seed.name} offers a convenient place to ask about medicines, wellness products and pharmacy support near ${seed.address}.`;
    const about = `${seed.name} is a convenient community pharmacy location near ${seed.address}. Contact this location to confirm hours, availability and the best way to access care.`;
    const deliveryNotes = `${seed.name} should confirm delivery coverage and fees for ${seed.address}.`;
    const settingsData = {
      displayName: seed.name,
      phone: seed.phone ?? null,
      whatsapp: seed.whatsapp ?? null,
      addressLine1: seed.address,
      city: seed.city,
      state: seed.county,
      country: "Kenya",
      latitude: seed.latitude,
      longitude: seed.longitude,
      coverImageUrl: image,
      about,
      deliveryNotes,
      deliveryRadiusKm: 8,
    };
    await prisma.pharmacy.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        legalName: seed.name,
        tagline: seed.tagline,
        description,
        status: "active",
        lifecycleStatus: "active",
        listed: true,
        featured: false,
        isSeeded: true,
        seededAt: now,
        seededSourceUrl: `${seed.sourceUrl || DIRECTORY_SEED_SOURCE}#${seed.slug}`,
        phone: seed.phone ?? null,
        whatsapp: seed.whatsapp ?? null,
        city: seed.city,
        county: seed.county,
        country: "Kenya",
        latitude: seed.latitude,
        longitude: seed.longitude,
        coverImageUrl: image,
        verifiedAt: now,
        goLiveAt: now,
        setupCompletedAt: now,
        settings: {
          create: settingsData,
        },
        integrations: { create: {} },
      },
      update: {
        name: seed.name,
        legalName: seed.name,
        tagline: seed.tagline,
        description,
        status: "active",
        lifecycleStatus: "active",
        listed: true,
        isSeeded: true,
        seededAt: now,
        seededSourceUrl: `${seed.sourceUrl || DIRECTORY_SEED_SOURCE}#${seed.slug}`,
        phone: seed.phone ?? null,
        whatsapp: seed.whatsapp ?? null,
        city: seed.city,
        county: seed.county,
        country: "Kenya",
        latitude: seed.latitude,
        longitude: seed.longitude,
        coverImageUrl: image,
        verifiedAt: now,
        goLiveAt: now,
        setupCompletedAt: now,
        settings: {
          upsert: {
            create: settingsData,
            update: settingsData,
          },
        },
      },
    });
  }
  return DIRECTORY_PHARMACY_SEEDS.length;
}
