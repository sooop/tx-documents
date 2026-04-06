export interface NavItem {
  slug: string;
  title: string;
  children?: NavItem[];
}

const navModules = import.meta.glob<NavItem[]>('/src/content/docs/**/_nav.json', {
  import: 'default',
});

export async function getNavTree(lang: string): Promise<NavItem[]> {
  const key = `/src/content/docs/${lang}/_nav.json`;
  const loader = navModules[key];
  if (!loader) return [];
  return await loader();
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
