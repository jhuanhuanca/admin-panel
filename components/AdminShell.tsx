import type { ComponentChildren } from "preact";
import ReportNotice from "../islands/ReportNotice.tsx";

export function AdminShell(props: {
  name: string;
  current:
    | "inicio"
    | "estado"
    | "indicadores"
    | "lideres"
    | "debates"
    | "noticias"
    | "portadas"
    | "moderacion";
  children: ComponentChildren;
}) {
  const item = (key: typeof props.current, href: string, label: string) => (
    <li class="sidebar-item">
      <a
        href={href}
        class={`sidebar-link${props.current === key ? " activemenu" : ""}`}
      >
        <span class="hide-menu">{label}</span>
      </a>
    </li>
  );

  return (
    <div id="main-wrapper" class="flex">
      <aside class="left-sidebar fixed top-0 left-0 z-20 h-screen w-[270px] border-r border-border bg-white">
        <div class="px-6 py-5">
          <a href="/" class="text-xl font-semibold text-dark">Política</a>
          <p class="mt-1 text-xs text-bodytext">Mesa de staff</p>
        </div>
        <div class="scroll-sidebar px-6">
          <nav>
            <ul id="sidebarnav">
              <div class="caption">
                <span class="hide-menu">Panel</span>
              </div>
              {item("inicio", "/", "Inicio")}
              {item("estado", "/estado", "Estado")}
              {item("indicadores", "/indicadores", "Indicadores")}
              {item("lideres", "/lideres", "Líderes")}
              {item("debates", "/debates", "Debates")}
              {item("noticias", "/noticias", "Noticias")}
              {item("portadas", "/portadas", "Portadas")}
              {item("moderacion", "/moderacion", "Moderación")}
            </ul>
          </nav>
        </div>
      </aside>
      <div class="page-wrapper w-full">
        <header class="topbar sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4">
          <p class="text-sm text-bodytext">{props.name}</p>
          <form method="post" action="/salir">
            <button type="submit" class="btn">Salir</button>
          </form>
        </header>
        <div class="container py-6">
          <ReportNotice />
          {props.children}
        </div>
      </div>
    </div>
  );
}
