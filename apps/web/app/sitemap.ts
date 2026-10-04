import type { MetadataRoute } from 'next';
import { getPublicPrograms } from '@/lib/db/queries/programs';
import { getAllPublicSheets } from '@/lib/data/dsa-sheets';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://rmscareers.com';
  const currentDate = new Date();

  // Static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0
    },
    {
      url: `${baseUrl}/programs`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${baseUrl}/curriculum`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/learn/dsa`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5
    }
  ];

  // Dynamic public DSA sheets
  const sheets = getAllPublicSheets();
  const sheetRoutes: MetadataRoute.Sitemap = sheets.map((sheet) => ({
    url: `${baseUrl}/learn/dsa/${sheet.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.7
  }));

  // Dynamic public programs from database
  let programRoutes: MetadataRoute.Sitemap = [];
  try {
    const publicPrograms = await getPublicPrograms();
    programRoutes = publicPrograms.map((p) => ({
      url: `${baseUrl}/programs/${p.code}`,
      lastModified: p.createdAt || currentDate,
      changeFrequency: 'weekly',
      priority: 0.8
    }));
  } catch (err) {
    console.error('[Sitemap] Failed to fetch public programs:', err);
  }

  return [...staticRoutes, ...sheetRoutes, ...programRoutes];
}
