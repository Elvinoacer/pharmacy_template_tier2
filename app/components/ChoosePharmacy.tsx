import Link from "next/link";
import { ArrowRight, FileUp, HeartPulse, Pill } from "lucide-react";
import CareHero from "./care/CareHero";
import styles from "./care/CarePages.module.css";
/** Legacy tenant-dependent entrances now return to care discovery, never a pharmacy picker. */
export default async function ChoosePharmacy({
  next = "/",
}: {
  next?: string;
  title?: string;
  description?: string;
}) {
  const service =
    next.startsWith("/services") ||
    next.startsWith("/screenings") ||
    next.startsWith("/vaccinations");
  return (
    <div className={styles.page}>
      <CareHero
        section={service ? "services" : "medicines"}
        eyebrow="START WITH WHAT YOU NEED"
        title="The right starting point,"
        accent="a simpler next step."
        description="Find an available medicine or service. Its listing connects you to the pharmacy providing it, without a separate pharmacy selection."
      />
      <div className={styles.empty}>
        <h3>
          {service ? "Explore available services" : "Find your medicine first"}
        </h3>
        <p>
          Open a listing to continue with its details, price, and availability.
          You can inspect the pharmacy’s profile along the way.
        </p>
        <Link
          href={service ? "/services" : "/medicines"}
          className={styles.primary}
        >
          {service ? (
            <HeartPulse size={17} aria-hidden />
          ) : (
            <Pill size={17} aria-hidden />
          )}{" "}
          {service ? "Explore services" : "Explore medicines"}
          <ArrowRight size={16} aria-hidden />
        </Link>
        <Link href="/prescription" className={styles.primary}>
          <FileUp size={16} aria-hidden />
          Upload prescription
        </Link>
      </div>
    </div>
  );
}
