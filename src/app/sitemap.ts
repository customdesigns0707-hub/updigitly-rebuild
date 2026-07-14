import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Sitemap — the five primary public pages plus /legal (Sitemap v2, Decision #3).
 * Enrollment/transaction routes are intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const routes = ['', '/system', '/pricing', '/strategy-call', '/contact', '/legal'];
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : path === '/legal' ? 0.3 : 0.7,
  }));
}
