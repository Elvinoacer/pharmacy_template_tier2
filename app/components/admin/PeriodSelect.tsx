"use client";

/**
 * Client-side period filter for admin orders. Navigates on change so the
 * parent Server Component can stay free of event handlers.
 */
export default function PeriodSelect({
  period,
  status,
}: {
  period: string;
  status?: string;
}) {
  return (
    <select
      name="period"
      defaultValue={period}
      onChange={(e) => {
        const next = e.target.value;
        const params = new URLSearchParams();
        params.set("period", next);
        if (status) params.set("status", status);
        window.location.href = `/admin/orders?${params.toString()}`;
      }}
      className="input-admin !w-auto"
    >
      <option value="today">Today</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="quarter">This quarter</option>
      <option value="year">Last year</option>
    </select>
  );
}
