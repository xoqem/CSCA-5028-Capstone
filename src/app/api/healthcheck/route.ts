import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "Healthy" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { status: "Unhealthy" },
      { status: 500 },
    );
  }
}
