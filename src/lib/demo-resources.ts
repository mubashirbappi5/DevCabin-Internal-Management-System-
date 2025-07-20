// Demo resource data for Resource page
export interface ResourceItem {
  id: number;
  name: string;
  link: string;
  description: string;
  image?: string; // image url
  project: string;
}

export const demoResources: ResourceItem[] = [
  {
    id: 1,
    name: "React Docs",
    link: "https://react.dev/",
    description: "Official React documentation and guides.",
    image: "https://react.dev/images/og-home.png",
    project: "Frontend",
  },
  {
    id: 2,
    name: "Supabase",
    link: "https://supabase.com/",
    description: "Open source Firebase alternative.",
    image: "https://supabase.com/_next/image?url=%2Fimages%2Fog-image.png&w=1200&q=75",
    project: "Backend",
  },
  {
    id: 3,
    name: "Tailwind CSS",
    link: "https://tailwindcss.com/",
    description: "A utility-first CSS framework.",
    image: "https://tailwindcss.com/_next/static/media/social-card-large.6d6e5e5b.jpg",
    project: "UI/UX",
  },
];
