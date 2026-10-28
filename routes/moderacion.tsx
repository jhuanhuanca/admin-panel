import { AdminShell } from "../components/AdminShell.tsx";
import {
  applyReportSanction,
  decideReport,
  liftSanction,
  listReports,
  listSanctions,
  type ReportItem,
  type SanctionItem,
} from "../lib/api/client.ts";
import { define } from "../utils.ts";

const statuses: Record<string, string> = {
  open: "Abierto",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

const reasons: Record<string, string> = {
  insulto: "Insulto",
  dato_falso: "Dato falso",
  fuera_de_tema: "Fuera de tema",
  spam: "Spam",
  datos_personales: "Datos personales",
};

export const handler = define.handlers({
  async GET(ctx) {
    const token = ctx.state.token;
    if (token === null || ctx.state.staff === null) {
      return new Response(null, {
        status: 303,
        headers: { location: "/ingresar" },
      });
    }

    return {
      data: {
        staffName: ctx.state.staff.name,
        reports: await listReports(token),
        sanctions: await listSanctions(token),
      },
    };
  },
  async POST(ctx) {
    const token = ctx.state.token;
    if (token === null) {
      return new Response(null, {
        status: 303,
        headers: { location: "/ingresar" },
      });
    }

    const form = await ctx.req.formData();
    const days = Number(form.get("days"));
    const reportId = Number(form.get("report_id"));
    const sanctionId = Number(form.get("sanction_id"));
    if (days === 1 || days === 7 || days === 30) {
      await applyReportSanction(token, reportId, days);
    } else if (sanctionId > 0) {
      await liftSanction(token, sanctionId);
    } else if (reportId > 0) {
      const status = form.get("status") === "dismissed"
        ? "dismissed"
        : "resolved";
      await decideReport(token, reportId, status);
    }

    return new Response(null, {
      status: 303,
      headers: { location: "/moderacion" },
    });
  },
});

export default define.page<typeof handler>(function ModerationPage({ data }) {
  const silenced = new Set(
    data.sanctions.map((sanction: SanctionItem) => sanction.nick),
  );

  return (
    <AdminShell name={data.staffName} current="moderacion">
      <h1 class="card-title text-2xl">Cola de moderación</h1>
      <p class="mt-2 text-sm text-bodytext">
        Silenciar impide publicar debates, comentarios y votos. La persona puede
        seguir leyendo y borrar su cuenta.
      </p>
      <h2 class="card-title mt-8 text-xl">Silencios vigentes</h2>
      {data.sanctions.length === 0
        ? <p class="mt-4 text-sm text-bodytext">No hay cuentas silenciadas.</p>
        : (
          <ul class="mt-4 flex flex-col gap-4">
            {data.sanctions.map((sanction: SanctionItem) => (
              <li key={sanction.id} class="card">
                <div class="card-body">
                  <p class="font-medium text-dark">{sanction.nick}</p>
                  <p class="mt-2 text-sm text-bodytext">
                    {reasons[sanction.reason] ?? sanction.reason}
                    {sanction.ends_at
                      ? ` · Hasta ${sanction.ends_at.slice(0, 10)}`
                      : ""}
                  </p>
                  <form method="post" class="mt-4">
                    <input
                      type="hidden"
                      name="sanction_id"
                      value={sanction.id}
                    />
                    <button type="submit" class="btn-outline-primary">
                      Levantar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      <h2 class="card-title mt-8 text-xl">Reportes</h2>
      {data.reports.length === 0
        ? <p class="mt-6 text-sm text-bodytext">No hay reportes.</p>
        : (
          <ul class="mt-6 flex flex-col gap-4">
            {data.reports.map((report: ReportItem) => (
              <li key={report.id} class="card">
                <div class="card-body">
                  <p class="text-sm text-bodytext">
                    {reasons[report.reason] ?? report.reason} ·{" "}
                    {report.target_type} · {report.reporter_nick}
                  </p>
                  <p class="mt-2 text-dark">{report.excerpt}</p>
                  {report.author_nick
                    ? (
                      <p class="mt-2 text-sm text-bodytext">
                        Autor {report.author_nick}
                      </p>
                    )
                    : null}
                  {report.body
                    ? <p class="mt-2 text-sm text-bodytext">{report.body}</p>
                    : null}
                  <p class="mt-2 text-sm font-medium">
                    {statuses[report.status] ?? report.status}
                  </p>
                  {report.status === "open"
                    ? (
                      <form method="post" class="mt-4 flex gap-2">
                        <input
                          type="hidden"
                          name="report_id"
                          value={report.id}
                        />
                        <button
                          type="submit"
                          name="status"
                          value="resolved"
                          class="btn"
                        >
                          Resolver
                        </button>
                        <button
                          type="submit"
                          name="status"
                          value="dismissed"
                          class="btn-outline-primary"
                        >
                          Descartar
                        </button>
                      </form>
                    )
                    : null}
                  {report.status === "open" && report.author_nick
                    ? silenced.has(report.author_nick)
                      ? (
                        <p class="mt-4 text-sm text-bodytext">
                          Esta cuenta está silenciada.
                        </p>
                      )
                      : (
                        <form method="post" class="mt-4 flex flex-wrap gap-2">
                          <input
                            type="hidden"
                            name="report_id"
                            value={report.id}
                          />
                          <button
                            type="submit"
                            name="days"
                            value="1"
                            class="btn-outline-primary"
                          >
                            Silenciar 1 día
                          </button>
                          <button
                            type="submit"
                            name="days"
                            value="7"
                            class="btn-outline-primary"
                          >
                            Silenciar 7 días
                          </button>
                          <button
                            type="submit"
                            name="days"
                            value="30"
                            class="btn-outline-primary"
                          >
                            Silenciar 30 días
                          </button>
                        </form>
                      )
                    : null}
                </div>
              </li>
            ))}
          </ul>
        )}
    </AdminShell>
  );
});
