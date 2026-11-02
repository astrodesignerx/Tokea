type Item = { id: string; parent_id: string | null; kind: string };

export function canHaveSubtasks(item: Pick<Item, "kind" | "parent_id">): boolean {
  return item.kind === "task" && item.parent_id === null;
}

/** Preserve sibling order while always presenting children directly below their parent. */
export function groupSubtasks<T extends Item>(items: readonly T[]): T[] {
  const children = new Map<string, T[]>();
  for (const item of items) if (item.parent_id) {
    const siblings = children.get(item.parent_id) ?? [];
    siblings.push(item);
    children.set(item.parent_id, siblings);
  }
  return items.filter((item) => !item.parent_id).flatMap((item) => [item, ...(children.get(item.id) ?? [])]);
}
