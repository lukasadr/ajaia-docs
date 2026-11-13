import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <Dashboard userName={user.name} />;
}