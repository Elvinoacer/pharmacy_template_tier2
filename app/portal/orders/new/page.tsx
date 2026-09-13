import { redirect } from "next/navigation";
import { findAvailableInventory } from "@/app/lib/services/available-inventory";
import { z } from "zod";
export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ medicationId?: string }> }) {
  const { medicationId } = await searchParams;
  if (medicationId && z.string().uuid().safeParse(medicationId).success) {
    const [item] = await findAvailableInventory([medicationId]);
    if (item) redirect(`/p/${item.pharmacy.slug}/order?medicationId=${item.id}`);
  }
  redirect("/medicines");
}
