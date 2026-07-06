import { prisma } from "@/lib/prisma";
import { buildDeploymentChecklist } from "@/services/deployment-checklist";

export const dynamic = "force-dynamic";

export default async function DeploymentChecklistPage() {
  const databaseConnected = await checkDatabaseConnection();
  const checklist = buildDeploymentChecklist({ databaseConnected });

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm text-zinc-500">Admin</p>
          <h1 className="text-3xl font-semibold">Deployment Checklist</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Vercel readiness checks for Mummur Next MVP. This page does not display secrets.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Build version" value={checklist.buildVersion} />
          <SummaryCard label="App base URL" value={checklist.appBaseUrl} />
          <SummaryCard label="Environment mode" value={checklist.environmentMode} />
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-4 text-lg font-semibold">Checks</h2>
          <div className="grid gap-3">
            {checklist.items.map((item) => (
              <div key={item.key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{item.label}</div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      item.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {item.ok ? "PASS" : "WARN"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 break-all text-sm font-medium text-zinc-100">{value || "Not configured"}</div>
    </div>
  );
}

async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
