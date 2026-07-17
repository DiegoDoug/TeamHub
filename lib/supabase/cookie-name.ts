// @supabase/ssr derives its session cookie NAME from the Supabase URL's
// hostname unless told otherwise. Browser code always uses
// NEXT_PUBLIC_SUPABASE_URL (localhost, reachable from the host); server
// code running inside the `web` container uses SUPABASE_URL (the Docker
// service name `kong`) to actually reach the API. Left to derive the name
// from each own URL, the browser would write "sb-localhost-auth-token"
// while the server looked for "sb-kong-auth-token" — same session, two
// different cookies, so the server would never see the browser's login.
// Pinning an explicit, stable name on every client (browser, server,
// middleware) keeps them all reading/writing the same cookie regardless
// of which URL each one dials.
export const SUPABASE_AUTH_COOKIE_NAME = "sb-trackhub-auth-token";
