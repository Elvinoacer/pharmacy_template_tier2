# Aether Pharmacy — Tier 2 Customer Engagement Platform

Tier 1 is the public digital presence. **Tier 2** adds the pharmacy’s **digital relationship manager**: customer accounts, CRM, communication, AI self-service, refill workflows, reminders, campaigns, loyalty, and analytics.

Built with **Next.js 16**, **Prisma 7**, and **Neon Postgres**.

## Stack

| Layer | Technology |
| --- | --- |
| App | Next.js App Router, React 19, Tailwind CSS 4 |
| ORM | Prisma 7 (`prisma-client` + `@prisma/adapter-neon` HTTP) |
| Database | Neon Postgres |
| Auth | Cookie sessions, bcrypt password hashes, role-based access |
| AI | Groq (knowledge-base grounded assistant) |

## Modules (Tier 2)

1. Customer accounts (register / login / password reset)
2. Customer portal dashboard
3. CRM profiles, notes, and timeline
4. Segmentation
5. Communication center (email / SMS / WhatsApp / portal threads)
6. AI virtual assistant (approved knowledge only)
7. AI-assisted refill requests
8. Refill management pipeline
9. Reminder engine
10. Campaign management
11. Loyalty (points, tiers, coupons, referrals)
12. Online enquiries
13. Customer feedback
14. AI knowledge base
15. Notification center
16. Customer preferences & consent
17. Analytics dashboard
18. CRM administration

## Quick start

```bash
npm install
cp .env.example .env.local   # or use existing .env / .env.local
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (`sslmode=require`) |
| `AUTH_SECRET` | Session signing secret (change in production) |
| `GROQ_API_KEY` | AI assistant |
| `GROQ_MODEL` | Optional model override |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

### Demo accounts

Password for all: **`Password123!`**

| Email | Role | Entry |
| --- | --- | --- |
| `jane@example.com` | Customer | `/portal` |
| `john@example.com` | Customer | `/portal` |
| `staff@aetherpharmacy.com` | Staff | `/admin` |
| `pharmacist@aetherpharmacy.com` | Pharmacist | `/admin` |
| `manager@aetherpharmacy.com` | Manager | `/admin` |

## Key routes

### Public (Tier 1 + hooks)

- `/` website, `/refill`, `/contact`, `/delivery`, `/careers`
- Forms write into CRM (refills → `refill_requests`, contact/delivery/careers → `enquiries`)

### Auth

- `/register`, `/login`, `/forgot-password`, `/reset-password`

### Customer portal

- `/portal` dashboard
- `/portal/refills`, `/portal/prescriptions`, `/portal/caregivers`
- `/portal/messages`, `/portal/loyalty`, `/portal/preferences`
- `/portal/profile`, `/portal/feedback`

### Staff CRM

- `/admin` analytics
- `/admin/customers`, `/admin/customers/[id]` (timeline, notes, messaging)
- `/admin/refills`, `/admin/enquiries`, `/admin/messages`
- `/admin/campaigns`, `/admin/segments`, `/admin/reminders`
- `/admin/notifications`, `/admin/loyalty`, `/admin/feedback`
- `/admin/knowledge`, `/admin/templates`

## Database (Prisma)

- Schema: `prisma/schema.prisma`
- Config: `prisma.config.ts` (Prisma 7)
- Client output: `app/generated/prisma`
- Client singleton: `app/lib/db/prisma.ts` (Neon **HTTP** adapter — no raw SQL in app code)

```bash
npm run db:generate   # prisma generate
npm run db:push       # push schema
npm run db:seed       # demo data
npm run db:studio     # Prisma Studio
```

## AI safety

The assistant uses Tier 1 pharmacy facts plus **approved** knowledge articles from the CRM. It must not diagnose, prescribe, change doses, or interpret labs. Uncertain or clinical questions are escalated to staff; conversations are stored for analytics.

## Out of scope (Tier 3)

Inventory, POS, suppliers, stock, dispensing workflow, barcode, accounting, payroll, warehouse.

## Scripts

```bash
npm run dev
npm run build    # prisma generate && next build
npm run start
npm run lint
```
