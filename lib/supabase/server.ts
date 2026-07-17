import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/cookie-name";

// Server Component / Server Action / Route Handler client.
// Uses the anon key + the caller's session cookie so every query still
// goes through RLS as that user — never use the service role key here.
//
// URL note: NEXT_PUBLIC_SUPABASE_URL is the browser-facing address
// (http://localhost:8000, reachable from the host). Inside the `web`
// Docker container that same "localhost" resolves to the container
// itself, not Kong — server-side code needs SUPABASE_URL
// (http://kong:8000, the Docker service name) instead, set only in
// docker-compose.yml. Local `npm run dev` has no SUPABASE_URL, so it
// falls back to the public one, which is correct there since the dev
// server itself runs on the host.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore because
            // middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}
