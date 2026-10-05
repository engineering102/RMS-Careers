import { redirect } from 'next/navigation';

interface CurriculumRedirectPageProps {
  params: Promise<{
    batchId: string;
  }>;
}

export default async function CurriculumRedirectPage({ params }: CurriculumRedirectPageProps) {
  const { batchId } = await params;
  redirect(`/batches/${batchId}`);
}
