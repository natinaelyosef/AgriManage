/**
 * Ethiopian agricultural units. Users pick a default unit per organization;
 * conversion factors below are the official ones used by the Ministry of
 * Agriculture (timad -> hectare, quintal -> kilogram).
 */

export type AreaUnit = "hectare" | "timad";
export type MassUnit = "quintal" | "kilogram" | "ton";

const TIMAD_PER_HECTARE = 2.5167; // 1 ha = 2.5167 timad (0.39733 ha per timad)

export function areaToHectares(value: number, unit: AreaUnit): number {
  if (unit === "timad") return round(value / TIMAD_PER_HECTARE, 4);
  return round(value, 4);
}

export function hectaresTo(value: number, unit: AreaUnit): number {
  if (unit === "timad") return round(value * TIMAD_PER_HECTARE, 4);
  return round(value, 4);
}

export function massToKilograms(value: number, unit: MassUnit): number {
  if (unit === "quintal") return round(value * 100, 3);
  if (unit === "ton") return round(value * 1000, 3);
  return round(value, 3);
}

export function kilogramsTo(value: number, unit: MassUnit): number {
  if (unit === "quintal") return round(value / 100, 3);
  if (unit === "ton") return round(value / 1000, 3);
  return round(value, 3);
}

/** Yield expressed in quintal per hectare regardless of stored unit. */
export function yieldPerHectare(quantity: number, unit: MassUnit, areaHectares: number): number {
  if (areaHectares <= 0) return 0;
  return round(massToKilograms(quantity, unit) / 100 / areaHectares, 2);
}

export function costPerHectare(totalCost: number, areaHectares: number): number {
  if (areaHectares <= 0) return 0;
  return round(totalCost / areaHectares, 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
