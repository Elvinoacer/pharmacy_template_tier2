"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileUp,
  Loader2,
  MapPin,
  PackageSearch,
  Search,
} from "lucide-react";
import RefillForm from "@/app/components/RefillForm";
import CareHero from "@/app/components/care/CareHero";
import {
  MAX_PRESCRIPTION_MEDICINES,
  prescriptionNames,
} from "@/app/lib/prescription-discovery";
import {
  availabilityOffer,
  type CareOffer,
  type CareResult,
} from "@/app/lib/care-availability";
import pageStyles from "@/app/components/care/CarePages.module.css";
import styles from "./PrescriptionFinder.module.css";

export default function PrescriptionFinder({
  mode = "prescription",
  initialResults = null,
  initialError = "",
}: {
  mode?: "prescription" | "refill";
  initialResults?: CareResult[] | null;
  initialError?: string;
}) {
  const [names, setNames] = useState(
    initialResults?.map((r) => r.name).join("\n") || "",
  );
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState<"reading" | "searching" | null>(null);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState("");
  const [results, setResults] = useState<CareResult[] | null>(initialResults);
  const [request, setRequest] = useState<CareOffer | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const namesInput = useRef<HTMLTextAreaElement>(null);
  async function readPhoto(file?: File) {
    if (!file) return;
    setError("");
    setNotice("");
    setResults(null);
    setRequest(null);
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG or WebP photo up to 5 MB.");
      return;
    }
    setBusy("reading");
    try {
      const body = new FormData();
      body.set("image", file);
      const res = await fetch("/api/prescription-search", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read this photo.");
      setNames(data.names.join("\n"));
      setNotice(
        data.names.length
          ? "Review every name and strength. Correct any reading mistakes before checking availability."
          : "We couldn’t read the medicine names. Try a clearer photo or enter them below.",
      );
      requestAnimationFrame(() => namesInput.current?.focus());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Photo reading failed. Enter medicine names to continue.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setRequest(null);
    const list = prescriptionNames(names);
    if (
      !list.length ||
      list.length > MAX_PRESCRIPTION_MEDICINES ||
      list.some((n) => n.length < 2 || n.length > 120)
    ) {
      setError(
        "Enter 1–12 medicine names, one per line, with up to 120 characters each.",
      );
      return;
    }
    setBusy("searching");
    setResults(null);
    try {
      const res = await fetch("/api/prescription-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: list, area }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Could not check availability.");
      setResults(data.results);
      requestAnimationFrame(() => {
        resultHeading.current?.focus();
        resultHeading.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Search failed. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }
  const offer = results ? availabilityOffer(results) : null;
  return (
    <div className={pageStyles.page}>
      <CareHero
        section={mode}
        eyebrow={
          mode === "refill"
            ? "KEEP YOUR CARE GOING"
            : "FROM PAPER TO YOUR NEXT STEP"
        }
        title={mode === "refill" ? "Your routine," : "Your prescription,"}
        accent={
          mode === "refill" ? "with one less worry." : "a clearer next step."
        }
        description={
          mode === "refill"
            ? "Tell us which medicine you need again. We’ll check the available listings and connect your refill to its supplying pharmacy."
            : "Upload a photo or enter your medicine names. Review what’s available, then continue with your medicine request."
        }
      />
      <ol className={styles.steps} aria-label="Your progress">
        {["Your medicines", "Availability", "Review request"].map(
          (label, i) => (
            <li
              key={label}
              aria-current={
                (request ? 2 : results ? 1 : 0) === i ? "step" : undefined
              }
            >
              <span>{i + 1}</span>
              {label}
            </li>
          ),
        )}
      </ol>
      {request ? (
        <section
          className={styles.request}
          aria-label="Review medicine request"
        >
          <button className={styles.back} onClick={() => setRequest(null)}>
            <ArrowLeft size={15} aria-hidden /> Back to available medicines
          </button>
          <h2>One step closer to your medicine.</h2>
          <div className={styles.supplier}>
            <div>
              <span>CONNECTED BY AVAILABILITY</span>
              <strong>{request.pharmacy.name}</strong>
            </div>
            <Link href={`/pharmacies/${request.pharmacy.slug}`}>
              About this pharmacy <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
          <p className={styles.help}>
            Review your contact details and preferred collection date. The
            pharmacy confirms stock and reviews your original prescription
            before dispensing. The search photo is not attached.
          </p>
          <RefillForm
            key={request.pharmacy.id}
            pharmacyName={request.pharmacy.name}
            pharmacySlug={request.pharmacy.slug}
            inventoryIds={[...new Set(request.lines.map((l) => l.match.id))]}
            initialMedicine={request.lines.map((l) => l.match.name).join("\n")}
          />
        </section>
      ) : (
        <>
          <div className={styles.workspace}>
            <section className={styles.upload} aria-labelledby="upload-heading">
              <span className={styles.uploadIcon}>
                <FileUp size={28} aria-hidden />
              </span>
              <p className={styles.kicker}>A PHOTO IS A GOOD START</p>
              <h2 id="upload-heading">
                Bring your prescription.
                <br />
                <em>We’ll help with the search.</em>
              </h2>
              <p>
                A clear photo of the medicine names and strengths is all you
                need to begin.
              </p>
              <label className={styles.fileLabel}>
                <FileUp size={17} aria-hidden /> Upload prescription
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!!busy}
                  onChange={(e) => {
                    void readPhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <small>JPEG, PNG or WebP · Up to 5 MB</small>
              <p className={styles.privacy}>
                Photo reading uses our AI provider. Crop out personal details
                before uploading. You review the names before searching; the
                photo isn’t shared with pharmacies.
              </p>
            </section>
            <form className={styles.form} onSubmit={search}>
              <p className={styles.kicker}>OR START WITH THE NAME</p>
              <h2>
                {mode === "refill"
                  ? "What do you need to refill?"
                  : "Which medicines do you need?"}
              </h2>
              <p>
                Enter the names yourself, or review the names read from your
                photo.
              </p>
              <label htmlFor="prescription-names">
                Medicine names & strengths <span>One per line · up to 12</span>
              </label>
              <textarea
                id="prescription-names"
                ref={namesInput}
                value={names}
                disabled={!!busy}
                required
                maxLength={1500}
                rows={5}
                onChange={(e) => {
                  setNames(e.target.value);
                  setResults(null);
                }}
                placeholder={
                  "e.g. Metformin 500mg\nInclude the strength exactly as prescribed"
                }
              />
              <label htmlFor="prescription-area">
                Town or county <span>Optional</span>
              </label>
              <div className={styles.location}>
                <MapPin size={16} aria-hidden />
                <input
                  id="prescription-area"
                  maxLength={100}
                  value={area}
                  disabled={!!busy}
                  onChange={(e) => {
                    setArea(e.target.value);
                    setResults(null);
                  }}
                  placeholder="Check across all areas"
                />
              </div>
              <button
                type="submit"
                disabled={!!busy}
                className={styles.primary}
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={17} aria-hidden />
                ) : (
                  <Search size={17} aria-hidden />
                )}
                {busy === "reading"
                  ? "Reading your photo…"
                  : busy === "searching"
                    ? "Checking availability…"
                    : "Find available medicines"}
                <ArrowRight size={16} aria-hidden />
              </button>
            </form>
          </div>
          <div aria-live="polite">
            {notice && <p className={styles.notice}>{notice}</p>}
            {busy === "reading" && (
              <p className={styles.notice}>
                Reading your prescription. You can review and correct the names
                next.
              </p>
            )}
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {results && (
            <section className={styles.results}>
              <p className={styles.kicker}>YOUR AVAILABILITY CHECK</p>
              <h2 ref={resultHeading} tabIndex={-1}>
                {offer
                  ? "Here’s what we found for you."
                  : "Let’s keep looking."}
              </h2>
              <p className={styles.help}>
                These are pharmacy-reported listings. They are not reservations
                or approved substitutions; confirm the exact product and form
                with the pharmacist.
              </p>
              {results.some((r) => r.truncated) && (
                <p className={styles.notice}>
                  There are many matching listings. Add a town or a more
                  specific medicine name to narrow your search.
                </p>
              )}
              {offer ? (
                <article className={styles.offer}>
                  <div className={styles.offerHead}>
                    <span>
                      <Check size={14} aria-hidden />
                      {offer.lines.length} of {results.length} medicines listed
                      in stock
                    </span>
                    <p>Matched by coverage, then listed price.</p>
                  </div>
                  <ul className={styles.lines}>
                    {offer.lines.map((line) => (
                      <li key={line.requested}>
                        <div>
                          <span>YOU ASKED FOR {line.requested}</span>
                          <Link href={line.match.href}>
                            {line.match.name}
                            <ArrowUpRight size={14} aria-hidden />
                          </Link>
                          <small>
                            Listing updated {line.match.updatedAt.slice(0, 10)}
                          </small>
                        </div>
                        <strong>
                          KES {line.match.price.toLocaleString("en-KE")}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  {offer.missing.length > 0 && (
                    <p className={styles.notice}>
                      <strong>Not included in this request:</strong>{" "}
                      {offer.missing.join(", ")}. These medicines weren’t
                      matched at this supplier. You can search them separately.
                    </p>
                  )}
                  <div className={styles.supplier}>
                    <div>
                      <span>SUPPLYING PHARMACY</span>
                      <strong>{offer.pharmacy.name}</strong>
                    </div>
                    <Link href={`/pharmacies/${offer.pharmacy.slug}`}>
                      About, contacts & directions{" "}
                      <ArrowUpRight size={15} aria-hidden />
                    </Link>
                  </div>
                  <button
                    className={styles.primary}
                    onClick={() => {
                      setRequest(offer);
                      window.scrollTo({ top: 0, behavior: "instant" });
                    }}
                  >
                    Continue with {offer.lines.length} available medicine
                    {offer.lines.length === 1 ? "" : "s"}
                    <ArrowRight size={16} aria-hidden />
                  </button>
                  <p className={styles.micro}>
                    Your request goes only to the supplying pharmacy shown
                    above. Stock is checked again when you submit.
                  </p>
                </article>
              ) : (
                <div className={pageStyles.empty}>
                  <PackageSearch size={34} aria-hidden />
                  <h3>No matching stock listings yet.</h3>
                  <p>
                    Try the exact name and strength, another area, or explore
                    all medicine listings. Nothing has been sent.
                  </p>
                  <Link
                    href="/medicines?stock=all"
                    className={pageStyles.primary}
                  >
                    Explore medicines <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              )}
            </section>
          )}
        </>
      )}
      <nav className={styles.footer} aria-label="Continue exploring">
        <Link href="/medicines">
          Explore medicines <ArrowUpRight size={14} aria-hidden />
        </Link>
        <Link href="/services">
          Explore services <ArrowUpRight size={14} aria-hidden />
        </Link>
        <Link href="/portal/refills">
          My requests <ArrowUpRight size={14} aria-hidden />
        </Link>
      </nav>
    </div>
  );
}
