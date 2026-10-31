import { AdminShell } from "../components/AdminShell.tsx";
import {
  type DashboardUser,
  loadDashboard,
  releaseDevice,
} from "../lib/api/client.ts";
import DirectoryFilters from "../islands/DirectoryFilters.tsx";
import { define } from "../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = ctx.state.token;
    if (token === null) {
      return new Response(null, {
        status: 303,
        headers: { location: "/ingresar" },
      });
    }

    const url = new URL(ctx.req.url);
    const q = url.searchParams.get("q") ?? "";
    const department = url.searchParams.get("department") ?? "";
    const municipality = url.searchParams.get("municipality") ?? "";
    const confirmar = url.searchParams.get("confirmar") ?? "";
    const dashboard = await loadDashboard(token, { q, department, municipality });

    return {
      data: {
        staffName: ctx.state.staff?.name ?? "Mesa",
        counts: dashboard?.counts ?? { users: 0, open_reports: 0, debates: 0 },
        users: dashboard?.users ?? [],
        q,
        department,
        municipality,
        confirmar,
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
    const nick = String(form.get("nick") ?? "");
    if (/^[A-Za-z0-9_]{3,20}$/.test(nick)) {
      await releaseDevice(token, nick);
    }

    return new Response(null, {
      status: 303,
      headers: { location: "/" },
    });
  },
});

export default define.page<typeof handler>(function DashboardPage({ data }) {
  return (
    <AdminShell name={data.staffName} current="inicio">
      <h1 class="card-title text-2xl">Panel</h1>
      <ul class="mt-6 grid grid-cols-3 gap-6">
        <li class="card">
          <div class="card-body">
            <p class="card-subtitle">Cuentas</p>
            <p class="mt-2 text-3xl">{data.counts.users}</p>
          </div>
        </li>
        <li class="card">
          <div class="card-body">
            <p class="card-subtitle">Reportes abiertos</p>
            <p class="mt-2 text-3xl">{data.counts.open_reports}</p>
          </div>
        </li>
        <li class="card">
          <div class="card-body">
            <p class="card-subtitle">Debates</p>
            <p class="mt-2 text-3xl">{data.counts.debates}</p>
          </div>
        </li>
      </ul>
      <div class="card mt-6">
        <div class="card-body">
          <h2 class="card-title">Cuentas</h2>
          <p class="mt-2 text-sm text-bodytext">
            El nombre y el departamento distinguen a la persona. Liberar deja
            la cuenta a la espera hasta el próximo ingreso con ese nick.
          </p>
          <DirectoryFilters
            action="/"
            q={data.q}
            department={data.department}
            municipality={data.municipality}
          />
          {data.confirmar
            ? (
              <form method="post" class="mt-4 rounded-md border border-border p-4">
                <p class="text-sm text-dark">
                  Vas a liberar el dispositivo de <strong>{data.confirmar}</strong>.
                  La cuenta queda a la espera de un navegador nuevo.
                </p>
                <input type="hidden" name="nick" value={data.confirmar} />
                <div class="mt-3 flex gap-2">
                  <button type="submit" class="btn">Confirmar liberación</button>
                  <a
                    href={`/?q=${encodeURIComponent(data.q)}&department=${encodeURIComponent(data.department)}&municipality=${encodeURIComponent(data.municipality)}`}
                    class="btn-outline-primary"
                  >
                    Cancelar
                  </a>
                </div>
              </form>
            )
            : null}
          {data.users.length === 0
            ? <p class="mt-4 text-sm text-bodytext">No hay cuentas.</p>
            : (
              <div class="mt-4 overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead>
                    <tr class="text-bodytext">
                      <th class="py-3">Persona</th>
                      <th class="py-3">Lugar</th>
                      <th class="py-3">Dispositivo</th>
                      <th class="py-3">Última visita</th>
                      <th class="py-3">Métricas</th>
                      <th class="py-3">Alta</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {data.users.map((user: DashboardUser) => (
                      <tr key={user.nick}>
                        <td class="py-3 font-medium text-dark">
                          <span class="block">{user.name || user.nick}</span>
                          <span class="text-xs text-bodytext">{user.nick}</span>
                        </td>
                        <td class="py-3">
                          {user.department || "Sin departamento"}
                          <span class="block text-xs text-bodytext">{user.municipality || "Sin municipio"}</span>
                        </td>
                        <td class="py-3">
                          {user.device_registered
                            ? (
                              <a
                                href={`/?confirmar=${encodeURIComponent(user.nick)}&q=${encodeURIComponent(data.q)}&department=${encodeURIComponent(data.department)}&municipality=${encodeURIComponent(data.municipality)}`}
                                class="btn btn-outline-primary btn-sm"
                              >
                                Liberar
                              </a>
                            )
                            : "Sin dispositivo"}
                        </td>
                        <td class="py-3">
                          {user.last_seen_at ? user.last_seen_at.slice(0, 16).replace("T", " ") : "Sin visita"}
                        </td>
                        <td class="py-3">
                          {user.metrics_consent ? "Activas" : "Sin métricas"}
                        </td>
                        <td class="py-3">
                          {user.created_at ? user.created_at.slice(0, 10) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </AdminShell>
  );
});
