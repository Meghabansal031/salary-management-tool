import { formatMoney } from "@/lib/format";
import { MIN_PEERS_FOR_FLAGS } from "@/lib/peer";
import type { PeerStats } from "@/lib/types";

/** Shown when the list is filtered by country and job title: how that peer group is paid. */
export function PeerBanner({ peers, countryName }: { peers: PeerStats; countryName: string }) {
  const tooFew = peers.count < MIN_PEERS_FOR_FLAGS;

  return (
    <div className="mb-4 rounded-lg border bg-muted/40 p-4 text-sm" role="status">
      <p className="font-medium">
        {peers.job_title} in {countryName}: {peers.count} {peers.count === 1 ? "person" : "people"}
      </p>
      <p className="mt-1 text-muted-foreground">
        Typical range (the middle half):{" "}
        <strong className="text-foreground">
          {formatMoney(peers.p25, peers.currency)} to {formatMoney(peers.p75, peers.currency)}
        </strong>
        , median {formatMoney(peers.median, peers.currency)}.{" "}
        {tooFew
          ? `Fewer than ${MIN_PEERS_FOR_FLAGS} people, so nobody is flagged.`
          : "Salaries outside that range are flagged in the table."}
      </p>
    </div>
  );
}
