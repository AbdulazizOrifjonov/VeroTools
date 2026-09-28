/**
 * Business clock used for domain timestamps (orders, payments, stock movements, notifications, document
 * createdAt/updatedAt). It is always the real time — except while the demo seeder or a test pins it
 * to replay history at past dates.
 */
let pinned: number | null = null;

export const clock = {
  now(): Date {
    return new Date(pinned ?? Date.now());
  },
  ms(): number {
    return pinned ?? Date.now();
  },
  /** Pin the clock to a date (seed / tests only); `null` returns to real time. */
  pin(date: Date | null): void {
    pinned = date ? date.getTime() : null;
  },
  get isPinned(): boolean {
    return pinned !== null;
  },
};

export const clockNow = () => clock.now();
