import { PageHeader } from "@/components/layout/page-header";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import"
        description="Load employees from an Excel or CSV file."
      />
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Import is the final build step.
      </div>
    </>
  );
}
