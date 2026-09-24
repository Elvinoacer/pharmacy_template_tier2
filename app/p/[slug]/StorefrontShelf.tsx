"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ListingChrome from "@/app/components/listing/ListingChrome";
import {
  Aisle,
  EmptyShelf,
  MedicineFeature,
  MedicineTile,
  ServicePoster,
  ServiceRow,
  joinMeta,
  shelfPrice,
} from "@/app/components/listing/pieces";
import styles from "@/app/components/listing/listing.module.css";

export type StoreMedicine = {
  id: string;
  name: string;
  detail: string;
  imageUrl: string | null;
  price: number;
  prescriptionRequired: boolean;
  category: string;
  href: string;
};

export type StoreService = {
  id: string;
  title: string;
  short: string;
  description: string;
  duration: string | null;
  imageUrl: string | null;
  price: number | null;
  bookable: boolean;
  href: string;
};

function prettyCategory(value: string) {
  if (!value || value === "general") return "Care";
  if (value.includes(" ") || value.includes("&")) return value;
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StorefrontMedicineShelf({
  action,
  pharmacyName,
  initialQuery,
  medicines,
}: {
  action: string;
  pharmacyName: string;
  initialQuery: string;
  medicines: StoreMedicine[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [seenQuery, setSeenQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [rx, setRx] = useState<"all" | "otc" | "rx">("all");
  const [sort, setSort] = useState<"name" | "price-asc" | "price-desc">("name");

  if (initialQuery !== seenQuery) {
    setSeenQuery(initialQuery);
    setQuery(initialQuery);
  }

  useEffect(() => {
    if (query.trim() === initialQuery) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      const next = query.trim().slice(0, 120);
      if (next) params.set("q", next);
      router.replace(params.toString() ? `${action}?${params}` : action, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, initialQuery, action, router]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of medicines) {
      const slug = item.category || "general";
      if (!map.has(slug)) map.set(slug, prettyCategory(slug));
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [medicines]);

  const shown = useMemo(() => {
    return medicines
      .filter((item) => {
        if (category !== "all" && (item.category || "general") !== category) return false;
        if (rx === "otc" && item.prescriptionRequired) return false;
        if (rx === "rx" && !item.prescriptionRequired) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        return a.name.localeCompare(b.name);
      });
  }, [medicines, category, rx, sort]);

  const browsing = category === "all" && rx === "all" && !initialQuery && shown.length >= 4;
  const groups = useMemo(() => {
    if (!browsing) return null;
    const map = new Map<string, StoreMedicine[]>();
    for (const item of shown.slice(1)) {
      const key = item.category || "general";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    const shelves = [...map.entries()]
      .map(([slug, items]) => ({ slug, name: prettyCategory(slug), items }))
      .filter((aisle) => aisle.items.length >= 2)
      .sort((a, b) => b.items.length - a.items.length);
    if (!shelves.length) return null;
    const loose = [...map.entries()].filter(([, items]) => items.length < 2).flatMap(([, items]) => items);
    return { lead: shown[0], shelves, loose };
  }, [browsing, shown]);

  const reset = () => {
    setQuery("");
    setCategory("all");
    setRx("all");
    setSort("name");
  };

  return (
    <div>
      <ListingChrome
        query={query}
        onQueryChange={setQuery}
        searchLabel={`Search medicines at ${pharmacyName}`}
        searchPlaceholder="Medicine or generic name"
        chips={[
          {
            id: "all",
            label: "All",
            pressed: category === "all" && rx === "all",
            onSelect: () => {
              setCategory("all");
              setRx("all");
            },
          },
          {
            id: "otc",
            label: "No Rx",
            pressed: rx === "otc",
            onSelect: () => setRx((value) => (value === "otc" ? "all" : "otc")),
          },
          ...(categories.length > 1
            ? categories.map((item) => ({
                id: item.id,
                label: item.label,
                pressed: category === item.id,
                onSelect: () => setCategory((value) => (value === item.id ? "all" : item.id)),
              }))
            : []),
        ]}
        count={shown.length}
        countLabel={`${shown.length} ${shown.length === 1 ? "medicine" : "medicines"}`}
        sortValue={sort}
        sortOptions={[
          { value: "name", label: "Name A–Z" },
          { value: "price-asc", label: "Price, low to high" },
          { value: "price-desc", label: "Price, high to low" },
        ]}
        onSort={(value) => setSort(value as typeof sort)}
        toggles={[
          {
            id: "rx",
            label: "Prescription",
            pressed: rx === "rx",
            onToggle: () => setRx((value) => (value === "rx" ? "all" : "rx")),
          },
        ]}
        tuneCount={(category !== "all" ? 1 : 0) + (rx !== "all" ? 1 : 0)}
        onClear={reset}
      />

      {shown.length === 0 ? (
        <EmptyShelf title={initialQuery ? "Nothing matches that name" : "The shelf is still being stocked"}>
          <p>
            {initialQuery
              ? `No published medicine at ${pharmacyName} matches “${initialQuery}”.`
              : `${pharmacyName} hasn’t published medicine listings yet.`}
          </p>
        </EmptyShelf>
      ) : groups ? (
        <>
          <MedicineFeature
            href={groups.lead.href}
            name={groups.lead.name}
            imageUrl={groups.lead.imageUrl}
            kicker={prettyCategory(groups.lead.category)}
            trust={
              groups.lead.prescriptionRequired
                ? `A pharmacist at ${pharmacyName} reviews this before dispensing.`
                : `No prescription. Reserve it from ${pharmacyName}.`
            }
            priceLabel={groups.lead.price > 0 ? shelfPrice(groups.lead.price, false) : "Ask the pharmacy"}
            meta={groups.lead.detail || (groups.lead.prescriptionRequired ? "Prescription" : "No prescription")}
            priority
          />
          {groups.shelves.map((aisle) => (
            <Aisle key={aisle.slug} title={aisle.name} aside={<span className={styles.aisleCount}>{aisle.items.length}</span>}>
              <div className={styles.rail}>
                {aisle.items.slice(0, 8).map((item) => (
                  <MedicineTile
                    key={item.id}
                    href={item.href}
                    name={item.name}
                    imageUrl={item.imageUrl}
                    priceLabel={item.price > 0 ? shelfPrice(item.price) : "Ask"}
                    meta={item.detail || (item.prescriptionRequired ? "Prescription" : "No prescription")}
                  />
                ))}
              </div>
            </Aisle>
          ))}
          {groups.loose.length > 0 ? (
            <Aisle title="Also on the shelf">
              <div className={styles.rail}>
                {groups.loose.map((item) => (
                  <MedicineTile
                    key={item.id}
                    href={item.href}
                    name={item.name}
                    imageUrl={item.imageUrl}
                    priceLabel={item.price > 0 ? shelfPrice(item.price) : "Ask"}
                    meta={item.detail}
                  />
                ))}
              </div>
            </Aisle>
          ) : null}
        </>
      ) : (
        <div className={styles.mosaic}>
          <div className={styles.span}>
            <MedicineFeature
              href={shown[0].href}
              name={shown[0].name}
              imageUrl={shown[0].imageUrl}
              kicker={prettyCategory(shown[0].category)}
              trust={
                shown[0].prescriptionRequired
                  ? `A pharmacist at ${pharmacyName} reviews this before dispensing.`
                  : `No prescription. Reserve it from ${pharmacyName}.`
              }
              priceLabel={shown[0].price > 0 ? shelfPrice(shown[0].price, false) : "Ask the pharmacy"}
              meta={shown[0].detail || (shown[0].prescriptionRequired ? "Prescription" : "No prescription")}
              priority
            />
          </div>
          {shown.slice(1).map((item) => (
            <MedicineTile
              key={item.id}
              layout="cell"
              href={item.href}
              name={item.name}
              imageUrl={item.imageUrl}
              priceLabel={item.price > 0 ? shelfPrice(item.price) : "Ask"}
              meta={item.detail}
            />
          ))}
        </div>
      )}
      {shown.length > 0 ? (
        <p className={styles.footnote}>Prices and stock are published by {pharmacyName}. Confirm a prescription item with the team before you collect it.</p>
      ) : null}
    </div>
  );
}

export function StorefrontServiceShelf({ pharmacyName, services }: { pharmacyName: string; services: StoreService[] }) {
  const [query, setQuery] = useState("");
  const [lane, setLane] = useState("all");
  const [bookableOnly, setBookableOnly] = useState(false);
  const [sort, setSort] = useState<"bookable" | "price-asc" | "name">("bookable");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services
      .filter((item) => {
        if (bookableOnly && !item.bookable) return false;
        const text = `${item.title} ${item.short} ${item.description}`.toLowerCase();
        if (lane === "screening" && !/screen|check|test|pressure|sugar/.test(text)) return false;
        if (lane === "vaccine" && !/vaccin|immun|shot|dose/.test(text)) return false;
        if (lane === "consultation" && !/consult|counsel|doctor|review/.test(text)) return false;
        if (q && !text.includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "bookable" && a.bookable !== b.bookable) return a.bookable ? -1 : 1;
        if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
        return a.title.localeCompare(b.title);
      });
  }, [services, query, lane, bookableOnly, sort]);

  const posterTake = shown.length <= 2 ? shown.length : Math.min(lane === "all" && !bookableOnly && !query.trim() ? 6 : 3, shown.length);
  const posters = shown.slice(0, posterTake);
  const rows = shown.slice(posterTake);

  return (
    <div>
      <ListingChrome
        query={query}
        onQueryChange={setQuery}
        searchLabel={`Search care at ${pharmacyName}`}
        searchPlaceholder="Screening, vaccine, or visit"
        chips={[
          {
            id: "all",
            label: "All",
            pressed: lane === "all" && !bookableOnly,
            onSelect: () => {
              setLane("all");
              setBookableOnly(false);
            },
          },
          { id: "book", label: "Book", pressed: bookableOnly, onSelect: () => setBookableOnly((value) => !value) },
          { id: "screening", label: "Screenings", pressed: lane === "screening", onSelect: () => setLane((value) => (value === "screening" ? "all" : "screening")) },
          { id: "vaccine", label: "Vaccines", pressed: lane === "vaccine", onSelect: () => setLane((value) => (value === "vaccine" ? "all" : "vaccine")) },
          { id: "consultation", label: "Visits", pressed: lane === "consultation", onSelect: () => setLane((value) => (value === "consultation" ? "all" : "consultation")) },
        ]}
        count={shown.length}
        countLabel={`${shown.length} ${shown.length === 1 ? "service" : "services"}`}
        sortValue={sort}
        sortOptions={[
          { value: "bookable", label: "Bookable first" },
          { value: "price-asc", label: "Price, low to high" },
          { value: "name", label: "Name A–Z" },
        ]}
        onSort={(value) => setSort(value as typeof sort)}
        toggles={[{ id: "book", label: "Online booking", pressed: bookableOnly, onToggle: () => setBookableOnly((value) => !value) }]}
        tuneCount={(lane !== "all" ? 1 : 0) + (bookableOnly ? 1 : 0)}
        onClear={() => {
          setQuery("");
          setLane("all");
          setBookableOnly(false);
        }}
      />
      {shown.length === 0 ? (
        <EmptyShelf title="No care matches that">
          <p>{services.length ? "Try another word, or clear the refine." : `${pharmacyName} hasn’t published services yet.`}</p>
        </EmptyShelf>
      ) : (
        <>
          <h2 className={styles.sr}>Care at {pharmacyName}</h2>
          <div className={styles.posterRail}>
            {posters.map((service, index) => (
              <ServicePoster
                key={service.id}
                href={service.href}
                title={service.title}
                imageUrl={service.imageUrl}
                meta={joinMeta([service.short, service.duration])}
                action={`${service.bookable ? "Book" : "View"} · ${shelfPrice(service.price, false)}`}
                priority={index === 0}
              />
            ))}
          </div>
          {rows.length > 0 ? (
            <Aisle title="More care">
              <div className={styles.rows}>
                {rows.map((service) => (
                  <ServiceRow
                    key={service.id}
                    href={service.href}
                    title={service.title}
                    imageUrl={service.imageUrl}
                    meta={joinMeta([service.bookable ? "Book online" : "Ask the pharmacy", service.duration])}
                    priceLabel={shelfPrice(service.price)}
                  />
                ))}
              </div>
            </Aisle>
          ) : null}
          <p className={styles.footnote}>Services are published by {pharmacyName}. The team confirms the visit.</p>
        </>
      )}
    </div>
  );
}
