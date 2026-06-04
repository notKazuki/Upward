// Returns the running deployment's version. The client captures this at load
// and polls it; when it changes, a new version has been deployed and we invite
// the user to refresh (rather than reloading under them).

export const dynamic = "force-dynamic";

export function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";
  return Response.json(
    { version },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
