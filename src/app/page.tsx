import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main>
      <span className="eyebrow">Ajaia Documents</span>
      <h1>Welcome, {user.name}.</h1>
      <p>You are signed in to the document-sharing demo.</p>
      <form action="/api/auth/logout" method="post">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}