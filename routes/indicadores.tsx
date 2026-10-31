import { AdminShell } from "../components/AdminShell.tsx";
import { type KpiDebate, loadKpis } from "../lib/api/client.ts";
import { define } from "../utils.ts";

const emptyPlatform = {
  debates: 0,
  arguments: 0,
  votes: 0,
  news: 0,
  voices: 0,
  open_reports: 0,
  consented: 0,
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

    const kpi = await loadKpis(token);

    return {
      data: {
        staffName: ctx.state.staff?.name ?? "Mesa",
        platform: kpi?.platform ?? emptyPlatform,
        scores: kpi?.scores ?? {
          profiles: 0,
          participation: null,
          quality: null,
          respect: null,
          influence: null,
        },
        debates: kpi?.debates ?? [],
      },
    };
  },
});

function Card(props: { label: string; value: number | string }) {
  return (
    <li class="card">
      <div class="card-body">
        <p class="card-subtitle">{props.label}</p>
        <p class="mt-2 text-3xl">{props.value}</p>
      </div>
    </li>
  );
}

export default define.page<typeof handler>(function KpiPage({ data }) {
  const score = (value: number | null) => value === null ? "—" : String(value);

  return (
    <AdminShell name={data.staffName} current="indicadores">
      <h1 class="card-title text-2xl">Indicadores</h1>
      <p class="mt-2 text-sm text-bodytext">
        Los promedios salen de quienes aceptaron las métricas. El resto son
        totales de la plataforma.
      </p>
      <ul class="kpi-grid mt-6">
        <Card label="Debates" value={data.platform.debates} />
        <Card label="Argumentos" value={data.platform.arguments} />
        <Card label="Votos" value={data.platform.votes} />
        <Card label="Voces" value={data.platform.voices} />
        <Card label="Noticias" value={data.platform.news} />
        <Card label="Reportes abiertos" value={data.platform.open_reports} />
        <Card label="Consentimientos" value={data.platform.consented} />
        <Card label="Perfiles calculados" value={data.scores.profiles} />
      </ul>
      <h2 class="card-title mt-8 text-xl">Promedios</h2>
      {data.scores.profiles === 0
        ? (
          <p class="mt-4 text-sm text-bodytext">
            Aún no hay perfiles calculados.
          </p>
        )
        : (
          <ul class="kpi-grid mt-4">
            <Card
              label="Participación"
              value={score(data.scores.participation)}
            />
            <Card label="Calidad" value={score(data.scores.quality)} />
            <Card label="Respeto" value={score(data.scores.respect)} />
            <Card label="Influencia" value={score(data.scores.influence)} />
          </ul>
        )}
      <div class="card mt-8">
        <div class="card-body">
          <h2 class="card-title">Debates con más actividad</h2>
          {data.debates.length === 0
            ? <p class="mt-4 text-sm text-bodytext">No hay debates.</p>
            : (
              <div class="mt-4 overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead>
                    <tr class="text-bodytext">
                      <th class="py-3">Debate</th>
                      <th class="py-3">Argumentos</th>
                      <th class="py-3">Respuestas</th>
                      <th class="py-3">Reacciones</th>
                      <th class="py-3">A favor</th>
                      <th class="py-3">En contra</th>
                      <th class="py-3">Veces compartido</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {data.debates.map((debate: KpiDebate) => (
                      <tr key={debate.id}>
                        <td class="py-3">
                          <p class="font-medium text-dark">{debate.excerpt}</p>
                          <p class="text-bodytext">
                            {debate.author_nick ?? ""}
                          </p>
                        </td>
                        <td class="py-3">{debate.arguments}</td>
                        <td class="py-3">{debate.replies}</td>
                        <td class="py-3">{debate.reactions}</td>
                        <td class="py-3">{debate.favor}</td>
                        <td class="py-3">{debate.contra}</td>
                        <td class="py-3">{debate.shares}</td>
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
