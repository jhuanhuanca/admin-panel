import { useEffect, useState } from "preact/hooks";

const CURSOR = "admin-report-cursor";
const NOTICE = "admin-report-notice";

interface NoticeEvent {
  event: string;
  data: string;
}

function parseBlocks(buffer: string): { events: NoticeEvent[]; rest: string } {
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  const events = blocks.filter((block) => block.trim() !== "").map((block) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    return { event, data: data.join("\n") };
  });

  return { events, rest };
}

async function readNotices(
  cursor: string | null,
  signal: AbortSignal,
  onReport: (id: number) => void,
  onCursor: (latest: number) => void,
): Promise<"auth" | "retry"> {
  const url = cursor === null
    ? "/avisos"
    : `/avisos?after=${encodeURIComponent(cursor)}`;
  const response = await fetch(url, {
    headers: { Accept: "text/event-stream" },
    signal,
  });
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/event-stream") || response.body === null) {
    return "auth";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) return "retry";
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseBlocks(buffer);
    buffer = parsed.rest;
    for (const item of parsed.events) {
      if (item.event === "auth") return "auth";
      if (item.data === "") continue;
      const payload = JSON.parse(item.data) as { id?: number; latest?: number };
      if (item.event === "cursor" && typeof payload.latest === "number") {
        onCursor(payload.latest);
      }
      if (item.event === "report" && typeof payload.id === "number") {
        onReport(payload.id);
      }
    }
  }

  return "retry";
}

export default function ReportNotice() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const onModeration = globalThis.location.pathname === "/moderacion";
    if (onModeration) {
      sessionStorage.removeItem(NOTICE);
      setCount(0);
    } else {
      setCount(Number(sessionStorage.getItem(NOTICE) ?? "0"));
    }

    const abort = new AbortController();
    const run = async () => {
      while (!abort.signal.aborted) {
        try {
          const outcome = await readNotices(
            sessionStorage.getItem(CURSOR),
            abort.signal,
            (id) => {
              sessionStorage.setItem(CURSOR, String(id));
              const next = Number(sessionStorage.getItem(NOTICE) ?? "0") + 1;
              sessionStorage.setItem(NOTICE, String(next));
              setCount(next);
            },
            (latest) => {
              sessionStorage.setItem(CURSOR, String(latest));
            },
          );
          if (outcome === "auth" || abort.signal.aborted) return;
        } catch {
          if (abort.signal.aborted) return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    run();
    return () => abort.abort();
  }, []);

  if (count < 1) return null;

  const onModeration = globalThis.location.pathname === "/moderacion";
  const label = count === 1
    ? "Entró un reporte nuevo."
    : `Entraron ${count} reportes nuevos.`;

  return (
    <div class="report-notice" role="status">
      <p>{label}</p>
      <a
        class="text-primary"
        href="/moderacion"
        onClick={() => sessionStorage.removeItem(NOTICE)}
      >
        {onModeration ? "Actualizar" : "Ver la cola"}
      </a>
    </div>
  );
}
