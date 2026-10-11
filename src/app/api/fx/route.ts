import { getRates } from "@/lib/fx/rates";

export const dynamic = "force-dynamic";

/** Returns USD-based rates for EUR/INR/USD. Cached 24h server-side when OPEN_EXCHANGE_RATES_APP_ID is set. */
export async function GET() {
  const table = await getRates();
  return Response.json(table, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
