import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import FriendsClient from "@/components/social/friends-client";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { profilesByIds } from "@/lib/social-data";
import type { PublicProfile } from "@/lib/social";

export const metadata: Metadata = { title: "Friends — Upward" };

type Row = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

export default async function FriendsPage() {
  const me = await currentUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${me!.id},addressee_id.eq.${me!.id}`);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Header />
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/social.sql</code> in Supabase
            → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      </div>
    );
  }

  const rows = (data ?? []) as Row[];
  const otherId = (r: Row) => (r.requester_id === me!.id ? r.addressee_id : r.requester_id);
  const ids = [...new Set(rows.map(otherId))];
  const profiles = await profilesByIds(ids);

  const pack = (r: Row): { friendshipId: string; profile: PublicProfile } | null => {
    const p = profiles.get(otherId(r));
    if (!p) return null;
    return { friendshipId: r.id, profile: p };
  };
  const notNull = <T,>(x: T | null): x is T => x !== null;

  const friends = rows.filter((r) => r.status === "accepted").map(pack).filter(notNull);
  const incoming = rows
    .filter((r) => r.status === "pending" && r.addressee_id === me!.id)
    .map(pack)
    .filter(notNull);
  const outgoing = rows
    .filter((r) => r.status === "pending" && r.requester_id === me!.id)
    .map(pack)
    .filter(notNull);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Header />
      <FriendsClient friends={friends} incoming={incoming} outgoing={outgoing} />
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">Friends</h1>
      <p className="mt-1 text-sm text-muted">
        Find people by username, send requests, and see who you&rsquo;re connected with.
      </p>
    </div>
  );
}
