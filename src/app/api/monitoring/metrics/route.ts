import { NextResponse } from "next/server";
import { getMetricsSnapshot } from "@/lib/metrics";

export async function GET() {
	return NextResponse.json(getMetricsSnapshot());
}
