import { NextRequest, NextResponse } from "next/server";
import { searchLcsh } from "@/lib/lcsh";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const searchType = (searchParams.get("searchtype") || "left-anchored") as "left-anchored" | "keyword";
  const count = parseInt(searchParams.get("count") || "25", 10);

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchLcsh(query, { count, searchType });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching LCSH:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.constructor.name : "Unknown",
      },
      { status: 500 }
    );
  }
}


