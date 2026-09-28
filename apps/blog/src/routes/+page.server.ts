import type { Post } from "$lib/types";
import type { PageServerLoad } from "./$types";

interface PostMetadata {
  title?: string;
  excerpt?: string;
  date?: string;
  tags?: string[];
  published?: boolean;
}

interface PostModule {
  metadata?: PostMetadata;
}

const postModules = import.meta.glob<PostModule>("./blog/*/+page.svx", {
  eager: true,
});

const rawContent = import.meta.glob<string>("./blog/*/+page.svx", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const load: PageServerLoad = async () => {
  const posts: Post[] = [];

  for (const path in postModules) {
    const module = postModules[path];
    const metadata = module.metadata || {};

    if (metadata.published === false) continue;

    const slug = path.replace(/^\.\/blog\//, "").replace(/\/\+page\.svx$/, "");
    const content = rawContent[path] || "";

    posts.push({
      slug,
      title: metadata.title || "Untitled",
      excerpt: metadata.excerpt || "",
      date: metadata.date || new Date().toISOString(),
      tags: metadata.tags || [],
      published: true,
      content,
    });
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { posts };
};
