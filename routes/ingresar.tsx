import { confirmStaffTotp, loginStaff } from "../lib/api/client.ts";
import {
  clearPendingCookie,
  pendingCookie,
  readPending,
  sessionCookie,
} from "../lib/auth/session.ts";
import { define } from "../utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (ctx.state.staff) {
      return new Response(null, {
        status: 303,
        headers: { location: "/" },
      });
    }

    const url = new URL(ctx.req.url);
    return {
      data: {
        aviso: url.searchParams.get("aviso"),
        pending: readPending(ctx.req.headers.get("cookie")),
      },
    };
  },
  async POST(ctx) {
    const form = await ctx.req.formData();

    if (form.get("paso") === "reiniciar") {
      return new Response(null, {
        status: 303,
        headers: {
          location: "/ingresar",
          "set-cookie": clearPendingCookie(),
        },
      });
    }

    if (form.get("paso") === "codigo") {
      const pending = readPending(ctx.req.headers.get("cookie"));
      if (pending === null) {
        return new Response(null, {
          status: 303,
          headers: { location: "/ingresar?aviso=expirado" },
        });
      }

      const result = await confirmStaffTotp(
        pending.challenge,
        String(form.get("code") ?? ""),
      );

      if (result === "codigo") {
        return new Response(null, {
          status: 303,
          headers: { location: "/ingresar?aviso=codigo" },
        });
      }

      if (typeof result !== "object") {
        return new Response(null, {
          status: 303,
          headers: {
            location: "/ingresar?aviso=expirado",
            "set-cookie": clearPendingCookie(),
          },
        });
      }

      const headers = new Headers({ location: "/" });
      headers.append("set-cookie", sessionCookie(result.token));
      headers.append("set-cookie", clearPendingCookie());
      return new Response(null, { status: 303, headers });
    }

    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const challenge = await loginStaff(email, password);

    if (challenge === null) {
      const headers = new Headers({
        location: "/ingresar?aviso=credenciales",
      });
      headers.append("set-cookie", clearPendingCookie());
      return new Response(null, { status: 303, headers });
    }

    return new Response(null, {
      status: 303,
      headers: {
        location: "/ingresar",
        "set-cookie": pendingCookie({
          challenge: challenge.challenge,
          pending: challenge.pending,
          secret: challenge.secret,
          otpauth: challenge.otpauth,
        }),
      },
    });
  },
});

export default define.page<typeof handler>(function LoginPage({ data }) {
  const aviso = data.aviso === "credenciales"
    ? "Correo o clave incorrectos."
    : data.aviso === "codigo"
    ? "El código no coincide."
    : data.aviso === "expirado"
    ? "La verificación expiró. Vuelve a ingresar la clave."
    : null;

  return (
    <main class="flex h-screen w-full items-center justify-center bg-lightprimary px-3">
      <div class="card w-full max-w-[460px]">
        <div class="card-body">
          <h1 class="card-title text-center text-2xl">Ingreso de staff</h1>
          <p class="mt-3 text-center text-sm text-bodytext">
            Esta sesión dura 15 minutos y pide un código de tu aplicación de
            autenticación.
          </p>
          {aviso
            ? (
              <p
                class="mt-4 rounded-md bg-lighterror px-3 py-2 text-sm text-error"
                role="alert"
              >
                {aviso}
              </p>
            )
            : null}
          {data.pending
            ? (
              <form method="post" class="mt-6 flex flex-col gap-4">
                <input type="hidden" name="paso" value="codigo" />
                {data.pending.pending === "setup" && data.pending.secret
                  ? (
                    <div class="rounded-md bg-lightprimary p-4">
                      <p class="text-sm text-bodytext">
                        Agrega esta clave en la aplicación y escribe el primer
                        código.
                      </p>
                      <p
                        id="clave-totp"
                        class="secret-key mt-3 text-lg text-dark"
                      >
                        {data.pending.secret}
                      </p>
                      {data.pending.otpauth
                        ? (
                          <a
                            class="mt-3 inline-block text-sm text-primary"
                            href={data.pending.otpauth}
                          >
                            Abrir en la aplicación de códigos
                          </a>
                        )
                        : null}
                    </div>
                  )
                  : (
                    <p class="text-sm text-bodytext">
                      Escribe el código actual de la aplicación.
                    </p>
                  )}
                <div>
                  <label class="mb-2 block font-semibold text-dark" for="code">
                    Código
                  </label>
                  <input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autocomplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    required
                    class="form-control"
                  />
                </div>
                <button type="submit" class="btn w-full py-3">Confirmar</button>
              </form>
            )
            : (
              <form method="post" class="mt-6 flex flex-col gap-4">
                <div>
                  <label class="mb-2 block font-semibold text-dark" for="email">
                    Correo
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autocomplete="username"
                    class="form-control"
                  />
                </div>
                <div>
                  <label
                    class="mb-2 block font-semibold text-dark"
                    for="password"
                  >
                    Clave
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autocomplete="current-password"
                    class="form-control"
                  />
                </div>
                <button type="submit" class="btn w-full py-3">Entrar</button>
              </form>
            )}
          {data.pending
            ? (
              <form method="post" class="mt-4 text-center">
                <input type="hidden" name="paso" value="reiniciar" />
                <button type="submit" class="text-sm text-primary">
                  Volver a la clave
                </button>
              </form>
            )
            : null}
        </div>
      </div>
    </main>
  );
});
