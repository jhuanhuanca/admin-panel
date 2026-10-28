import { loadNewerReports } from "../lib/api/client.ts";
import { define } from "../utils.ts";

const encoder = new TextEncoder();

export const handler = define.handlers({
  GET(ctx) {
    const token = ctx.state.token;
    if (token === null || ctx.state.staff === null) {
      return new Response(null, {
        status: 303,
        headers: { location: "/ingresar" },
      });
    }

    const raw = new URL(ctx.req.url).searchParams.get("after");
    const hasAfter = raw !== null && raw !== "";
    let after = Number(raw ?? "0");
    if (!Number.isInteger(after) || after < 0) {
      after = 0;
    }

    let stopped = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };

        try {
          controller.enqueue(encoder.encode(": ok\n\n"));
          if (!hasAfter) {
            const page = await loadNewerReports(token, 0);
            if (page === "auth" || page === null) {
              send("auth", {});
              return;
            }
            send("cursor", { latest: page.latest });
            return;
          }

          for (let tick = 0; tick < 6 && !stopped; tick++) {
            const page = await loadNewerReports(token, after);
            if (page === "auth") {
              send("auth", {});
              return;
            }
            if (page !== null) {
              for (const report of page.reports) {
                send("report", report);
                after = Math.max(after, report.id);
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
          if (!stopped) {
            send("bye", {});
          }
        } catch {
          // The browser closed the stream.
        } finally {
          try {
            controller.close();
          } catch {
            // The stream is already closed.
          }
        }
      },
      cancel() {
        stopped = true;
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  },
});
