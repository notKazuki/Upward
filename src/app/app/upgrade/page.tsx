import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/icons";
import { getProStatus } from "@/lib/pro-data";
import UpgradeView from "@/components/pro/upgrade-view";

export const metadata: Metadata = { title: "Upward Pro" };

export default async function UpgradePage() {
  const { pro } = await getProStatus();

  if (pro) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="u-rise rounded-2xl border border-line bg-card p-8 text-center">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-ember">
              <Icon name="sparkle" size={13} />
              Upward Pro
            </span>
          </div>
          <h1 className="mt-4 font-display text-[2rem] text-ink">You&rsquo;re Upward Pro</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Every Pro feature is unlocked — unlimited coaching, Smart Log, deep insights, and your
            full history. Thank you for backing the work.
          </p>
          <Link
            href="/app/coach"
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper-bright px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-ember/50"
          >
            Open your coach
            <Icon name="external" size={15} />
          </Link>
        </div>
      </div>
    );
  }

  return <UpgradeView />;
}
