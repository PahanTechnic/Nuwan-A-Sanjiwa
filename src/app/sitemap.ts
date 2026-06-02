import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://nuwan-a-sanjiwa.vercel.app', lastModified: new Date(), priority: 1 },
    { url: 'https://nuwan-a-sanjiwa.vercel.app/login', lastModified: new Date(), priority: 0.8 },
    { url: 'https://nuwan-a-sanjiwa.vercel.app/register', lastModified: new Date(), priority: 0.8 },
  ]
}