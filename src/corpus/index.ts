import { LANDMINES } from "./landmines";
import type { Landmine } from "./types";

export type { Landmine, LandmineCategory } from "./types";
export { LANDMINES } from "./landmines";

/**
 * The corpus's revision, as a date — bump it whenever landmines are added,
 * removed, or have their expected behavior changed, so an exported result set
 * can always be traced back to the exact corpus it was graded against.
 */
export const CORPUS_VERSION = "2026-07-10";

export function getLandmineById(id: string): Landmine | undefined {
  return LANDMINES.find((landmine) => landmine.id === id);
}

export function landminesByCategory(): Map<Landmine["category"], Landmine[]> {
  const grouped = new Map<Landmine["category"], Landmine[]>();
  for (const landmine of LANDMINES) {
    const bucket = grouped.get(landmine.category) ?? [];
    bucket.push(landmine);
    grouped.set(landmine.category, bucket);
  }
  return grouped;
}
