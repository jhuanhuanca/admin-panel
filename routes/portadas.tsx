import { AdminShell } from "../components/AdminShell.tsx";
import { listStaffHeroes, saveStaffHero, type StaffHero } from "../lib/api/client.ts";
import { define } from "../utils.ts";

const places = [
  { slot: "home", title: "Inicio", hint: "El bloque azul de «Lo que pasa. Lo que piensas.»" },
  { slot: "polls", title: "Votaciones", hint: "El bloque azul de «Vota las propuestas abiertas»." },
] as const;

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
    const heroes = await listStaffHeroes(token);

    return {
      data: {
        staffName: ctx.state.staff?.name ?? "Mesa",
        heroes,
        aviso: url.searchParams.get("aviso"),
        lugar: url.searchParams.get("lugar"),
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
    const slot = String(form.get("slot") ?? "");
    const outgoing = new FormData();
    outgoing.set("slot", slot);
    outgoing.set("announcement", String(form.get("announcement") ?? ""));
    outgoing.set("link", String(form.get("link") ?? ""));
    if (form.get("clear") === "1") {
      outgoing.set("clear", "1");
    }
    const file = form.get("media");
    if (file instanceof File && file.size > 0) {
      outgoing.set("media", file);
    }

    const message = await saveStaffHero(token, outgoing);
    const aviso = message === null ? "guardado" : message.slice(0, 180);
    const lugar = slot === "polls" ? "polls" : "home";

    return new Response(null, {
      status: 303,
      headers: { location: `/portadas?aviso=${encodeURIComponent(aviso)}&lugar=${lugar}` },
    });
  },
});

function current(heroes: { home: StaffHero; polls: StaffHero }, slot: "home" | "polls"): StaffHero {
  return heroes[slot];
}

export default define.page<typeof handler>(function HeroesPage({ data }) {
  return (
    <AdminShell name={data.staffName} current="portadas">
      <h1 class="card-title text-2xl">Portadas</h1>
      <p class="mt-2 text-sm text-bodytext">
        El anuncio se lee sobre el texto. La imagen o el video quedan de fondo.
        Puedes subir un archivo o pegar un enlace https de una imagen, un mp4 o un video de YouTube o Vimeo.
      </p>
      {data.aviso === "guardado"
        ? (
          <p class="mt-4 rounded-md bg-lightsuccess px-3 py-2 text-sm text-success" role="status">
            {data.lugar === "polls" ? "Votaciones" : "Inicio"} ya muestra el cambio.
          </p>
        )
        : data.aviso
        ? (
          <p class="mt-4 rounded-md bg-lighterror px-3 py-2 text-sm text-error" role="alert">
            {data.aviso}
          </p>
        )
        : null}
      <div class="mt-6 grid gap-6">
        {places.map((place) => {
          const hero = current(data.heroes, place.slot);
          return (
            <form key={place.slot} method="post" encType="multipart/form-data" class="card">
              <div class="card-body flex flex-col gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-dark">{place.title}</h2>
                  <p class="mt-1 text-sm text-bodytext">{place.hint}</p>
                </div>
                <input type="hidden" name="slot" value={place.slot} />
                {hero.media
                  ? (
                    <p class="text-sm text-bodytext">
                      Fondo actual: {hero.kind === "video" ? "video" : "imagen"} · {hero.media}
                    </p>
                  )
                  : <p class="text-sm text-bodytext">Fondo actual: color de la marca.</p>}
                <div>
                  <label class="mb-2 block font-semibold text-dark" for={`${place.slot}-anuncio`}>
                    Anuncio
                  </label>
                  <input
                    id={`${place.slot}-anuncio`}
                    name="announcement"
                    maxLength={180}
                    value={hero.announcement ?? ""}
                    class="form-control"
                    placeholder="Texto corto, opcional"
                  />
                </div>
                <div>
                  <label class="mb-2 block font-semibold text-dark" for={`${place.slot}-archivo`}>
                    Archivo
                  </label>
                  <input
                    id={`${place.slot}-archivo`}
                    name="media"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    class="form-control"
                  />
                </div>
                <div>
                  <label class="mb-2 block font-semibold text-dark" for={`${place.slot}-enlace`}>
                    Enlace https
                  </label>
                  <input
                    id={`${place.slot}-enlace`}
                    name="link"
                    type="text"
                    maxLength={2000}
                    class="form-control"
                    placeholder="https://… imagen, mp4 o YouTube"
                  />
                </div>
                <label class="flex items-center gap-2 text-sm text-dark" for={`${place.slot}-quitar`}>
                  <input id={`${place.slot}-quitar`} name="clear" type="checkbox" value="1" />
                  Quitar el fondo y dejar el color de la marca
                </label>
                <button type="submit" class="btn w-fit">Guardar {place.title}</button>
              </div>
            </form>
          );
        })}
      </div>
    </AdminShell>
  );
});
