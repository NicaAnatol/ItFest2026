/** Lightweight health check — no auth, no DB, just confirms the process is alive. */
export function GET() {
  return Response.json({ status: "ok" }, { status: 200 });
}

