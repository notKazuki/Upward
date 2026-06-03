import Link from "next/link";
import Atmosphere from "@/components/atmosphere";
import Logo from "@/components/logo";
import AuthButton from "@/components/auth-button";
import AuthModal from "@/components/auth-modal";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const signedIn = Boolean(await currentUser());

  return (
    <>
      <Atmosphere />
      {!signedIn && <AuthModal />}

      <div className="relative flex min-h-dvh flex-col px-5 sm:px-8">
        {/* ---------------------------------------------------------- */}
        {/* Top bar                                                    */}
        {/* ---------------------------------------------------------- */}
        <header className="u-fade u-d1 mx-auto flex w-full max-w-6xl items-center justify-between py-6">
          <Logo />

          <nav className="flex items-center gap-2 sm:gap-3">
            {signedIn ? (
              <Link
                href="/app"
                className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright shadow-[0_1px_2px_rgba(34,31,26,0.18)] transition-all duration-200 hover:bg-ink-soft hover:shadow-[0_4px_14px_rgba(34,31,26,0.18)]"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <AuthButton
                  mode="signin"
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors duration-200 hover:text-ink"
                >
                  Sign in
                </AuthButton>
                <AuthButton
                  mode="signup"
                  className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright shadow-[0_1px_2px_rgba(34,31,26,0.18)] transition-all duration-200 hover:bg-ink-soft hover:shadow-[0_4px_14px_rgba(34,31,26,0.18)]"
                >
                  Sign up
                </AuthButton>
              </>
            )}
          </nav>
        </header>

        {/* ---------------------------------------------------------- */}
        {/* Hero                                                       */}
        {/* ---------------------------------------------------------- */}
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center py-12 text-center">
          {/* eyebrow */}
          <p className="u-fade u-d2 flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.32em] text-faint">
            <span className="u-line u-d2 h-px w-8 origin-right bg-line-strong" />
            A quiet space for progress
            <span className="u-line u-d2 h-px w-8 origin-left bg-line-strong" />
          </p>

          {/* quote */}
          <h1 className="mt-8 font-display text-[clamp(2.4rem,7vw,4.6rem)] font-normal leading-[1.06] tracking-[-0.015em] text-ink">
            <span className="u-rise u-d3 block">Progress is</span>
            <span className="u-rise u-d4 block">
              rarely loud. It{" "}
              <em className="italic text-ember">rises,</em>
            </span>
            <span className="u-rise u-d5 block">one honest day at a time.</span>
          </h1>

          {/* sub-line */}
          <p className="u-fade u-d6 mt-9 max-w-md text-[1.02rem] leading-relaxed text-muted">
            Upward is one tracker for everything you&rsquo;re becoming — habits,
            goals, moods, money. It shapes itself around you.
          </p>

          {/* CTAs */}
          <div className="u-rise u-d7 mt-10 flex flex-col items-center gap-4 sm:flex-row">
            {signedIn ? (
              <Link
                href="/app"
                className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[0.95rem] font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft hover:shadow-[0_8px_24px_rgba(34,31,26,0.2)]"
              >
                Go to your dashboard
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            ) : (
              <>
                <AuthButton
                  mode="signup"
                  className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[0.95rem] font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft hover:shadow-[0_8px_24px_rgba(34,31,26,0.2)]"
                >
                  Create your space
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </AuthButton>

                <AuthButton
                  mode="signin"
                  className="cursor-pointer text-[0.95rem] font-medium text-ink-soft underline decoration-line-strong decoration-1 underline-offset-[5px] transition-colors duration-200 hover:text-ember hover:decoration-ember"
                >
                  I already have an account
                </AuthButton>
              </>
            )}
          </div>
        </main>

        {/* ---------------------------------------------------------- */}
        {/* Footer                                                     */}
        {/* ---------------------------------------------------------- */}
        <footer className="u-fade u-d7 mx-auto w-full max-w-6xl py-7 text-center text-xs text-faint">
          <p>Begin where you are. Rise by what you repeat.</p>
        </footer>
      </div>
    </>
  );
}
