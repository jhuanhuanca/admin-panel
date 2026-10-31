import { AdminShell } from "../components/AdminShell.tsx";
import {
  listStaffDebates,
  publishStaffDebate,
  setDebateState,
  type StaffDebate,
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
    if (form.get("intent") === "publish") {
      const message = await publishStaffDebate(token, {
        body: String(form.get("body") ?? ""),
        context: String(form.get("context") ?? ""),
        category: String(form.get("category") ?? ""),
        image: String(form.get("image") ?? ""),
        video: form.get("video") === "1",
      });
      const aviso = message === null ? "publicado" : message.slice(0, 180);

      return new Response(null, {
        status: 303,
        headers: { location: `/debates?aviso=${encodeURIComponent(aviso)}` },
      });
    }

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
        Publica un debate para el inicio. Cerrar congela comentarios y votos.
        Destacar deja un solo debate al inicio de la lista pública.
      </p>
      {data.aviso === "publicado"
        ? (
          <p class="mt-4 rounded-md bg-lightsuccess px-3 py-2 text-sm text-success" role="status">
            El debate ya está en el inicio público.
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
          <h2 class="text-lg font-semibold text-dark">Nuevo debate</h2>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="debate-body">
              Texto
            </label>
            <textarea
              id="debate-body"
              name="body"
              required
              minLength={8}
              maxLength={5000}
              rows={4}
              class="form-control"
              placeholder="Escribe el debate que verá la comunidad."
            />
          </div>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="debate-category">
              Categoría
            </label>
            <select id="debate-category" name="category" required class="form-control">
              <option value="politica">Política</option>
              <option value="territorio">Territorio</option>
              <option value="economia">Economía</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="debate-context">
              Mesa
            </label>
            <input
              id="debate-context"
              name="context"
              required
              minLength={2}
              maxLength={80}
              value="Mesa"
              class="form-control"
            />
          </div>
          <div>
            <label class="mb-2 block font-semibold text-dark" for="debate-image">
              Enlace de la imagen
            </label>
            <input
              id="debate-image"
              name="image"
              type="url"
              maxLength={255}
              class="form-control"
              placeholder="https://..."
            />
          </div>
          <label class="flex items-center gap-2 text-sm text-dark" for="debate-video">
            <input id="debate-video" name="video" type="checkbox" value="1" />
            La imagen es la portada de un video
          </label>
          <button type="submit" name="intent" value="publish" class="btn w-fit">
            Publicar debate
          </button>
        </div>
      </form>
      {data.debates.length === 0
        ? <p class="mt-6 text-sm text-bodytext">No hay debates.</p>
        : (
          <ul class="mt-6 flex flex-col gap-4">
            {data.debates.map((debate: StaffDebate) => (
              <li key={debate.id} class="card">
                <div class="card-body">
                  <p class="text-sm text-bodytext">
                    {debate.author_nick}
                    {debate.category === "territorio"
                      ? " · Territorio"
                      : debate.category === "economia"
                      ? " · Economía"
                      : debate.category === "politica"
                      ? " · Política"
                      : ""}
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
