"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import type { AnalyticsDashboard } from "@/types/analytics";

export default function StatsPage() {
	const [data, setData] = useState<AnalyticsDashboard | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function load() {
			try {
				const res = await fetch("/api/analytics");
				if (!res.ok) throw new Error("Failed to load analytics");
				setData(await res.json());
			} catch {
				setError("Could not load analytics data.");
			}
		}
		load();
	}, []);

	if (error) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
				<p className="text-red-500">{error}</p>
				<Link href="/" className="underline underline-offset-4">
					Back to Home
				</Link>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-foreground/60">Loading analytics...</p>
			</div>
		);
	}

	const { overview, playerLeaderboard, roundDifficulty, recentGames, firstCorrectLeaders } =
		data;

	return (
		<div className="mx-auto max-w-5xl p-8">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Stats Dashboard</h1>
				<Link
					href="/"
					className="text-foreground/60 underline underline-offset-4 hover:text-foreground transition-colors"
				>
					Back to Home
				</Link>
			</div>

			<section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
				<StatCard label="Games" value={overview.totalGames} />
				<StatCard label="Players" value={overview.totalPlayers} />
				<StatCard label="Rounds" value={overview.totalRounds} />
				<StatCard label="Submissions" value={overview.totalSubmissions} />
				<StatCard label="Accuracy" value={`${overview.overallAccuracyPct}%`} />
			</section>

			<section className="mb-10">
				<h2 className="mb-3 text-xl font-semibold">Player Leaderboard</h2>
				{playerLeaderboard.length === 0 ? (
					<p className="text-foreground/60">No data yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-foreground/20">
								<tr>
									<th className="py-2 pr-4">Player</th>
									<th className="py-2 pr-4">Games</th>
									<th className="py-2 pr-4">Accuracy</th>
									<th className="py-2 pr-4">Avg Time</th>
									<th className="py-2">Score</th>
								</tr>
							</thead>
							<tbody>
								{playerLeaderboard.map((p) => (
									<tr key={p.displayName} className="border-b border-foreground/10">
										<td className="py-2 pr-4 font-medium">{p.displayName}</td>
										<td className="py-2 pr-4">{p.gamesPlayed}</td>
										<td className="py-2 pr-4">{p.accuracyPct}%</td>
										<td className="py-2 pr-4">{p.avgTimeMsCorrect}ms</td>
										<td className="py-2">{p.totalScore}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="mb-10">
				<h2 className="mb-3 text-xl font-semibold">Round Difficulty</h2>
				{roundDifficulty.length === 0 ? (
					<p className="text-foreground/60">No data yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-foreground/20">
								<tr>
									<th className="py-2 pr-4">Round</th>
									<th className="py-2 pr-4">Attempts</th>
									<th className="py-2 pr-4">Fail Rate</th>
									<th className="py-2">Avg Solve Time</th>
								</tr>
							</thead>
							<tbody>
								{roundDifficulty.map((r) => (
									<tr key={r.roundNumber} className="border-b border-foreground/10">
										<td className="py-2 pr-4 font-medium">{r.roundNumber}</td>
										<td className="py-2 pr-4">{r.totalAttempts}</td>
										<td className="py-2 pr-4">{r.failRatePct}%</td>
										<td className="py-2">{r.avgSolveTimeMs}ms</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="mb-10">
				<h2 className="mb-3 text-xl font-semibold">Recent Games</h2>
				{recentGames.length === 0 ? (
					<p className="text-foreground/60">No data yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-foreground/20">
								<tr>
									<th className="py-2 pr-4">Code</th>
									<th className="py-2 pr-4">Players</th>
									<th className="py-2 pr-4">Avg Score</th>
									<th className="py-2 pr-4">Spread</th>
									<th className="py-2">Avg Round</th>
								</tr>
							</thead>
							<tbody>
								{recentGames.map((g) => (
									<tr key={g.gameCode} className="border-b border-foreground/10">
										<td className="py-2 pr-4 font-mono">{g.gameCode}</td>
										<td className="py-2 pr-4">{g.playerCount}</td>
										<td className="py-2 pr-4">{g.avgScore}</td>
										<td className="py-2 pr-4">{g.scoreSpread}</td>
										<td className="py-2">{(g.avgRoundDurationMs / 1000).toFixed(1)}s</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="mb-10">
				<h2 className="mb-3 text-xl font-semibold">First Correct Leaders</h2>
				{firstCorrectLeaders.length === 0 ? (
					<p className="text-foreground/60">No data yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-foreground/20">
								<tr>
									<th className="py-2 pr-4">Player</th>
									<th className="py-2 pr-4">First Correct</th>
									<th className="py-2">Games</th>
								</tr>
							</thead>
							<tbody>
								{firstCorrectLeaders.map((f) => (
									<tr key={f.displayName} className="border-b border-foreground/10">
										<td className="py-2 pr-4 font-medium">{f.displayName}</td>
										<td className="py-2 pr-4">{f.firstCorrectCount}</td>
										<td className="py-2">{f.gamesPlayed}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-foreground/20 p-4 text-center">
			<p className="text-2xl font-bold">{value}</p>
			<p className="text-sm text-foreground/60">{label}</p>
		</div>
	);
}
