import Atmosphere from "@/components/atmosphere";
import Logo from "@/components/logo";

/**
 * Shared frame for the sign in / sign up screens:
 * atmosphere + top bar + a centered card that reveals on load.
 */
export default function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Atmosphere />

      <div className="relative flex min-h-dvh flex-col px-5 sm:px-8">
        <header className="u-fade u-d1 mx-auto flex w-full max-w-6xl items-center py-6">
          <Logo />
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="u-rise u-d2 mb-7 text-center">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.32em] text-faint">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-display text-[clamp(2rem,6vw,2.9rem)] font-normal leading-tight tracking-[-0.015em] text-ink">
              {title}
            </h1>
          </div>

          <div className="u-rise u-d3 rounded-2xl border border-line bg-card p-6 shadow-[0_18px_50px_-24px_rgba(34,31,26,0.35)] sm:p-8">
            {children}
          </div>
        </main>

        <footer className="u-fade u-d4 mx-auto w-full max-w-6xl py-7 text-center text-xs text-faint">
          <p>Rise by what you repeat.</p>
        </footer>
      </div>
    </>
  );
}
