import { logoutStaff } from "../lib/api/client.ts";
import { clearSessionCookie } from "../lib/auth/session.ts";
import { define } from "../utils.ts";

export const handler = define.handlers({
  GET() {
    return new Response(null, {
      status: 303,
      headers: { location: "/" },
    });
  },
  async POST(ctx) {
    if (ctx.state.token) {
      await logoutStaff(ctx.state.token);
    }

    return new Response(null, {
      status: 303,
      headers: {
        location: "/ingresar",
        "set-cookie": clearSessionCookie(),
      },
    });
  },
});
