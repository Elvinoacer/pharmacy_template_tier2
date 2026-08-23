import { prismaUnscoped } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { updateUserAction } from "@/app/actions/platform";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";

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

  const back = `/platform/users${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        User administration
      </h1>
      <p className="mt-2 text-sm text-teal-100/70">
        Search every account on the network, suspend abusive users, and grant or revoke super-admin
        access. Suspended users are signed out immediately.
      </p>

      <form method="GET" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by email or name…"
          aria-label="Search users"
          className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-4 text-sm outline-none placeholder:text-teal-100/40 focus:border-teal-300/40"
        />
        <button type="submit" className="h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold hover:bg-white/15">
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-teal-100/60">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-teal-100/50">
                  No users match this search.
                </td>
              </tr>
            )}
            {rows.map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} className="align-top hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.profile?.fullName || u.email}</p>
                    <p className="text-xs text-teal-100/50">{u.email}</p>
                    {u.platformAdmin && (
                      <span className="mt-1 inline-flex rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                        Super-admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-teal-100/80">
                    {u.role}
                    {u.emailVerified && <span className="ml-1 text-emerald-300" title="Email verified">✓</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${
                        u.status === "active" ? "border-emerald-300/40 text-emerald-200" : "border-rose-300/40 text-rose-200"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-teal-100/60">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-KE") : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <span className="text-xs text-teal-100/40">That&apos;s you</span>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <form action={updateUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="back" value={back} />
                          {u.status === "active" ? (
                            <button
                              name="status"
                              value="suspended"
                              className="rounded-full border border-rose-400/40 px-2.5 py-1 text-[11px] text-rose-100 hover:bg-rose-400/10"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              name="status"
                              value="active"
                              className="rounded-full border border-emerald-400/40 px-2.5 py-1 text-[11px] text-emerald-100 hover:bg-emerald-400/10"
                            >
                              Reactivate
                            </button>
                          )}
                        </form>
                        <form action={updateUserAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="back" value={back} />
                          <button
                            name="platformAdmin"
                            value={u.platformAdmin ? "revoke" : "grant"}
                            className={`rounded-full border px-2.5 py-1 text-[11px] hover:bg-white/5 ${
                              u.platformAdmin ? "border-amber-300/40 text-amber-200" : "border-white/20 text-teal-100/80"
                            }`}
                          >
                            {u.platformAdmin ? "Revoke admin" : "Make admin"}
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/platform/users"
        queryParams={{ q: q || undefined }}
      />
    </div>
  );
}
