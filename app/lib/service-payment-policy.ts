export function isServicePayableAfter(service: {
  eligibility?: string | null;
  description?: string | null;
}): boolean {
  if (/\[payable:before\]/i.test(service.eligibility || "")) return false;
  const text = `${service.eligibility || ""} ${service.description || ""}`.toLowerCase();
  return (
    text.includes("[payable:after]") ||
    text.includes("payable after") ||
    text.includes("pay at visit") ||
    text.includes("pay at clinic") ||
    text.includes("pay at pharmacy")
  );
}

export type PaymentPolicy = "ONLINE_REQUIRED" | "PAY_AT_VISIT" | "FREE" | "UNAVAILABLE";

export function getServicePaymentPolicy(service: {
  price?: { toString(): string } | number | null;
  eligibility?: string | null;
  description?: string | null;
}, onlinePaymentsEnabled = true): PaymentPolicy {
  const price =
    service.price == null
      ? null
      : typeof service.price === "number"
        ? service.price
        : Number(service.price.toString());
  const hasPrice = price != null && Number.isFinite(price) && price > 0;
  if (!hasPrice) return "FREE";
  if (isServicePayableAfter(service)) return "PAY_AT_VISIT";
  if (onlinePaymentsEnabled) return "ONLINE_REQUIRED";
  return /\[payable:before\]/i.test(service.eligibility || "") ? "UNAVAILABLE" : "PAY_AT_VISIT";
}

