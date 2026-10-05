import { redirect } from 'next/navigation';

interface LibraryRedirectPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    batchId?: string;
  }>;
}

export default async function LibraryRedirectPage({
  params,
  searchParams
}: LibraryRedirectPageProps) {
  const { id } = await params;
  const { batchId } = await searchParams;

  const target = batchId ? `/content/${id}?batchId=${encodeURIComponent(batchId)}` : `/content/${id}`;
  redirect(target);
}
