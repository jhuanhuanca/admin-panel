import { AdminShell } from "../components/AdminShell.tsx";
import {
  listStaffDebates,
  listStaffNews,
  publishStaffNews,
  type StaffDebate,
  type StaffNews,
} from "../lib/api/client.ts";
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

    return {
      data: {
        staffName: ctx.state.staff?.name ?? "Mesa",
        news: await listStaffNews(token),
        debates: await listStaffDebates(token),
        aviso: url.searchParams.get("aviso"),
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
    const message = await publishStaffNews(token, {
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      source: String(form.get("source") ?? ""),
      debateId: String(form.get("debate_id") ?? ""),
    });
    const aviso = message === null ? "publicado" : message.slice(0, 180);

    return new Response(null, {
      status: 303,
      headers: { location: `/noticias?aviso=${encodeURIComponent(aviso)}` },
    });
  },
});

export default define.page<typeof handler>(function NewsPage({ data }) {
  return (
    <AdminShell name={data.staffName} current="noticias">
      <h1 class="card-title text-2xl">Noticias</h1>
      <p class="mt-2 text-sm text-bodytext">
        Publica una noticia para la página pública de noticias. Las fuentes RSS
        siguen entrando solas. Aquí escribes las de la mesa.
      </p>
      {data.aviso === "publicado"
        ? (
          <p class="mt-4 rounded-md bg-lightsuccess px-3 py-2 text-sm text-success" role="status">
            La noticia ya está en la página pública.
          </p>
        )
        : data.aviso
        ? (
          <p class="mt-4 rounded-md bg-lighterror px-3 py-2 text-sm text-error" role="alert">
            {data.aviso}
          </p>
        )
        : null}
      <form method="post" class="card mt-6">
        <div class="card-body flex flex-col gap-4">
          <h2 class="text-lg font-semibold text-dark">Nueva noticia</h2>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="noticia-titulo">
              Título
            </label>
            <input
              id="noticia-titulo"
              name="title"
              required
              minLength={8}
              maxLength={180}
              class="form-control"
              placeholder="Título que verá la comunidad"
            />
          </div>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="noticia-resumen">
              Resumen
            </label>
            <textarea
              id="noticia-resumen"
              name="summary"
              required
              minLength={8}
              maxLength={2000}
              rows={4}
              class="form-control"
              placeholder="El texto corto de la noticia."
            />
          </div>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="noticia-fuente">
              Fuente
            </label>
            <input
              id="noticia-fuente"
              name="source"
              required
              minLength={2}
              maxLength={80}
              value="Mesa"
              class="form-control"
            />
          </div>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="noticia-debate">
              Debate vinculado
            </label>
            <select id="noticia-debate" name="debate_id" class="form-control">
              <option value="">Sin debate</option>
              {data.debates.map((debate: StaffDebate) => (
                <option value={debate.id}>
                  {debate.excerpt}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" class="btn w-fit">Publicar noticia</button>
        </div>
      </form>
      {data.news.length === 0
        ? <p class="mt-6 text-sm text-bodytext">No hay noticias.</p>
        : (
          <ul class="mt-6 flex flex-col gap-4">
            {data.news.map((item: StaffNews) => (
              <li key={item.id} class="card">
                <div class="card-body">
                  <p class="font-semibold text-dark">{item.title}</p>
                  <p class="mt-2 text-sm text-bodytext">{item.summary}</p>
                  <p class="mt-2 text-xs text-bodytext">
                    {item.source}
                    {item.debate_id ? ` · Debate ${item.debate_id}` : ""}
                    {item.published_at ? ` · ${item.published_at.slice(0, 10)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
    </AdminShell>
  );
});
