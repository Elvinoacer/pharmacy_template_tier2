import { getBrowseLocation } from "@/app/lib/browse-location";
import PrescriptionFinder from "./PrescriptionFinder";
export const metadata = {
  title: "Find medicines from your prescription",
  description:
    "Upload a prescription photo, review medicine names and compare pharmacy availability.",
};
export default async function PrescriptionPage() {
  return <PrescriptionFinder nearby={Boolean(await getBrowseLocation())} />;
}
