export const DURATION = 32;
export function phaseAt(time: number) {
  const t = Math.max(0, time);
  return t <= DURATION ? t : t % DURATION;
}
