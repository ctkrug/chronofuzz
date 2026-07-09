import { LANDMINES } from "./landmines";
import type { Landmine } from "./types";

export type { Landmine, LandmineCategory } from "./types";
export { LANDMINES } from "./landmines";

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
