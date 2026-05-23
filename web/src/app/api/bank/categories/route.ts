import { NextResponse } from "next/server";
import { listCategories, listSubcategories } from "@/lib/bank/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [cats, subs] = await Promise.all([
      listCategories(),
      listSubcategories(),
    ]);
    return NextResponse.json(
      { categories: cats, subcategories: subs },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
