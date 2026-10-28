import { AdminShell } from "../components/AdminShell.tsx";
import {
  decideLeader,
  type LeaderCandidateItem,
  listLeaderCandidates,
} from "../lib/api/client.ts";
import { define } from "../utils.ts";

const labels: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Reconocido",
  set_aside: "Apartado",
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
        candidates: await listLeaderCandidates(token),
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
    const id = Number(form.get("candidate_id"));
    const status = String(form.get("status") ?? "");
    if (
      status === "accepted" || status === "set_aside" || status === "pending"
    ) {
      await decideLeader(token, id, status);
    }

    return new Response(null, {
      status: 303,
      headers: { location: "/lideres" },
    });
  },
});

export default define.page<typeof handler>(function LeadersPage({ data }) {
  return (
    <AdminShell name={data.staffName} current="lideres">
      <h1 class="card-title text-2xl">Candidatos a líder</h1>
      <p class="mt-2 text-sm text-bodytext">
        Solo aparecen cuentas que aceptaron las métricas y superan el umbral de
        participación y respeto.
      </p>
      {data.candidates.length === 0
        ? <p class="mt-6 text-sm text-bodytext">No hay candidatos.</p>
        : (
          <ul class="mt-6 flex flex-col gap-4">
            {data.candidates.map((candidate: LeaderCandidateItem) => (
              <li key={candidate.id} class="card">
                <div class="card-body">
                  <p class="font-medium text-dark">{candidate.nick}</p>
                  <p class="mt-2 text-sm text-bodytext">
                    Participación {candidate.participation} · Respeto{" "}
                    {candidate.respect} ·{" "}
                    {labels[candidate.status] ?? candidate.status}
                  </p>
                  <form method="post" class="mt-4 flex flex-wrap gap-2">
                    <input
                      type="hidden"
                      name="candidate_id"
                      value={candidate.id}
                    />
                    {candidate.status !== "accepted"
                      ? (
                        <button
                          type="submit"
                          name="status"
                          value="accepted"
                          class="btn"
                        >
                          Reconocer
                        </button>
                      )
                      : null}
                    {candidate.status !== "set_aside"
                      ? (
                        <button
                          type="submit"
                          name="status"
                          value="set_aside"
                          class="btn-outline-primary"
                        >
                          Apartar
                        </button>
                      )
                      : null}
                    {candidate.status !== "pending"
                      ? (
                        <button
                          type="submit"
                          name="status"
                          value="pending"
                          class="btn-outline-primary"
                        >
                          Volver a pendiente
                        </button>
                      )
                      : null}
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
    </AdminShell>
  );
});
