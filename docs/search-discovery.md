# Search and local discovery

Afyvia now exposes server-rendered location hubs, pharmacy profiles, medicine comparisons, service comparisons and pharmacy onboarding pages. Location hubs only exist for towns with active, listed, verified pharmacies. They link to actual published offerings rather than generating pages for arbitrary keywords.

## Routes and crawling

- `/locations`: linked from the platform footer and pharmacy directory.
- `/locations/{lowercase city}`: local pharmacies, published services and up to 48 medicine examples, linked to network comparisons. Spaces and punctuation are URL encoded. Every pharmacy has a link to its full catalogue.
- `/pharmacies/{slug}`: pharmacy profile with address, contact details and coordinates when supplied.
- `/medicines/{master slug}` and `/services/{slug}`: network comparison pages. Storefront offerings retain `/p/{pharmacy}/…` URLs. A service offered by only one pharmacy redirects to that provider.
- `/for-pharmacies`: acquisition page for pharmacy owners, with its own canonical URL.
- `/sitemap-index.xml`: submit this URL to search consoles; robots.txt advertises it.
- `/sitemap.xml`: editorial, category, vaccine and location URLs.
- `/discovery-sitemaps/{pharmacies|medicines|services}-{page}.xml`: database-driven catalogue batches of 5,000 records. No previous 1,000-medicine / 500-service truncation. Catalogue feeds enforce public visibility and medication-master status. The same network medicine may occur in multiple batches; search engines accept duplicate URLs across sitemap files.

Catalogue index and feeds return HTTP 503 with Retry-After on database failure, rather than caching a false empty catalogue. Feed caches last at most an hour at shared caches. Existing database timestamps are used for listings; static pages do not invent a modification date on every request. Catalogue changes during offset pagination may shift a boundary until the next crawl.

CollectionPage, ItemList and breadcrumb JSON-LD describe comparison and location pages. Pharmacy JSON-LD includes an absolute identifier and URL. JSON-LD escaping prevents pharmacy-supplied text from closing a script tag. Markup is descriptive: it does not claim guaranteed search enhancements, fabricated reviews, ratings or universal medicine availability.

## Nearby results

Existing medicine/service comparisons and the pharmacy directory already support proximity. Location pages reuse the consent-driven browser-location control and saved browse location. Pharmacies and service providers sort by straight-line distance; missing/invalid coordinates sort last and show “Distance unavailable.” Coordinates are not placed in canonical URLs or sitemap entries. Without consent, visitors can browse a town and all providers normally.

Distances displayed by Google, Maps or another platform are controlled by that platform. Our browser location cannot personalize a crawler's copy of the page. Keep each pharmacy's real map pin and street address accurate. Town pages currently group the database's city field; separate neighbourhood coverage requires meaningful, normalized neighbourhood data rather than invented area pages.

## Brand Ranking Investigation & Resolution ("Afyvia" vs "Afya")

### Root causes identified
1. **Zero Initial Search Indexation & Spell Autocorrection**: Google has not yet built an entity node for the newly registered brand "Afyvia". When users search "afyvia", Google's spellchecker automatically assumes a typo for "afya" (the ubiquitous Swahili term for health in Kenya) and shows results for the national health portal (`afyayangu.go.ke`) with the banner: *"These are results for afya. Search instead for afyvia"*.
2. **Crawl Budget Wastage on Private Redirects**: Bots attempting to crawl internal links or standard administration paths (`/admin`, `/portal`, `/caregiver`, `/platform`, `/select-pharmacy`, `/reset-password`) hit 307 temporary redirects to `/login`. This consumed search engine crawl budget on non-indexable private routes.
3. **Canonical Duplication**: Dynamic catalogue discovery sitemaps previously outputted both `/pharmacies/[slug]` and `/p/[slug]` for every active pharmacy, splitting indexation weight across duplicate routes.
4. **Missing Knowledge Graph Entity Signals**: Structured data lacked explicit brand alternate names, sameAs social links, and parent organization identifiers.

### Codebase remediations applied
- **`app/robots.ts`**: Blocked search engine crawlers from wasting quota on `/admin`, `/portal`, `/caregiver`, `/platform`, `/select-pharmacy`, `/onboard/location-handoff`, and `/reset-password`.
- **`app/lib/services/discovery-sitemap.ts`**: Deduplicated pharmacy sitemaps to emit only the canonical `/pharmacies/[slug]` profiles.
- **`app/p/[slug]/[[...path]]/page.tsx`**: Pointed storefront home canonical tags to `/pharmacies/[slug]`.
- **`app/components/JsonLd.tsx`**: Expanded structured data to emit `Organization` and `MedicalOrganization` entities with `@id`, `alternateName` array (`Afyvia Kenya`, `Afyvia Pharmacy Network`), logo, official contact point, and `sameAs` social profile URLs.
- **`app/lib/data.ts` & `app/layout.tsx`**: Added brand search keywords and environment-configurable social channels.

### Immediate operational checklist for operators
1. **Google Search Console Domain Verification**:
   - Add property via DNS TXT record or HTML tag in GSC for `https://afyvia.health` (or your active production domain).
   - In GSC Sitemaps, submit `https://<domain>/sitemap-index.xml`.
2. **Kickstart Googlebot Crawl via URL Inspection**:
   - Inspect `https://<domain>/`, `https://<domain>/pharmacies`, and `https://<domain>/medicines`.
   - Click **"Request Indexing"** to trigger immediate live crawler discovery.
3. **Claim Social Profiles & Knowledge Graph Entities**:
   - Create and verify official accounts on X (`@afyvia`), LinkedIn (`company/afyvia`), Facebook (`afyvia`), and Instagram (`@afyvia`).
   - Link these profiles back to `https://<domain>`.
   - Configure environment variables: `NEXT_PUBLIC_SOCIAL_FACEBOOK`, `NEXT_PUBLIC_SOCIAL_INSTAGRAM`, `NEXT_PUBLIC_SOCIAL_LINKEDIN`, `NEXT_PUBLIC_SOCIAL_TWITTER`.
4. **Member Pharmacy Google Business Profiles**:
   - Ask participating pharmacies in Nairobi/Kenya to list their Afyvia storefront URL (`https://<domain>/pharmacies/<slug>`) as their appointment/website link on their Google Business Profile.
   - This provides immediate local NAP (Name, Address, Phone) citations and resolves the spellcheck ambiguity.

## Production rollout

1. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS domain and redirect alternate domains to it. Deploy the code and verify the sitemap index and representative public pages return successfully.
2. Verify domain ownership in Google Search Console and Bing Webmaster Tools. Submit `/sitemap-index.xml`, then inspect representative pharmacy, medicine, service, location and pharmacy-owner URLs. These account operations have not been performed by the code change.
3. Validate representative pages in Google's Rich Results Test and Schema Markup Validator. CollectionPage/ItemList markup need not produce a rich result to be useful.
4. Each pharmacy should maintain its own eligible Google Business Profile with consistent real name, address, telephone, opening hours and a link to its Afyvia page. Add complete coordinates and descriptions in Afyvia. Do not claim that Afyvia itself has a physical branch at every listed pharmacy.
5. Maintain accurate stock, prices, services, licensing/verification and genuine customer feedback. Have qualified reviewers maintain medicine/health guidance and visible author/review information. Those editorial and business-profile operations remain ongoing work.
6. Monitor indexed pages, crawl errors, impressions/clicks by query and town, conversion to provider contact/bookings and Core Web Vitals. Expand neighbourhood and service-by-location pages only when real data supports useful distinct content. This change does not include an SEO analytics dashboard or external rank tracking.

No implementation guarantees first place, indexing or AI citations. Google's local ranking depends on relevance, distance and prominence. Google says its normal SEO foundations also apply to AI search features; there is no special AI markup requirement. Public HTML, crawlable links, consistent entities and truthful structured data support discovery across crawlers.

Sources:
- https://support.google.com/business/answer/7091
- https://developers.google.com/search/docs/appearance/structured-data/local-business
- https://developers.google.com/search/docs/appearance/ai-features
- https://www2.bing.com/webmasters/help/sitemaps-3b5cf6ed

## Local verification note

The configured development database includes a public medicine named `Fully Qualifying Master 1789653934963`. It satisfies the current visibility rules and therefore appears in discovery. Review and unpublish test fixtures before submitting the production sitemap; no database records were changed during this implementation.

## Validation performed

TypeScript and targeted ESLint checks passed. Seventeen focused tests passed (SEO helpers, proximity and tenant isolation). Local HTTP checks confirmed the location index, populated Nairobi page, sitemap index and all catalogue feeds; XML and page JSON-LD parsed successfully. A storefront service emitted its own canonical URL. Desktop and 390px mobile pages were visually inspected. Denied geolocation preserved browsing; a request with a synthetic saved location rendered approximate distances. A production build/deployment, external Rich Results validation and search-console submission were not performed.
