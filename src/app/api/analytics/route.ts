import { NextResponse } from "next/server";
import { recordApiError } from "@/lib/metrics";
import { getAnalyticsDashboard } from "@/services/analytics-service";

export async function GET() {
	try {
		const dashboard = await getAnalyticsDashboard();
		return NextResponse.json(dashboard);
	} catch (err) {
		recordApiError();
		console.error("[GET /api/analytics]", err);
		return NextResponse.json(
			{ error: "Failed to load analytics" },
			{ status: 500 },
		);
	}
}
