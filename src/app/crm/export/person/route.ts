import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { exportPersonData } from "@/lib/compliance/gdpr";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "Missing query parameter 'q' (email or contact UUID required)" },
      { status: 400 }
    );
  }

  const result = await exportPersonData(query);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(result.data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
