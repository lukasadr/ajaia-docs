import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { DocumentEditor } from "@/components/document-editor";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) redirect("/login");
  const { id } = await params;
  return <DocumentEditor documentId={id} />;
}