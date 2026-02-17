"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import type { MetricsSnapshot } from "@/lib/metrics";

export default function MonitoringPage() {
	const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
	const [error, setError] = useState<string | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		async function fetchMetrics() {
			try {
				const res = await fetch("/api/monitoring/metrics");
				if (!res.ok) throw new Error("Failed to load metrics");
				setMetrics(await res.json());
				setError(null);
			} catch {
				setError("Could not load metrics.");
			}
		}

		fetchMetrics();
		intervalRef.current = setInterval(fetchMetrics, 10_000);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	if (error && !metrics) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
				<p className="text-red-500">{error}</p>
				<Link href="/" className="underline underline-offset-4">
					Back to Home
				</Link>
			</div>
		);
	}

	if (!metrics) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-foreground/60">Loading metrics...</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl p-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Monitoring</h1>
				<Link
					href="/"
					className="text-foreground/60 underline underline-offset-4 hover:text-foreground transition-colors"
				>
					Back to Home
				</Link>
			</div>

			<p className="mb-6 text-sm text-foreground/60">
				Collecting since {new Date(metrics.startedAt).toLocaleString()} — auto-refreshes
				every 10s
			</p>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
				<MetricCard label="Games Created" value={metrics.gamesCreated} />
				<MetricCard label="Games Finished" value={metrics.gamesFinished} />
				<MetricCard label="Rounds Completed" value={metrics.roundsCompleted} />
				<MetricCard label="Avg Round Duration" value={`${metrics.avgRoundDurationMs}ms`} />
				<MetricCard label="Submissions" value={metrics.submissionsReceived} />
				<MetricCard label="Correct" value={metrics.correctSubmissions} />
				<MetricCard label="Incorrect" value={metrics.incorrectSubmissions} />
				<MetricCard label="API Errors" value={metrics.apiErrors} />
			</div>
		</div>
	);
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-foreground/20 p-4 text-center">
			<p className="text-2xl font-bold">{value}</p>
			<p className="text-sm text-foreground/60">{label}</p>
		</div>
	);
}
