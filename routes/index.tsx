import { AdminShell } from "../components/AdminShell.tsx";
import {
  type DashboardUser,
  loadDashboard,
  releaseDevice,
} from "../lib/api/client.ts";
import { define } from "../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = ctx.state.token;
    if (token === null || ctx.state.staff === null) {
      return new Response(null, {
        status: 303,
        headers: { location: "/ingresar" },
      });
    }

    const dashboard = await loadDashboard(token);

    return {
      data: {
        staffName: ctx.state.staff.name,
        counts: dashboard?.counts ?? { users: 0, open_reports: 0, debates: 0 },
        users: dashboard?.users ?? [],
      },
    };
  },
  async POST(ctx) {
    const token = ctx.state.token;
    if (token === null || ctx.state.staff === null) {
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
            Liberar deja la cuenta a la espera. El próximo ingreso con ese nick
            la ata al navegador nuevo.
          </p>
          {data.users.length === 0
            ? <p class="mt-4 text-sm text-bodytext">No hay cuentas.</p>
            : (
              <div class="mt-4 overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead>
                    <tr class="text-bodytext">
                      <th class="py-3">Nick</th>
                      <th class="py-3">Dispositivo</th>
                      <th class="py-3">Métricas</th>
                      <th class="py-3">Alta</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {data.users.map((user: DashboardUser) => (
                      <tr key={user.nick}>
                        <td class="py-3 font-medium text-dark">{user.nick}</td>
                        <td class="py-3">
                          {user.device_registered
                            ? (
                              <form
                                method="post"
                                class="flex items-center gap-3"
                              >
                                <span>Registrado</span>
                                <input
                                  type="hidden"
                                  name="nick"
                                  value={user.nick}
                                />
                                <button
                                  type="submit"
                                  class="btn btn-outline-primary btn-sm"
                                >
                                  Liberar
                                </button>
                              </form>
                            )
                            : "Sin dispositivo"}
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
