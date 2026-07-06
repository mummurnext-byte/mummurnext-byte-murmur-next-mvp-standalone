import type { TargetPlatform } from "@prisma/client";

export type MetricInput = {
  date: string;
  platform: TargetPlatform;
  views: string | number;
  likes: string | number;
  comments: string | number;
  shares: string | number;
  watchTimeSeconds: string | number;
  revenue: string | number;
  currency?: string | null;
};

export type NormalizedMetricInput = {
  date: Date;
  platform: TargetPlatform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSeconds: number;
  revenue: number;
  currency: string;
};

export type AnalyticsMetricRow = NormalizedMetricInput & {
  publishRecordId: string;
  contentPlanId: string;
  contentPlanTitle: string;
  digitalHumanId: string;
  digitalHumanName: string;
};

export type AnalyticsFilters = {
  from?: string | null;
  to?: string | null;
  platform?: TargetPlatform | null;
  digitalHumanId?: string | null;
};

export type AnalyticsSummary = {
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    watchTimeSeconds: number;
    revenue: number;
  };
  topContentPlansByViews: RankedItem[];
  topContentPlansByRevenue: RankedItem[];
  topDigitalHumansByViews: RankedItem[];
  topPlatformsByRevenue: RankedItem[];
};

export type RankedItem = {
  id: string;
  label: string;
  views: number;
  revenue: number;
};

export function normalizeMetricInput(input: MetricInput): NormalizedMetricInput {
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (!input.date || Number.isNaN(date.getTime())) throw new Error("Metric date must be valid.");

  return {
    date,
    platform: input.platform,
    views: nonNegativeInteger(input.views, "views"),
    likes: nonNegativeInteger(input.likes, "likes"),
    comments: nonNegativeInteger(input.comments, "comments"),
    shares: nonNegativeInteger(input.shares, "shares"),
    watchTimeSeconds: nonNegativeInteger(input.watchTimeSeconds, "watchTimeSeconds"),
    revenue: nonNegativeNumber(input.revenue, "revenue"),
    currency: (input.currency || "USD").trim().toUpperCase()
  };
}

export function filterMetricRows(rows: AnalyticsMetricRow[], filters: AnalyticsFilters) {
  const from = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : null;

  return rows.filter((row) => {
    if (from && row.date < from) return false;
    if (to && row.date > to) return false;
    if (filters.platform && row.platform !== filters.platform) return false;
    if (filters.digitalHumanId && row.digitalHumanId !== filters.digitalHumanId) return false;
    return true;
  });
}

export function summarizeMetrics(rows: AnalyticsMetricRow[]): AnalyticsSummary {
  const totals = rows.reduce(
    (sum, row) => ({
      views: sum.views + row.views,
      likes: sum.likes + row.likes,
      comments: sum.comments + row.comments,
      shares: sum.shares + row.shares,
      watchTimeSeconds: sum.watchTimeSeconds + row.watchTimeSeconds,
      revenue: sum.revenue + row.revenue
    }),
    emptyAnalyticsSummary().totals
  );

  return {
    totals,
    topContentPlansByViews: rankRows(rows, (row) => row.contentPlanId, (row) => row.contentPlanTitle, "views"),
    topContentPlansByRevenue: rankRows(rows, (row) => row.contentPlanId, (row) => row.contentPlanTitle, "revenue"),
    topDigitalHumansByViews: rankRows(rows, (row) => row.digitalHumanId, (row) => row.digitalHumanName, "views"),
    topPlatformsByRevenue: rankRows(rows, (row) => row.platform, (row) => platformLabel(row.platform), "revenue")
  };
}

export function emptyAnalyticsSummary(): AnalyticsSummary {
  return {
    totals: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      watchTimeSeconds: 0,
      revenue: 0
    },
    topContentPlansByViews: [],
    topContentPlansByRevenue: [],
    topDigitalHumansByViews: [],
    topPlatformsByRevenue: []
  };
}

export function upsertMetricRows(rows: AnalyticsMetricRow[], next: AnalyticsMetricRow[]) {
  const byKey = new Map<string, AnalyticsMetricRow>();

  for (const row of rows) byKey.set(metricKey(row), row);
  for (const row of next) byKey.set(metricKey(row), row);

  return [...byKey.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function rankRows(
  rows: AnalyticsMetricRow[],
  idFor: (row: AnalyticsMetricRow) => string,
  labelFor: (row: AnalyticsMetricRow) => string,
  sortBy: "views" | "revenue"
) {
  const grouped = new Map<string, RankedItem>();

  for (const row of rows) {
    const id = idFor(row);
    const current = grouped.get(id) ?? {
      id,
      label: labelFor(row),
      views: 0,
      revenue: 0
    };

    current.views += row.views;
    current.revenue += row.revenue;
    grouped.set(id, current);
  }

  return [...grouped.values()]
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 10);
}

function metricKey(row: Pick<AnalyticsMetricRow, "publishRecordId" | "date">) {
  return `${row.publishRecordId}:${row.date.toISOString().slice(0, 10)}`;
}

function platformLabel(platform: TargetPlatform) {
  if (platform === "tiktok") return "TikTok";
  if (platform === "youtube_shorts") return "YouTube Shorts";
  return "YouTube";
}

function nonNegativeInteger(value: string | number, field: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${field} must be a non-negative integer.`);
  return number;
}

function nonNegativeNumber(value: string | number, field: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${field} must be a non-negative number.`);
  return number;
}
