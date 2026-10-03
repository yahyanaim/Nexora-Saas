import ProjectDetailPage from "@/components/shared/work-projects-chunks/project-detail-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectDetailPage projectId={id} />
}
