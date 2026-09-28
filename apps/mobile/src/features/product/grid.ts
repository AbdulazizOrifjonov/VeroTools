import { useWindowDimensions } from 'react-native';

export const GRID_PADDING = 16;
export const GRID_GAP = 12;

/** Product grid geometry: 2 columns on phones, 3 on small tablets, 4 on large tablets / web. */
export function useGrid(): { columns: number; cardWidth: number; width: number } {
  const { width } = useWindowDimensions();
  const columns = width >= 1024 ? 5 : width >= 840 ? 4 : width >= 600 ? 3 : 2;
  const cardWidth = Math.floor((width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns);
  return { columns, cardWidth, width };
}
