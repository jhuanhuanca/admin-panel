import { staffProfile } from "../lib/api/client.ts";
import { clearSessionCookie, readSession } from "../lib/auth/session.ts";
import { define } from "../utils.ts";

export default define.middleware(async (ctx) => {
  const path = new URL(ctx.req.url).pathname;
  const token = readSession(ctx.req.headers.get("cookie"));
  ctx.state.token = token;
  ctx.state.staff = null;

  if (path === "/ingresar") {
    return await ctx.next();
  }

  if (token === null) {
    return redirect("/ingresar");
  }

  const staff = await staffProfile(token);
  if (staff === null) {
    return redirect("/ingresar", clearSessionCookie());
  }

  ctx.state.staff = staff;
  return await ctx.next();
});

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ location });
  if (cookie) {
    headers.set("set-cookie", cookie);
  }

  return new Response(null, { status: 303, headers });
}
