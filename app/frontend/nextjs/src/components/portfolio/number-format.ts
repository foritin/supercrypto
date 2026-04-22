export function formatNumberNoGrouping(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  if (!Number.isFinite(value)) return '0';

  return value.toLocaleString(undefined, {
    useGrouping: false,
    ...options,
  });
}
