export interface NavItem {
  slug: string;
  title: string;
  devOnly?: boolean;
  hasContent?: boolean;
  children?: NavItem[];
}

const navModules = import.meta.glob<NavItem[]>('/src/content/docs/**/_nav.json', {
  import: 'default',
});

const contentFiles = import.meta.glob('/src/content/docs/**/*.mdx');

function buildContentSlugs(lang: string): Set<string> {
  const slugs = new Set<string>();
  for (const path of Object.keys(contentFiles)) {
    // /src/content/docs/ko/settings/index.mdx → "settings"
    const match = path.match(/^\/src\/content\/docs\/([^/]+)\/(.+)\/index\.mdx$/);
    if (match && match[1] === lang) {
      slugs.add(match[2]);
    }
  }
  return slugs;
}

function filterDevItems(items: NavItem[]): NavItem[] {
  return items
    .filter((item) => !item.devOnly || import.meta.env.DEV)
    .map((item) =>
      item.children ? { ...item, children: filterDevItems(item.children) } : item,
    );
}

function annotateContentExists(items: NavItem[], existingSlugs: Set<string>): NavItem[] {
  return items.map((item) => ({
    ...item,
    hasContent: existingSlugs.has(item.slug),
    children: item.children ? annotateContentExists(item.children, existingSlugs) : undefined,
  }));
}

export async function getNavTree(lang: string): Promise<NavItem[]> {
  const key = `/src/content/docs/${lang}/_nav.json`;
  const loader = navModules[key];
  if (!loader) return [];
  const items = await loader();
  const filtered = filterDevItems(items);
  if (!import.meta.env.DEV) return filtered;
  const existingSlugs = buildContentSlugs(lang);
  return annotateContentExists(filtered, existingSlugs);
}

export interface BreadcrumbItem {
  slug: string;
  title: string;
}

export function getBreadcrumbs(
  navTree: NavItem[],
  currentSlug: string,
): BreadcrumbItem[] {
  const result: BreadcrumbItem[] = [];

  function walk(items: NavItem[], path: BreadcrumbItem[]): boolean {
    for (const item of items) {
      const current = [...path, { slug: item.slug, title: item.title }];
      if (item.slug === currentSlug) {
        result.push(...current);
        return true;
      }
      if (item.children && walk(item.children, current)) {
        return true;
      }
    }
    return false;
  }

  walk(navTree, []);
  return result;
}

export interface PrevNext {
  prev?: NavItem;
  next?: NavItem;
}

export function getPrevNext(navTree: NavItem[], currentSlug: string): PrevNext {
  const flat: NavItem[] = [];

  function flatten(items: NavItem[]) {
    for (const item of items) {
      flat.push(item);
      if (item.children) flatten(item.children);
    }
  }

  flatten(navTree);
  const index = flat.findIndex((item) => item.slug === currentSlug);
  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index < flat.length - 1 ? flat[index + 1] : undefined,
  };
}
