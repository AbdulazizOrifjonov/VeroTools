import type { SeedProduct } from '../types';
import { ACCESSORIES } from './accessories';
import { COMPRESSORS } from './compressors';
import { CONSTRUCTION } from './construction';
import { CONSUMABLES } from './consumables';
import { DRILLS_HAMMERS } from './drills-hammers';
import { GARDEN } from './garden';
import { GENERATORS } from './generators';
import { GRINDERS_SAWS } from './grinders-saws';
import { HAND_TOOLS } from './hand-tools';
import { INDUSTRIAL } from './industrial';
import { JIGSAWS_WRENCHES } from './jigsaws-wrenches';
import { MEASURING } from './measuring';
import { PRESSURE_WASHERS } from './pressure-washers';
import { PUMPS } from './pumps';
import { SPARE_PARTS } from './spare-parts';
import { TOOL_SETS } from './tool-sets';
import { WELDING } from './welding';

/** Full OCKEAN catalogue, ordered like the category tree. */
export const PRODUCTS: SeedProduct[] = [
  ...DRILLS_HAMMERS,
  ...GRINDERS_SAWS,
  ...JIGSAWS_WRENCHES,
  ...HAND_TOOLS,
  ...PUMPS,
  ...COMPRESSORS,
  ...GENERATORS,
  ...WELDING,
  ...CONSTRUCTION,
  ...GARDEN,
  ...PRESSURE_WASHERS,
  ...MEASURING,
  ...ACCESSORIES,
  ...CONSUMABLES,
  ...SPARE_PARTS,
  ...TOOL_SETS,
  ...INDUSTRIAL,
];
