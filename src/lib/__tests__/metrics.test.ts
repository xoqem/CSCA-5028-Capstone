import { describe, it, expect, beforeEach } from "vitest";
import {
	recordGameCreated,
	recordGameFinished,
	recordRoundCompleted,
	recordSubmission,
	recordApiError,
	getMetricsSnapshot,
	resetMetrics,
} from "@/lib/metrics";

beforeEach(() => {
	resetMetrics();
});

describe("metrics", () => {
	it("starts with all counters at zero", () => {
		const snap = getMetricsSnapshot();
		expect(snap.gamesCreated).toBe(0);
		expect(snap.gamesFinished).toBe(0);
		expect(snap.roundsCompleted).toBe(0);
		expect(snap.submissionsReceived).toBe(0);
		expect(snap.correctSubmissions).toBe(0);
		expect(snap.incorrectSubmissions).toBe(0);
		expect(snap.apiErrors).toBe(0);
		expect(snap.avgRoundDurationMs).toBe(0);
	});

	it("increments gamesCreated", () => {
		recordGameCreated();
		recordGameCreated();
		expect(getMetricsSnapshot().gamesCreated).toBe(2);
	});

	it("increments gamesFinished", () => {
		recordGameFinished();
		expect(getMetricsSnapshot().gamesFinished).toBe(1);
	});

	it("tracks rounds completed and avg duration", () => {
		recordRoundCompleted(1000);
		recordRoundCompleted(3000);
		const snap = getMetricsSnapshot();
		expect(snap.roundsCompleted).toBe(2);
		expect(snap.avgRoundDurationMs).toBe(2000);
	});

	it("tracks correct submissions", () => {
		recordSubmission(true);
		recordSubmission(true);
		recordSubmission(false);
		const snap = getMetricsSnapshot();
		expect(snap.submissionsReceived).toBe(3);
		expect(snap.correctSubmissions).toBe(2);
		expect(snap.incorrectSubmissions).toBe(1);
	});

	it("tracks incorrect submissions", () => {
		recordSubmission(false);
		recordSubmission(false);
		const snap = getMetricsSnapshot();
		expect(snap.incorrectSubmissions).toBe(2);
		expect(snap.correctSubmissions).toBe(0);
	});

	it("increments apiErrors", () => {
		recordApiError();
		recordApiError();
		recordApiError();
		expect(getMetricsSnapshot().apiErrors).toBe(3);
	});

	it("returns avgRoundDurationMs as 0 when no rounds completed", () => {
		expect(getMetricsSnapshot().avgRoundDurationMs).toBe(0);
	});

	it("rounds avgRoundDurationMs to integer", () => {
		recordRoundCompleted(1000);
		recordRoundCompleted(1500);
		recordRoundCompleted(2000);
		expect(getMetricsSnapshot().avgRoundDurationMs).toBe(1500);
	});

	it("includes startedAt timestamp", () => {
		const snap = getMetricsSnapshot();
		expect(snap.startedAt).toBeDefined();
		expect(() => new Date(snap.startedAt)).not.toThrow();
	});

	it("resets all counters", () => {
		recordGameCreated();
		recordGameFinished();
		recordRoundCompleted(500);
		recordSubmission(true);
		recordApiError();
		resetMetrics();

		const snap = getMetricsSnapshot();
		expect(snap.gamesCreated).toBe(0);
		expect(snap.gamesFinished).toBe(0);
		expect(snap.roundsCompleted).toBe(0);
		expect(snap.submissionsReceived).toBe(0);
		expect(snap.apiErrors).toBe(0);
		expect(snap.avgRoundDurationMs).toBe(0);
	});
});
