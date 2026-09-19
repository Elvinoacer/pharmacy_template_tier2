# Afyvia image cloud inventory

Uploaded to the configured public Cloudflare R2 bucket on 2026-09-19. Every URL below was verified with an HTTPS `HEAD` request and returned `200 OK`.

## Uploaded from this repository

| Repository asset | Cloud URL | Current source references |
| --- | --- | --- |
| `app/favicon.ico` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/favicon.ico | Cloud copy only; Next's file-based favicon still uses `app/favicon.ico`. |
| `public/afyvia-logo-lockup.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/brand/afyvia-logo-lockup.png | Cloud copy only; available for prominent lockup placements. |
| `public/afyvia-symbol.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/brand/afyvia-symbol.png | `app/components/BrandMark.tsx:19` |
| `public/afyvia_logo-removebg-preview.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/brand/afyvia-logo-original.png | Cloud copy only; no current source reference found. |
| `public/afyvia_logo.webp` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/brand/afyvia-logo.webp | Cloud copy only; no current source reference found. |
| `public/icon-192.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/icons/icon-192.png | `app/components/PushNotificationCenter.tsx:478`; `app/api/firebase-messaging-sw/route.ts:32`; `app/api/push/test/route.ts:23`; `app/lib/firebase/admin.ts:106`; `app/lib/services/crm.ts:1406`; `app/lib/services/delivery.ts:167`; `app/lib/services/push.ts:32`; `app/lib/services/push.ts:32` |
| `public/icon-192.svg` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/icons/icon-192.svg | Cloud copy only; no current source reference found. |
| `public/images/afyvia_bg_mobile.jpg` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/images/afyvia-bg-mobile.jpg | `app/layout.tsx:197` |
| `public/images/afyvia_bg_pc.webp` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/images/afyvia-bg-pc.webp | `app/layout.tsx:195` |
| `public/images/care/editorial-pharmacy.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/images/care/editorial-pharmacy.png | `app/components/care/CareHero.tsx:61`; `app/components/landing/CareFirstHero.tsx:71`; `app/pharmacies/[slug]/page.tsx:52,107,146`; `app/services/ServicesDirectory.tsx:496`; `app/storefront/NetworkShowcase.tsx:213` |
| `public/images/care/medicine-still-life.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/images/care/medicine-still-life.png | `app/components/care/CareHero.tsx:62`; `app/components/MedicineCatalogCard.tsx:41`; `app/medicines/MedicinesDirectory.tsx:576`; `app/medicines/NetworkMedicineView.tsx:52`; `app/medicines/[slug]/page.tsx:558`; `app/page.tsx:17` |
| `public/register/reg-bg-mobile.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/images/register/reg-bg-mobile.png | `app/globals.css:2702`; `app/components/UnifiedAuthSurface.tsx:358` |
| `public/register/reg-bg-pc.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/images/register/reg-bg-pc.png | `app/globals.css:2711`; `app/components/UnifiedAuthSurface.tsx:356` |
| `register_page_designs/reg_mobile.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/design-reference/register-mobile.png | Design reference only; no runtime source reference found. |
| `register_page_designs/reg_pc.png` | https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/project-assets/design-reference/register-pc.png | Design reference only; no runtime source reference found. |

## Already cloud-hosted in the project

These assets already point to the same public R2 host, so they were not duplicated. The source locations below are the direct literal references found in the repository.

### Articles

- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp — `app/components/landing/LandingHealthPillars.tsx:35`; `app/lib/data.ts:204,427`; `prisma/seed.ts:1214,1536,1540`; `scripts/seed-otc-healthcare.ts:275`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/flu-season-preparation.webp — `app/components/landing/LandingHealthPillars.tsx:45`; `app/lib/data.ts:465,519`; `prisma/seed.ts:1829`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/medication-safety-at-home.webp — `app/components/landing/LandingHealthPillars.tsx:55`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/nutrition-basics-for-heart-health.webp — `app/lib/data.ts:483`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp — `app/lib/data.ts:243,367,387`; `prisma/seed.ts:1368,1533`; `scripts/seed-otc-healthcare.ts:92,106`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/understanding-blood-pressure.webp — `app/components/landing/LandingHealthPillars.tsx:25`; `app/lib/data.ts:408`; `prisma/seed.ts:1195`

### Gallery

- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp — `app/components/landing/LandingBentoGrid.tsx:32`; `app/components/landing/LandingDirectorySection.tsx:28`; `app/components/landing/TravelLabStory.tsx:48`; `app/components/landing/TravelLabTimeline.tsx:18`; `app/lib/data.ts:282,681`; `app/pharmacies/PharmacyDirectory.tsx:33`; `prisma/seed.ts:1438`; `scripts/seed-otc-healthcare.ts:181`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/comfortable_waiting_area.webp — `app/components/landing/LandingDirectorySection.tsx:27`; `app/pharmacies/PharmacyDirectory.tsx:32`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp — `app/components/landing/LandingDirectorySection.tsx:26`; `app/components/landing/LandingJourneyTabs.tsx:274`; `app/components/landing/TravelLabTimeline.tsx:36`; `app/lib/data.ts:696`; `app/pharmacies/PharmacyDirectory.tsx:31`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp — `app/components/landing/LandingJourneyTabs.tsx:241`; `app/components/landing/TravelLabStory.tsx:78`; `app/components/landing/TravelLabTimeline.tsx:24`; `app/lib/data.ts:334,691`; `prisma/seed.ts:1257,1508`; `scripts/seed-otc-healthcare.ts:261`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/private_counselling.webp — `app/components/landing/TravelLabStory.tsx:108`; `app/components/landing/TravelLabTimeline.tsx:30`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp — `app/about/page.tsx:44,168`; `app/components/landing/LandingDirectorySection.tsx:25`; `app/components/landing/LandingHeroInteractive.tsx:151`; `app/components/landing/LandingJourneyTabs.tsx:208`; `app/components/landing/TravelLabTimeline.tsx:12`; `app/lib/data.ts:308,676`; `app/pharmacies/PharmacyDirectory.tsx:30`; `app/storefront/page.tsx:27`; `prisma/seed.ts:1156,1466`; `scripts/seed-otc-healthcare.ts:209`

### Landing, OTC, services, and team

- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/landing/bg_image_see_it_in_action.png — `app/components/landing/LandingCareDemo.tsx:76`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/landing/hero_bg_img2.png — `app/components/landing/TravelLabHero.tsx:46`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/landing/hero_bgimg1.png — `app/components/landing/TravelLabHero.tsx:41`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/landing/hero_imag_1_1.png — `app/components/landing/TravelLabHero.tsx:36`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/landing/hero_image_0.png — `app/components/landing/TravelLabHero.tsx:31`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/banner_og.png — `app/layout.tsx:75,87`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/baby-care.webp — `app/components/landing/LandingOtcSpotlight.tsx:25`; `app/lib/data.ts:165`; `prisma/seed.ts:1494`; `scripts/seed-otc-healthcare.ts:247`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/cold-flu.webp — `app/components/landing/LandingOtcSpotlight.tsx:10`; `app/lib/data.ts:230,447`; `prisma/seed.ts:1354`; `scripts/seed-otc-healthcare.ts:77`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/diabetes-management.webp — `app/components/landing/LandingOtcSpotlight.tsx:30`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/first-aid.webp — `app/components/landing/LandingOtcSpotlight.tsx:40`; `app/lib/data.ts:178,295`; `prisma/seed.ts:1396,1452`; `scripts/seed-otc-healthcare.ts:139,195`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/pain-relief.webp — `app/components/landing/LandingOtcSpotlight.tsx:15`; `app/lib/data.ts:139`; `prisma/seed.ts:1340`; `scripts/seed-otc-healthcare.ts:62`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp — `app/components/landing/LandingOtcSpotlight.tsx:35`; `app/lib/data.ts:191,269`; `prisma/seed.ts:1410,1424`; `scripts/seed-otc-healthcare.ts:153,167`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp — `app/components/landing/LandingOtcSpotlight.tsx:20`; `app/lib/data.ts:152,347`; `prisma/seed.ts:1522,1537,1542`; `scripts/seed-otc-healthcare.ts:285,298`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/womens-health.webp — `app/components/landing/LandingOtcSpotlight.tsx:45`; `app/lib/data.ts:217,321`; `prisma/seed.ts:1480,1535`; `scripts/seed-otc-healthcare.ts:223,237`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/delivery-services.webp — `app/components/landing/LandingJourneyTabs.tsx:152`; `app/delivery/page.tsx:92`; `prisma/seed.ts:1276`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/home-care-support.webp — `app/components/CtaBanner.tsx:34`; `app/lib/data.ts:701`; `prisma/seed.ts:1296`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp — `app/components/landing/LandingJourneyTabs.tsx:119`; `app/components/landing/LandingQuickCareDeck.tsx:46`; `app/lib/data.ts:256,686`; `prisma/seed.ts:1176,1382,1534`; `scripts/seed-otc-healthcare.ts:116,129`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-dispensing.webp — `app/components/landing/LandingJourneyTabs.tsx:86`; `app/components/landing/LandingQuickCareDeck.tsx:78`; `prisma/seed.ts:1136`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-refills.webp — `app/components/landing/LandingQuickCareDeck.tsx:111`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/vaccinations.webp — `app/components/landing/LandingQuickCareDeck.tsx:143`; `app/lib/data.ts:501`; `prisma/seed.ts:1234,1808`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/david-kim.webp — `app/components/landing/TravelLabContact.tsx:17`; `app/components/landing/TravelLabHero.tsx:66`; `app/components/landing/TravelLabTeam.tsx:29`; `app/lib/data.ts:125`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/marcus-chen.webp — `app/components/landing/TravelLabContact.tsx:15`; `app/components/landing/TravelLabHero.tsx:58`; `app/components/landing/TravelLabTeam.tsx:17`; `app/lib/data.ts:109`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/priya-nair.webp — `app/components/landing/TravelLabContact.tsx:14`; `app/components/landing/TravelLabHero.tsx:54`; `app/components/landing/TravelLabTeam.tsx:11`; `app/lib/data.ts:101`
- https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/sofia-alvarez.webp — `app/components/landing/TravelLabContact.tsx:16`; `app/components/landing/TravelLabHero.tsx:62`; `app/components/landing/TravelLabTeam.tsx:23`; `app/lib/data.ts:117`

## Notes

- The newly uploaded local assets use the `project-assets/` prefix so they do not overwrite existing R2 objects.
- The existing data and seed URLs were already public R2 URLs and remain unchanged.
- `register_page_designs/*` is design-reference material, not a runtime image source.
- `public/afyvia-logo-lockup.png` is the full prominent lockup; `public/afyvia-symbol.png` is the compact mark currently used by `BrandMark`.
