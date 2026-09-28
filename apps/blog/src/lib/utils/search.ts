import type { Post, SearchResult } from "../types";

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countMatches(text: string | undefined, query: string): number {
  if (!text || !query) return 0;
  const regex = new RegExp(escapeRegex(query), "gi");
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export function searchPosts(posts: Post[], query: string): SearchResult[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  return posts
    .map((post) => {
      let matchCount = 0;
      matchCount += countMatches(post.title.toLowerCase(), lowerQuery);
      matchCount += countMatches(post.excerpt.toLowerCase(), lowerQuery);
      matchCount += countMatches(post.content?.toLowerCase(), lowerQuery);

      post.tags.forEach((tag) => {
        matchCount += countMatches(tag.toLowerCase(), lowerQuery);
      });

      return { ...post, matchCount };
    })
    .filter((result) => result.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);
}

export function highlightText(element: HTMLElement, query: string): number {
  if (!query.trim()) {
    removeHighlights(element);
    return 0;
  }

  removeHighlights(element);
  element.normalize();

  const textNodes = collectTextNodes(element);
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");

  return applyHighlights(textNodes, regex);
}

function removeHighlights(element: HTMLElement): void {
  element.querySelectorAll("mark.highlight").forEach((mark) => {
    const text = mark.textContent || "";
    mark.replaceWith(document.createTextNode(text));
  });
}

function collectTextNodes(element: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  let node: Node | null = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (
      parent &&
      parent.tagName !== "SCRIPT" &&
      parent.tagName !== "STYLE" &&
      !parent.classList.contains("highlight")
    ) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  return textNodes;
}

function applyHighlights(textNodes: Text[], regex: RegExp): number {
  let count = 0;

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || "";
    if (!regex.test(text)) return;

    const fragment = document.createDocumentFragment();
    const parts = text.split(regex);

    parts.forEach((part) => {
      if (regex.test(part)) {
        const mark = document.createElement("mark");
        mark.className = "highlight";
        mark.textContent = part;
        fragment.appendChild(mark);
        count++;
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    textNode.replaceWith(fragment);
  });

  return count;
}
