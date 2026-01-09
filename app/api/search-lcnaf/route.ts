import { NextRequest, NextResponse } from "next/server";
import { searchLcnaf } from "@/lib/lcsh";

export async function GET (request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const rdftype = searchParams.get("rdftype") || "PersonalName";
  const count = parseInt(searchParams.get("count") || "25", 10);

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchLcnaf(query, { count, rdftype });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching LCNAF:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.constructor.name : "Unknown",
      },
      { status: 500 }
    );
  }
}


