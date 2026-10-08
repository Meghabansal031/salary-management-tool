"use client";

import { useMemo, useState } from "react";

import { HeadcountChart } from "@/components/insights/headcount-chart";
import { DistributionChart } from "@/components/insights/distribution-chart";
import { InsightsControls } from "@/components/insights/insights-controls";
import { StatCards } from "@/components/insights/stat-cards";
import { SummaryTable } from "@/components/insights/summary-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useFilterOptions } from "@/hooks/use-employees";
import {
  useDistribution,
  useHeadcount,
  useSummary,
} from "@/hooks/use-insights";
import {
  DEFAULT_INSIGHTS,
  GROUP_LABELS,
  applyInsightsFilters,
  changeBasis,
  changeGroupBy,
  clearInsightsFilters,
  effectiveBasis,
  effectiveDistributionBasis,
  hasActiveInsightsFilters,
  scopeDescription,
  toDistributionParams,
  toHeadcountParams,
  toSummaryParams,
  type InsightsState,
} from "@/lib/insights-query";
import { basisCaption, summarizeStats } from "@/lib/insights-stats";
import type { GroupStats } from "@/lib/types";

const GROUP_NOUNS = {
  country: "Countries",
  department: "Departments",
  job_title: "Job titles",
} as const;

export default function InsightsPage() {
  const [state, setState] = useState<InsightsState>(DEFAULT_INSIGHTS);

  const summary = useSummary(toSummaryParams(state));
  const distribution = useDistribution(toDistributionParams(state));
  const headcount = useHeadcount(toHeadcountParams(state));
  const { data: options } = useFilterOptions();

  const countryNames = useMemo(
    () =>
      new Map<string, string>(
        (options?.countries ?? []).map((c) => [c.code, c.name]),
      ),
    [options],
  );

  // A country code such as "IN" reads better as "India"; other groups are already names.
  const label = (group: GroupStats) =>
    state.groupBy === "country"
      ? (countryNames.get(group.group) ?? group.group)
      : group.group;

  const items = summary.data?.items ?? [];
  const shownBasis = effectiveBasis(state);
  const distributionNote =
    state.basis === "local" && effectiveDistributionBasis(state) === "usd"
      ? "Shown in US dollars: choose a country to see local currency."
      : null;

  return (
    <>
      <PageHeader
        title="Insights"
        description={`How the organization pays people. Showing: ${scopeDescription(state, countryNames)}.`}
      />

      <InsightsControls
        state={state}
        options={options}
        onGroupBy={(groupBy) =>
          setState((current) => changeGroupBy(current, groupBy))
        }
        onBasis={(basis) => setState((current) => changeBasis(current, basis))}
        onFilter={(patch) =>
          setState((current) => applyInsightsFilters(current, patch))
        }
        onClear={() => setState(clearInsightsFilters)}
        canClear={hasActiveInsightsFilters(state)}
      />

      {summary.error && !summary.data ? (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700"
          role="alert"
        >
          <p className="font-medium">Could not load the statistics.</p>
          <p className="mt-1">{summary.error.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => summary.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <StatCards
            headline={summarizeStats(items)}
            groupNoun={GROUP_NOUNS[state.groupBy]}
            label={label}
          />

          <section className="mb-8" aria-labelledby="summary-title">
            <h2 id="summary-title" className="text-base font-semibold">
              Pay by {GROUP_LABELS[state.groupBy].toLowerCase()}
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              {basisCaption(shownBasis, items)} The typical range is where the
              middle half of the group falls.
            </p>
            <SummaryTable
              items={items}
              groupLabel={GROUP_LABELS[state.groupBy]}
              label={label}
              loading={summary.isPending}
              refreshing={summary.isFetching && !summary.isPending}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Spread: the thin line runs from the lowest to the highest salary,
              the blue box is the typical range, and the dark tick is the
              median.
            </p>
          </section>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <DistributionChart
          data={distribution.data}
          loading={distribution.isPending}
          note={distributionNote}
        />
        <HeadcountChart data={headcount.data} loading={headcount.isPending} />
      </div>
    </>
  );
}
