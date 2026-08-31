import type { MetadataRoute } from 'next';
import { siteUrl } from '../src/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date('2026-09-01'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
