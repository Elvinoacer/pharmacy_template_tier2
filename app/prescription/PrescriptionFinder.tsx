"use client";
import NearbyLocation from "@/app/components/location/NearbyLocation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Camera,
  Check,
  FileUp,
  Loader2,
  MapPin,
  PackageSearch,
  Search,
  Send,
  Split,
} from "lucide-react";
import RefillForm from "@/app/components/RefillForm";
import CareHero from "@/app/components/care/CareHero";
import { UploadFeedback } from "@/app/components/prescription/UploadFeedback";
import {
  MAX_PRESCRIPTION_MEDICINES,
  prescriptionNames,
} from "@/app/lib/prescription-discovery";
import {
  availabilityOffer,
  splitAvailabilityOffers,
  type CareOffer,
  type CareResult,
} from "@/app/lib/care-availability";
import {
  availabilitySearchFeedback,
  feedbackFromApiPayload,
  photoReadFeedback,
  type UploadFeedbackModel,
} from "@/app/lib/prescription-upload-feedback";
import pageStyles from "@/app/components/care/CarePages.module.css";
import styles from "./PrescriptionFinder.module.css";

export default function PrescriptionFinder({
  mode = "prescription",
  initialResults = null,
  initialError = "",
  nearby = false,
  pharmacies = [],
}: {
  mode?: "prescription" | "refill";
  initialResults?: CareResult[] | null;
  initialError?: string;
  nearby?: boolean;
  pharmacies?: Array<{
    id: string;
    name: string;
    slug: string;
    city: string | null;
    county: string | null;
    distanceKm?: number | null;
  }>;
}) {
  const [names, setNames] = useState(
    initialResults?.map((r) => r.name).join("\n") || "",
  );
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState<"reading" | "searching" | null>(null);
  const [feedback, setFeedback] = useState<UploadFeedbackModel | null>(
    initialError
      ? {
          code: "initial",
          tone: "warning",
          title: "This listing needs another look",
          message: initialError,
          actions: [
            { id: "focus_names", label: "Search another medicine", variant: "primary" },
            { id: "browse", label: "Browse medicines", href: "/medicines", variant: "ghost" },
            { id: "refer", label: "Send to a pharmacist", variant: "secondary" },
          ],
        }
      : null,
  );
  const [results, setResults] = useState<CareResult[] | null>(initialResults);
  const [request, setRequest] = useState<CareOffer | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [referralName, setReferralName] = useState("");
  const [referralPhone, setReferralPhone] = useState("");
  const [referralPharmacySlug, setReferralPharmacySlug] = useState(pharmacies[0]?.slug || "");
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralSuccess, setReferralSuccess] = useState<string | null>(null);
  const [referralFeedback, setReferralFeedback] = useState<UploadFeedbackModel | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const namesInput = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const referralSection = useRef<HTMLElement>(null);
  const filteredPharmacies = useMemo(() => {
    const needle = pharmacyQuery.trim().toLowerCase();
    if (!needle) return pharmacies;
    return pharmacies.filter((pharmacy) =>
      [pharmacy.name, pharmacy.city, pharmacy.county]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [pharmacies, pharmacyQuery]);

  function openReferral() {
    setShowReferral(true);
    requestAnimationFrame(() => {
      referralSection.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function handleFeedbackAction(id: string) {
    if (id === "retry_photo") {
      fileInput.current?.click();
      return;
    }
    if (id === "focus_names") {
      namesInput.current?.focus();
      namesInput.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (id === "search" || id === "retry_search") {
      void search();
      return;
    }
    if (id === "retry_submit") {
      const form = referralSection.current?.querySelector("form");
      if (form instanceof HTMLFormElement) form.requestSubmit();
      return;
    }
    if (id === "refer") openReferral();
  }

  async function readPhoto(file?: File) {
    if (!file) return;
    setResults(null);
    setRequest(null);
    if (file.size === 0) {
      setFeedback(photoReadFeedback({ code: "missing_file" }));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback(photoReadFeedback({ code: "invalid_type" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback(photoReadFeedback({ code: "file_too_large" }));
      return;
    }
    setBusy("reading");
    setFeedback(photoReadFeedback({ code: "reading" }));
    const reader = new FileReader();
    reader.onload = () => setUploadedPhoto(reader.result as string);
    reader.onerror = () => {
      setFeedback(photoReadFeedback({ code: "read_failed" }));
      setBusy(null);
    };
    reader.readAsDataURL(file);
    try {
      const body = new FormData();
      body.set("image", file);
      const res = await fetch("/api/prescription-search", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      const names = Array.isArray(data.names)
        ? data.names.filter((name: unknown) => typeof name === "string")
        : [];
      if (names.length) setNames(names.join("\n"));
      const next = feedbackFromApiPayload(
        data,
        photoReadFeedback({
          code: !res.ok
            ? res.status === 429
              ? "rate_limited"
              : "read_failed"
            : names.length
              ? "read_ok"
              : "unreadable",
          nameCount: names.length,
        }),
      );
      setFeedback(next);
      if (next.code === "unreadable" || next.tone === "error") {
        setShowReferral(true);
      }
      requestAnimationFrame(() => namesInput.current?.focus());
    } catch {
      setFeedback(photoReadFeedback({ code: "network" }));
      setShowReferral(true);
    } finally {
      setBusy(null);
    }
  }
  async function search(event?: FormEvent) {
    event?.preventDefault();
    setRequest(null);
    const list = prescriptionNames(names);
    if (
      !list.length ||
      list.length > MAX_PRESCRIPTION_MEDICINES ||
      list.some((n) => n.length < 2 || n.length > 120)
    ) {
      setFeedback(availabilitySearchFeedback({ code: "validation" }));
      namesInput.current?.focus();
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(
          feedbackFromApiPayload(
            data,
            availabilitySearchFeedback({
              code: res.status === 429 ? "rate_limited" : "search_failed",
            }),
          ),
        );
        setShowReferral(true);
        return;
      }
      setResults(data.results);
      setFeedback(null);
      requestAnimationFrame(() => {
        resultHeading.current?.focus();
        resultHeading.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      });
    } catch {
      setFeedback(availabilitySearchFeedback({ code: "search_failed" }));
      setShowReferral(true);
    } finally {
      setBusy(null);
    }
  }

  const offer = results ? availabilityOffer(results) : null;
  const splitPlan = results ? splitAvailabilityOffers(results) : null;

  async function handleReferralSubmit(e: FormEvent) {
    e.preventDefault();
    setReferralBusy(true);
    setReferralFeedback(null);
    setReferralSuccess(null);
    try {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Nairobi",
      }).format(new Date());
      const targetSlug = referralPharmacySlug || pharmacies[0]?.slug;
      if (!targetSlug) {
        throw new Error("Please choose a pharmacy to refer your prescription to.");
      }
      const res = await fetch("/api/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacySlug: targetSlug,
          fullName: referralName.trim(),
          phone: referralPhone.trim(),
          medicine: names.trim() || "Prescription Referral",
          pickupDate: today,
          pickupPreference: "pickup",
          prescriptionPhoto: uploadedPhoto || undefined,
          notes: uploadedPhoto
            ? `[Attached Prescription Photo]\nRequested Items:\n${names}`
            : `Prescription referral for clinical review and sourcing.\nRequested Items:\n${names}`,
          requestKind: "prescription_referral",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "prescription_referral_limit") {
          const selectedName =
            data.selectedPharmacy?.name || "The pharmacy you selected";
          const alternativeName = data.alternative?.name || null;
          const alternativeSlug = data.alternative?.slug || null;

          if (alternativeSlug) setReferralPharmacySlug(alternativeSlug);
          setReferralFeedback({
            code: "referral_capacity",
            tone: "warning",
            title: `${selectedName} is not taking additional Afyvia-routed prescriptions right now`,
            message: alternativeName
              ? `Your prescription was not shared without your permission. ${alternativeName} can receive a new Afyvia referral now, so we selected that pharmacy for you to review before sending.`
              : "Your prescription was not shared. Choose another available pharmacy and send it there instead.",
            actions: alternativeName
              ? [
                  { id: "retry_submit", label: `Send to ${alternativeName}`, variant: "primary" },
                  { id: "pharmacies", label: "Choose another pharmacy", href: "/pharmacies", variant: "ghost" },
                ]
              : [
                  { id: "pharmacies", label: "Choose another pharmacy", href: "/pharmacies", variant: "primary" },
                  { id: "retry_search", label: "Check availability", variant: "secondary" },
                ],
          });
          return;
        }
        throw new Error(
          data.error === "validation_failed"
            ? Object.values(data.fields || {}).flat()[0] || "Check form details."
            : data.error || "Could not submit referral.",
        );
      }
      setReferralSuccess(data.reference || "RF-RECEIVED");
      setReferralFeedback({
        code: "referral_ok",
        tone: "success",
        title: "Prescription sent to the pharmacy",
        message: `Reference ${data.reference || "RF-RECEIVED"}. The team will review the details${uploadedPhoto ? " and the photo" : ""} and contact you. You can keep checking public listings while you wait.`,
        actions: [
          { id: "browse", label: "Browse medicines", href: "/medicines", variant: "ghost" },
          { id: "pharmacies", label: "Find a pharmacy", href: "/pharmacies", variant: "ghost" },
        ],
      });
    } catch (err) {
      setReferralFeedback({
        code: "referral_failed",
        tone: "error",
        title: "We couldn’t send this to the pharmacy",
        message:
          err instanceof Error
            ? `${err.message} You can try again, check availability yourself, or pick another pharmacy.`
            : "Try submitting again, check availability yourself, or pick another pharmacy.",
        actions: [
          { id: "retry_submit", label: "Try sending again", variant: "primary" },
          { id: "retry_search", label: "Check availability", variant: "secondary" },
          { id: "pharmacies", label: "Find a pharmacy", href: "/pharmacies", variant: "ghost" },
        ],
      });
    } finally {
      setReferralBusy(false);
    }
  }
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
      <NearbyLocation active={nearby} />
      <ol className={styles.steps} aria-label="Your progress">
        {["Your medicines", "Availability", "Review request"].map(
          (label, i) => {
            const currentStep = request ? 2 : results ? 1 : 0;
            return (
            <li
              key={label}
              aria-current={currentStep === i ? "step" : undefined}
              data-complete={i < currentStep ? "true" : undefined}
            >
              <span>{i + 1}</span>
              {label}
            </li>
            );
          },
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
            before dispensing.{uploadedPhoto ? " Your prescription photo will be securely attached to this request." : ""}
          </p>
          <RefillForm
            key={request.pharmacy.id}
            pharmacyName={request.pharmacy.name}
            pharmacySlug={request.pharmacy.slug}
            inventoryIds={[...new Set(request.lines.map((l) => l.match.id))]}
            initialMedicine={request.lines.map((l) => l.match.name).join("\n")}
            uploadedPhoto={uploadedPhoto}
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
              {uploadedPhoto && (
                <div className={styles.preview}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                  <img src={uploadedPhoto} alt="Uploaded prescription preview" />
                </div>
              )}
              <div className={styles.fileRow}>
                <label className={styles.fileLabel}>
                  <FileUp size={17} aria-hidden />{" "}
                  {uploadedPhoto ? "Replace photo" : "Upload prescription"}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!!busy}
                    onChange={(e) => {
                      void readPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className={styles.fileLabel}>
                  <Camera size={17} aria-hidden /> Take photo
                  <input
                    ref={cameraInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={!!busy}
                    onChange={(e) => {
                      void readPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
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
          {feedback && (
            <UploadFeedback
              feedback={feedback}
              onAction={handleFeedbackAction}
            />
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
                    Try the exact name and strength, another area, or send this
                    prescription to a pharmacist. Nothing has been sent.
                  </p>
                  <div className={styles.emptyActions}>
                    <button
                      type="button"
                      className={pageStyles.primary}
                      onClick={() => namesInput.current?.focus()}
                    >
                      Edit names <ArrowRight size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={openReferral}
                    >
                      Send to a pharmacist <ArrowRight size={16} aria-hidden />
                    </button>
                    <Link
                      href="/medicines?stock=all"
                      className={pageStyles.primary}
                    >
                      Explore medicines <ArrowRight size={16} aria-hidden />
                    </Link>
                  </div>
                </div>
              )}

              {splitPlan && splitPlan.offers.length > 1 && (
                <article className="mt-6 rounded-3xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] pb-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                        <Split className="h-3.5 w-3.5" /> Multi-Pharmacy Split Fulfillment
                      </span>
                      <h4 className="mt-1 text-sm font-bold text-[var(--foreground)]">
                        Fulfill {splitPlan.totalCovered} of {results.length} medicines across {splitPlan.offers.length} pharmacies
                      </h4>
                    </div>
                    <span className="text-sm font-extrabold text-[var(--foreground)]">
                      Total: KES {splitPlan.totalPrice.toLocaleString("en-KE")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    When no single pharmacy has every medicine, our split coverage plan pairs your items with the closest pharmacies in stock.
                  </p>
                  <div className="mt-4 space-y-3">
                    {splitPlan.offers.map((planOffer, idx) => (
                      <div key={planOffer.pharmacy.id} className="rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card)] p-3.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">Pharmacy #{idx + 1}</span>
                            <h5 className="text-xs font-bold text-[var(--foreground)]">{planOffer.pharmacy.name}</h5>
                            <p className="text-[11px] text-[var(--muted)]">
                              {[planOffer.pharmacy.city, planOffer.pharmacy.county].filter(Boolean).join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRequest(planOffer);
                              window.scrollTo({ top: 0, behavior: "instant" });
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#0d6e5a] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#084c3f]"
                          >
                            Request {planOffer.lines.length} med{planOffer.lines.length === 1 ? "" : "s"} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <ul className="mt-2.5 divide-y divide-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] border-t border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] pt-2 text-xs">
                          {planOffer.lines.map((l) => (
                            <li key={l.requested} className="flex items-center justify-between py-1 text-[11px]">
                              <span className="text-[var(--foreground)] font-medium">{l.requested}</span>
                              <span className="font-bold text-[var(--foreground)]">KES {l.match.price.toLocaleString("en-KE")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              )}

            </section>
          )}
          {(showReferral || (results && (!offer || offer.missing.length > 0))) && (
            <article
              ref={referralSection}
              className="mt-6 rounded-3xl border border-amber-700/60 bg-amber-500/10 p-5 shadow-xs dark:border-amber-300/60 dark:bg-amber-950/20"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-700/60 bg-amber-500/20 text-amber-800 dark:border-amber-300/60 dark:text-amber-100">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">
                    {results
                      ? "Missing medicines? Send this prescription to a pharmacist"
                      : "Keep going — a pharmacist can take this from here"}
                  </h4>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {uploadedPhoto
                      ? "We’ll include the photo you uploaded. The pharmacy can read the names, check back-office stock, or clarify with your doctor."
                      : "Verified pharmacies can check back-office inventory, source from certified distributors, or clarify with your doctor."}
                  </p>
                </div>
              </div>

              {referralFeedback && (
                <UploadFeedback
                  feedback={referralFeedback}
                  onAction={handleFeedbackAction}
                />
              )}

              {referralSuccess ? null : (
                <form onSubmit={handleReferralSubmit} className="mt-4 space-y-3 text-xs">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--foreground)]">Your full name *</label>
                      <input
                        required
                        value={referralName}
                        onChange={(e) => setReferralName(e.target.value)}
                        placeholder="e.g. Jane Kamau"
                        className="input-admin w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--foreground)]">Phone number *</label>
                      <input
                        required
                        value={referralPhone}
                        onChange={(e) => setReferralPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        className="input-admin w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--foreground)]">Target Pharmacy *</label>
                      <input
                        type="search"
                        value={pharmacyQuery}
                        onChange={(e) => setPharmacyQuery(e.target.value)}
                        placeholder="Search by name or town"
                        className="input-admin mb-1.5 w-full text-xs"
                        aria-label="Search pharmacies"
                      />
                      <select
                        value={referralPharmacySlug}
                        onChange={(e) => setReferralPharmacySlug(e.target.value)}
                        className="input-admin w-full text-xs"
                        required
                      >
                        {filteredPharmacies.length > 0 ? (
                          filteredPharmacies.map((p) => (
                            <option key={p.id} value={p.slug}>
                              {p.name} ({p.city || "Kenya"}
                              {p.distanceKm != null ? ` · ${p.distanceKm.toFixed(1)} km` : ""})
                            </option>
                          ))
                        ) : (
                          <option value="">
                            {pharmacies.length ? "No pharmacies match that search" : "Nearby verified pharmacy"}
                          </option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={referralBusy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--background)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] disabled:bg-[var(--card-elev)] disabled:text-[var(--muted)] disabled:opacity-100"
                    >
                      {referralBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {referralBusy ? "Submitting referral…" : "Submit prescription to pharmacy"}
                    </button>
                  </div>
                </form>
              )}
            </article>
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
