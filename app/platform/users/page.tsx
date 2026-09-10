import { prismaUnscoped } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { updateUserAction } from "@/app/actions/platform";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import {
  AdaptiveDataTable,
  AdaptivePlatformPage,
  PlatformSection,
  StatusPill,
  adaptivePlatformStyles as styles,
} from "@/app/platform/_components/AdaptivePlatformPage";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const me = await getSessionUser();
  const params = await searchParams;
  const q = (params.q || "").trim();

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { profile: { is: { fullName: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  const total = await prismaUnscoped.user.count({ where }).catch(() => 0);
  const page = parsePageParam(params.page, total, PAGE_SIZE);

  const rows = await prismaUnscoped.user
    .findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        platformAdmin: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        profile: { select: { fullName: true } },
      },
    })
    .catch(() => []);

  const backParams = new URLSearchParams();
  if (q) backParams.set("q", q);
  if (page > 1) backParams.set("page", String(page));
  const backQuery = backParams.toString();
  const back = `/platform/users${backQuery ? `?${backQuery}` : ""}`;
  const activeOnPage = rows.filter((user) => user.status === "active").length;
  const adminsOnPage = rows.filter((user) => user.platformAdmin).length;

  return (
    <AdaptivePlatformPage
      eyebrow="Identity operations"
      title="User administration"
      description="Search network accounts, review access state and perform high-impact account actions with touch-friendly controls and clear status hierarchy."
      metrics={[
        { label: q ? "Search matches" : "Total accounts", value: total, hint: q ? `Matching “${q}”` : "Across the platform" },
        { label: "Active on page", value: activeOnPage, hint: `${rows.length} account${rows.length === 1 ? "" : "s"} shown` },
        { label: "Admins on page", value: adminsOnPage, hint: "Platform super-admin access" },
      ]}
    >
      <form method="GET" className={styles.searchForm}>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by email or name…"
          aria-label="Search users"
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>Search users</button>
      </form>

      <PlatformSection
        title="Account register"
        description="On mobile, every account becomes a labeled card and administrative actions expand to full-width touch targets."
      >
        <AdaptiveDataTable
          headers={["User", "Role", "Status", "Last login", "Actions"]}
          empty={q ? "No users match this search." : "No user accounts are available."}
          minWidth="52rem"
          rows={rows.map((user) => {
            const isSelf = user.id === me?.id;

            return {
              key: user.id,
              cells: [
                <div key="user" className={styles.userIdentity}>
                  <p className={styles.userName}>{user.profile?.fullName || user.email}</p>
                  <p className={styles.userEmail}>{user.email}</p>
                  <div className={styles.metaInline}>
                    {user.platformAdmin ? <StatusPill tone="warning">Super-admin</StatusPill> : null}
                    {user.emailVerified ? <span className={styles.verified}>✓ Verified email</span> : null}
                  </div>
                </div>,
                <StatusPill key="role" tone="neutral">{user.role}</StatusPill>,
                <StatusPill key="status" tone={user.status === "active" ? "success" : "danger"}>
                  {user.status}
                </StatusPill>,
                <span key="last-login" className={styles.muted}>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-KE") : "Never"}
                </span>,
                isSelf ? (
                  <span key="actions" className={styles.selfNote}>Your signed-in account</span>
                ) : (
                  <div key="actions" className={styles.actions}>
                    <form action={updateUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="back" value={back} />
                      {user.status === "active" ? (
                        <button
                          name="status"
                          value="suspended"
                          className={`${styles.actionButton} ${styles.actionDanger}`}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          name="status"
                          value="active"
                          className={`${styles.actionButton} ${styles.actionSuccess}`}
                        >
                          Reactivate
                        </button>
                      )}
                    </form>
                    <form action={updateUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="back" value={back} />
                      <button
                        name="platformAdmin"
                        value={user.platformAdmin ? "revoke" : "grant"}
                        className={`${styles.actionButton} ${user.platformAdmin ? styles.actionWarning : ""}`}
                      >
                        {user.platformAdmin ? "Revoke admin" : "Make admin"}
                      </button>
                    </form>
                  </div>
                ),
              ],
            };
          })}
        />

        <div className={styles.paginationWrap}>
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            basePath="/platform/users"
            queryParams={{ q: q || undefined }}
          />
        </div>
      </PlatformSection>
    </AdaptivePlatformPage>
  );
}
