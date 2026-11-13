import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, orderBy: { name: "asc" } });

  return (
    <main>
      <span className="eyebrow">Ajaia Documents</span>
      <h1>Choose a demo account.</h1>
      <p>Select a seeded user to start a signed demo session.</p>
      <div className="user-list">
        {users.map((user) => (
          <form className="user-row" action="/api/auth/login" method="post" key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit">Continue</button>
          </form>
        ))}
      </div>
      {users.length === 0 && <p className="status">No demo accounts found. Run the database seed command.</p>}
    </main>
  );
}