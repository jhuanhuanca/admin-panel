import { AdminShell } from "../components/AdminShell.tsx";
import {
  listStaffDebates,
  setDebateState,
  type StaffDebate,
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

    return {
      data: {
        staffName: ctx.state.staff.name,
        debates: await listStaffDebates(token),
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
    const id = Number(form.get("debate_id"));
    const action = String(form.get("action") ?? "");
    if (
      action === "close" || action === "reopen" || action === "feature" ||
      action === "unfeature"
    ) {
      await setDebateState(token, id, action);
    }

    return new Response(null, {
      status: 303,
      headers: { location: "/debates" },
    });
  },
});

export default define.page<typeof handler>(function DebatesPage({ data }) {
  return (
    <AdminShell name={data.staffName} current="debates">
      <h1 class="card-title text-2xl">Debates</h1>
      <p class="mt-2 text-sm text-bodytext">
        Cerrar congela comentarios y votos. Destacar deja un solo debate al
        inicio de la lista pública.
      </p>
      {data.debates.length === 0
        ? <p class="mt-6 text-sm text-bodytext">No hay debates.</p>
        : (
          <ul class="mt-6 flex flex-col gap-4">
            {data.debates.map((debate: StaffDebate) => (
              <li key={debate.id} class="card">
                <div class="card-body">
                  <p class="text-sm text-bodytext">
                    {debate.author_nick}
                    {debate.featured ? " · Destacado" : ""}
                    {debate.closed ? " · Cerrado" : " · Abierto"}
                  </p>
                  <p class="mt-2 text-dark">{debate.excerpt}</p>
                  <form method="post" class="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="debate_id" value={debate.id} />
                    <button
                      type="submit"
                      name="action"
                      value={debate.closed ? "reopen" : "close"}
                      class="btn-outline-primary"
                    >
                      {debate.closed ? "Reabrir" : "Cerrar"}
                    </button>
                    <button
                      type="submit"
                      name="action"
                      value={debate.featured ? "unfeature" : "feature"}
                      class="btn"
                    >
                      {debate.featured ? "Quitar destaque" : "Destacar"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
    </AdminShell>
  );
});
