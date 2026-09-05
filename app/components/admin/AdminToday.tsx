import Link from "next/link";
import { ArrowRight, ClipboardList, MessageSquare, ShieldCheck, Plus, ShoppingCart, Users, Package } from "lucide-react";

export function AdminToday({ refills, enquiries, escalations }: { refills: number; enquiries: number; escalations: number }) {
  const queues = [
    { label: "Refills to progress", count: refills, description: "Review requests and move approved refills toward collection.", href: "/admin/refills", action: "Open refill queue", Icon: ClipboardList },
    { label: "Patients awaiting a reply", count: enquiries, description: "Read open questions and help patients take their next step.", href: "/admin/enquiries", action: "Review enquiries", Icon: MessageSquare },
    { label: "Conversations for review", count: escalations, description: "Check conversations the assistant has escalated to your team.", href: "/admin/ai", action: "Open review queue", Icon: ShieldCheck },
  ];
  return <section aria-labelledby="admin-today-title" className="admin-today mb-8">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="admin-today-title" className="text-lg font-semibold">Start with what needs attention</h2><Link href="/admin/inbox" className="btn-admin-ghost">All alerts <ArrowRight size={16} /></Link></div>
    <div className="admin-task-grid">{queues.map(({ label, count, description, href, action, Icon }) => <Link key={href} href={href} className="admin-task-card"><div className="flex items-center justify-between gap-3"><h3>{label}</h3><Icon size={20} className="admin-accent-text" aria-hidden="true" /></div><strong>{count.toLocaleString()}</strong><p>{description}</p><span>{action}<ArrowRight size={17} aria-hidden="true" /></span></Link>)}</div>
    <nav aria-label="Common tasks" className="mt-5 flex flex-wrap gap-2">
      <Link href="/admin/prescriptions/new" className="btn-admin"><Plus size={17} />New prescription</Link>
      <Link href="/admin/orders#record-sale" className="btn-admin-ghost"><ShoppingCart size={17} />Record a sale</Link>
      <Link href="/admin/customers" className="btn-admin-ghost"><Users size={17} />Find a patient</Link>
      <Link href="/admin/inventory" className="btn-admin-ghost"><Package size={17} />Check stock</Link>
    </nav>
  </section>;
}
