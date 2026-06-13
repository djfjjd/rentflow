import type { Vehicle } from "@/lib/erp-data";

export function normalizeVehicleNumber(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function getVehicleLastFour(value: string) {
  return normalizeVehicleNumber(value).match(/\d{4}$/)?.[0] || "";
}

export function isVehicleNumberMatch(value: string | undefined, plateNumber: string) {
  if (!value) return false;

  const normalizedValue = normalizeVehicleNumber(value);
  const normalizedPlate = normalizeVehicleNumber(plateNumber);
  const lastFour = getVehicleLastFour(plateNumber);

  return normalizedValue === normalizedPlate || Boolean(lastFour && normalizedValue.includes(lastFour));
}

export function resolveVehiclePlateNumber(source: string, selectedVehicleNumber: string, vehicles: Vehicle[]) {
  if (selectedVehicleNumber) return selectedVehicleNumber;

  const fullPlate = source.match(/\d{2,3}[가-힣]\d{4}/)?.[0];
  if (fullPlate) return fullPlate;

  const lastFourCandidates = Array.from(new Set(source.match(/\d{4}/g) || []));
  if (lastFourCandidates.length === 0) return "";

  const matchedVehicles = vehicles.filter((vehicle) => lastFourCandidates.includes(getVehicleLastFour(vehicle.plateNumber)));

  return matchedVehicles.length === 1 ? matchedVehicles[0].plateNumber : "";
}

export function formatParkingLocation(value: string) {
  return value
    .replace(/본사\s*주차장/g, "")
    .replace(/본사주차장/g, "")
    .replace(/\s*구역/g, "")
    .trim();
}
