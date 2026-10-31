import { AdminShell } from "../components/AdminShell.tsx";
import { loadStatus } from "../lib/api/client.ts";
import { define } from "../utils.ts";

const empty = {
  database: "down" as const,
  queue: { driver: "otra", pending: 0, failed: 0 },
  attention: { open_reports: 0, sanctions: 0, leaders: 0 },
  failure: null,
};

const drivers: Record<string, string> = {
  inmediata: "Inmediata",
  base: "Base de datos",
  redis: "Redis",
  otra: "Otra",
};

export const handler = define.handlers({
  async GET(ctx) {
    const token = ctx.state.token;
    if (token === null) {
      return new Response(null, {
        status: 303,
        headers: { location: "/ingresar" },
      });
    }

    const status = await loadStatus(token);

    return {
      data: {
        staffName: ctx.state.staff?.name ?? "Mesa",
        status: status ?? empty,
      },
    };
  },
});

function Card(props: { label: string; value: string | number }) {
  return (
    <li class="card">
      <div class="card-body">
        <p class="card-subtitle">{props.label}</p>
        <p class="mt-2 text-3xl">{props.value}</p>
      </div>
    </li>
  );
}

export default define.page<typeof handler>(function StatusPage({ data }) {
  const status = data.status;
  const failure = status.failure;

  return (
    <AdminShell name={data.staffName} current="estado">
      <h1 class="card-title text-2xl">Estado</h1>
      <p class="mt-2 text-sm text-bodytext">
        Salud de la plataforma y lo que pide atención. No muestra cuentas ni el
        detalle de los trabajos.
      </p>
      <ul class="kpi-grid mt-6">
        <Card
          label="Base de datos"
          value={status.database === "ok" ? "En línea" : "No responde"}
        />
        <Card label="Cola" value={drivers[status.queue.driver] ?? "Otra"} />
        <Card label="Trabajos pendientes" value={status.queue.pending} />
        <Card label="Trabajos fallidos" value={status.queue.failed} />
        <Card label="Reportes abiertos" value={status.attention.open_reports} />
        <Card label="Silencios" value={status.attention.sanctions} />
        <Card label="Candidatos pendientes" value={status.attention.leaders} />
      </ul>
      <div class="card mt-6">
        <div class="card-body">
          <h2 class="card-title">Último trabajo fallido</h2>
          {failure === null
            ? <p class="mt-4 text-sm text-bodytext">Ninguno.</p>
            : (
              <p class="mt-4 text-dark">
                {failure.name}
                {failure.failed_at
                  ? ` · ${failure.failed_at.slice(0, 16).replace("T", " ")}`
                  : ""}
              </p>
            )}
        </div>
      </div>
    </AdminShell>
  );
});
