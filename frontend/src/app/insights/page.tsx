import { PageHeader } from "@/components/layout/page-header";

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        title="Insights"
        description="How the organization pays people, by country, department and job title."
      />
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        The dashboard is built in a later step.
      </div>
    </>
  );
}
