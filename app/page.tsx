import { redirect } from "next/navigation";

// Unauthenticated requests never reach here — middleware redirects to
// /login first. Authenticated users land on their dashboard.
export default function Home() {
  redirect("/dashboard");
}
