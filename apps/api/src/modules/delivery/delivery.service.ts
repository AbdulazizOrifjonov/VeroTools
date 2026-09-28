import type { Language } from '@vero/config';
import { findRegion } from '@vero/config';
import type { CourierOption, DeliveryOptionsDTO, PickupPointDTO } from '@vero/types';
import { addWorkingDays } from '@vero/utils';
import { DeliveryZone, PickupPoint, type IDeliveryZone, type IPickupPoint } from '../../models/delivery.model';
import { cache } from '../../lib/cache';
import { loc } from '../../lib/localize';
import { getSetting } from '../settings/settings.service';

const ZONES_KEY = 'catalog:delivery-zones';

async function activeZones(): Promise<IDeliveryZone[]> {
  return cache.wrap(ZONES_KEY, 120, () => DeliveryZone.find({ isActive: true }).sort({ priority: -1 }).lean());
}

export async function invalidateDeliveryCache() {
  await cache.invalidate(ZONES_KEY);
}

export async function zoneForRegion(region: string | undefined | null): Promise<IDeliveryZone | null> {
  if (!region) return null;
  const zones = await activeZones();
  return zones.find((z) => z.regions.includes(region)) ?? null;
}

/** Free-delivery threshold shown in the cart before the address is known (Tashkent zone). */
export async function defaultFreeThreshold(): Promise<number> {
  const zone = await zoneForRegion('tashkent-city');
  return zone?.freeThreshold || (await getSetting('delivery.defaultFreeThreshold'));
}

export function courierOption(zone: IDeliveryZone, subtotal: number, lang: Language, now = new Date()): CourierOption {
  const isFree = zone.freeThreshold > 0 && subtotal >= zone.freeThreshold;
  return {
    zoneId: String(zone._id),
    zoneName: loc(zone.name, lang),
    price: isFree ? 0 : zone.price,
    basePrice: zone.price,
    freeThreshold: zone.freeThreshold,
    isFree,
    minDays: zone.minDays,
    maxDays: zone.maxDays,
    estimatedFrom: addWorkingDays(now, Math.max(0, zone.minDays)).toISOString(),
    estimatedTo: addWorkingDays(now, Math.max(zone.minDays, zone.maxDays)).toISOString(),
  };
}

export function toPickupDTO(p: IPickupPoint, lang: Language): PickupPointDTO {
  return {
    id: String(p._id),
    code: p.code,
    name: loc(p.name, lang),
    address: loc(p.address, lang),
    region: p.region,
    city: p.city,
    phone: p.phone,
    workingHours: loc(p.workingHours, lang),
    location: { lat: p.location.lat, lng: p.location.lng },
  };
}

export async function activePickupPoints(): Promise<IPickupPoint[]> {
  return cache.wrap('catalog:pickup-points', 120, () => PickupPoint.find({ isActive: true }).sort({ region: 1, code: 1 }).lean());
}

export async function deliveryOptions(region: string | undefined, subtotal: number, lang: Language): Promise<DeliveryOptionsDTO> {
  const zone = region && findRegion(region) ? await zoneForRegion(region) : null;
  const points = await activePickupPoints();
  return {
    region,
    courier: zone ? courierOption(zone, subtotal, lang) : null,
    pickupPoints: points.map((p) => toPickupDTO(p, lang)),
  };
}
