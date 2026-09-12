import Link from "next/link";
import { ArrowRight, FileUp, PackageSearch, Search } from "lucide-react";
import CareHero from "../components/care/CareHero";
import { MedicineCatalogGrid } from "../components/MedicineCatalogCard";
import { Pagination } from "../components/Pagination";
import { listNetworkMedicineListings } from "../lib/services/network-catalog";
import styles from "../components/care/CarePages.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Find your medicine",
  description:
    "Explore medicine availability, prices, and product details across the network.",
};
const PAGE_SIZE = 24;
export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
    stock?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const category = sp.category?.trim() || "";
  const inStock = sp.stock !== "all";
  const requestedPage = Math.max(1, Number.parseInt(sp.page || "1", 10) || 1);
  let data = await listNetworkMedicineListings({
    q,
    category,
    inStock,
    skip: (requestedPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }).catch(() => null);
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE)),
  );
  if (data && page !== requestedPage)
    data = await listNetworkMedicineListings({
      q,
      category,
      inStock,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }).catch(() => null);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (category) query.set("category", category);
  const stockHref = (all: boolean) => {
    const next = new URLSearchParams(query);
    if (all) next.set("stock", "all");
    return `/medicines?${next}`;
  };
  return (
    <div className={styles.page}>
      <CareHero
        section="medicines"
        eyebrow="THE MEDICINE YOU NEED"
        title="A little less searching."
        accent="A little more certainty."
        description="Search by name, brand, or generic. Explore available medicines and prices, then continue with the product you need."
      />
      <section className={styles.searchPanel} aria-label="Find medicine">
        <form action="/medicines" className={styles.searchForm} role="search">
          <label htmlFor="medicine-query">
            What medicine are you looking for?
            <input
              id="medicine-query"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Medicine name, brand or generic"
            />
          </label>
          <label htmlFor="medicine-category" className={styles.category}>
            Category
            <select
              id="medicine-category"
              name="category"
              defaultValue={category}
            >
              <option value="">All categories</option>
              {data?.categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {!inStock && <input type="hidden" name="stock" value="all" />}
          <button className={styles.primary}>
            <Search size={17} aria-hidden /> Find medicine
          </button>
        </form>
        <div className={styles.hint}>
          <span>
            Availability is reported by pharmacies and confirmed when you
            request.
          </span>
          <Link href="/prescription">
            <FileUp size={14} aria-hidden /> Have a prescription? Upload it{" "}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{q ? `Results for “${q}”` : "Explore your medicine cabinet"}</h2>
          <p>
            {q
              ? "Review the exact name, strength, and form before continuing."
              : "Start with the product. Its availability takes care of the pharmacy connection."}
          </p>
        </div>
        {data && (
          <span className={styles.count}>
            {data.total} listing{data.total === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <nav className={styles.toggles} aria-label="Stock availability">
        <Link
          href={stockHref(false)}
          aria-current={inStock ? "page" : undefined}
        >
          In stock
        </Link>
        <Link
          href={stockHref(true)}
          aria-current={!inStock ? "page" : undefined}
        >
          All listings
        </Link>
      </nav>
      {!data ? (
        <div role="alert" className={styles.empty}>
          <PackageSearch size={32} aria-hidden />
          <h3>We couldn’t load the medicine shelf.</h3>
          <p>
            Please refresh to try again. This doesn’t mean your medicine is out
            of stock.
          </p>
          <Link href={stockHref(!inStock)} className={styles.primary}>
            Try again <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      ) : data.items.length ? (
        <>
          <MedicineCatalogGrid items={data.items} />
          <Pagination
            page={page}
            total={data.total}
            pageSize={PAGE_SIZE}
            basePath="/medicines"
            variant="platform"
            queryParams={{ q, category, stock: inStock ? undefined : "all" }}
          />
        </>
      ) : (
        <div className={styles.empty}>
          <PackageSearch size={34} aria-hidden />
          <h3>
            {q
              ? "No matching medicine listings yet."
              : "The medicine shelf is waiting to be stocked."}
          </h3>
          <p>
            {q
              ? "Check the spelling, try the generic name, or include all listings. You can also upload your prescription to check several medicines together."
              : "Published pharmacy inventory will appear here. You can still prepare a prescription search or explore available care services."}
          </p>
          <Link
            href={q ? "/medicines?stock=all" : "/prescription"}
            className={styles.primary}
          >
            {q ? "Explore all listings" : "Start with a prescription"}
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link href="/services" className={styles.primary}>
            Explore services
          </Link>
        </div>
      )}
      <p className={styles.bottomNote}>
        Found a medicine? Open its details to continue. You can inspect the
        supplying pharmacy’s profile for contacts, directions, and enquiries at
        any time.
      </p>
    </div>
  );
}
