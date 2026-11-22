import { NextResponse } from "next/server";

// Serves the AdSense ads.txt verification line only when a client id is
// configured. Otherwise returns 404 so nothing is exposed.
export const dynamic = "force-dynamic";

export function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
  if (!clientId) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(
    `google.com, ${clientId}, DIRECT, f08c47fec0942fa0`,
    { status: 200, headers: { "Content-Type": "text/plain" } }
  );
}
