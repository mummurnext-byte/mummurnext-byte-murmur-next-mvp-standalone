import { describe, expect, it } from "vitest";

import {
  emptyAnalyticsSummary,
  filterMetricRows,
  normalizeMetricInput,
  summarizeMetrics,
  upsertMetricRows,
  type AnalyticsMetricRow
} from "./analytics";

describe("analytics", () => {
  it("normalizes metric input and edits an existing daily row", () => {
    const first = row({
      views: 100,
      revenue: 3
    });
    const edited = row({
      views: 250,
      likes: 30,
      revenue: 8.5
    });

    const rows = upsertMetricRows([first], [edited]);

    expect(rows).toHaveLength(1);
    expect(rows[0].views).toBe(250);
    expect(rows[0].likes).toBe(30);
    expect(rows[0].revenue).toBe(8.5);
  });

  it("calculates dashboard summary totals and rankings", () => {
    const summary = summarizeMetrics([
      row({ contentPlanId: "plan-1", contentPlanTitle: "Song A", digitalHumanId: "human-1", views: 100, revenue: 5 }),
      row({ contentPlanId: "plan-1", contentPlanTitle: "Song A", digitalHumanId: "human-1", views: 50, revenue: 2 }),
      row({
        publishRecordId: "post-2",
        contentPlanId: "plan-2",
        contentPlanTitle: "Song B",
        digitalHumanId: "human-2",
        digitalHumanName: "Human B",
        platform: "youtube",
        views: 500,
        likes: 40,
        comments: 7,
        shares: 9,
        watchTimeSeconds: 900,
        revenue: 21
      })
    ]);

    expect(summary.totals).toEqual({
      views: 650,
      likes: 40,
      comments: 7,
      shares: 9,
      watchTimeSeconds: 900,
      revenue: 28
    });
    expect(summary.topContentPlansByViews[0].label).toBe("Song B");
    expect(summary.topContentPlansByRevenue[0].label).toBe("Song B");
    expect(summary.topDigitalHumansByViews[0].label).toBe("Human B");
    expect(summary.topPlatformsByRevenue[0].label).toBe("YouTube");
  });

  it("returns an empty dashboard state", () => {
    expect(emptyAnalyticsSummary()).toEqual(summarizeMetrics([]));
  });

  it("filters rows by date range, platform, and digital human", () => {
    const rows = [
      row({ date: "2026-07-01", platform: "tiktok", digitalHumanId: "human-1" }),
      row({ date: "2026-07-05", platform: "youtube", digitalHumanId: "human-1" }),
      row({ date: "2026-07-10", platform: "tiktok", digitalHumanId: "human-2" })
    ];

    expect(
      filterMetricRows(rows, {
        from: "2026-07-02",
        to: "2026-07-09",
        platform: "youtube",
        digitalHumanId: "human-1"
      })
    ).toEqual([rows[1]]);
  });

  it("rejects negative metrics", () => {
    expect(() =>
      normalizeMetricInput({
        date: "2026-07-01",
        platform: "tiktok",
        views: -1,
        likes: 0,
        comments: 0,
        shares: 0,
        watchTimeSeconds: 0,
        revenue: 0,
        currency: "USD"
      })
    ).toThrow("views");
  });
});

type TestMetricRowInput = Partial<Omit<AnalyticsMetricRow, "date">> & { date?: string };

function row(overrides: TestMetricRowInput): AnalyticsMetricRow {
  const normalized = normalizeMetricInput({
    date: overrides.date ?? "2026-07-01",
    platform: overrides.platform ?? "tiktok",
    views: overrides.views ?? 0,
    likes: overrides.likes ?? 0,
    comments: overrides.comments ?? 0,
    shares: overrides.shares ?? 0,
    watchTimeSeconds: overrides.watchTimeSeconds ?? 0,
    revenue: overrides.revenue ?? 0,
    currency: overrides.currency ?? "USD"
  });

  return {
    ...normalized,
    publishRecordId: overrides.publishRecordId ?? "post-1",
    contentPlanId: overrides.contentPlanId ?? "plan-1",
    contentPlanTitle: overrides.contentPlanTitle ?? "Song A",
    digitalHumanId: overrides.digitalHumanId ?? "human-1",
    digitalHumanName: overrides.digitalHumanName ?? "Human A"
  };
}
