import { EditorClient } from "@/components/editor/EditorClient";

type EditorPageProps = {
  params: Promise<{ projectId: string }>;
};

async function getProjectTitle(projectId: string): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/projects/${projectId}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return "Проект";
    const data = await res.json();
    return data.title ?? "Проект";
  } catch {
    return "Проект";
  }
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  const title = await getProjectTitle(projectId);

  return <EditorClient projectId={projectId} projectTitle={title} />;
}
