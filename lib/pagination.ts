// Page links for a paginator: first, last, and `delta` pages either side of
// the current one, with '...' marking gaps (a gap of exactly one page is
// shown as that page instead).
export function getPageNumbers(current: number, total: number, delta = 2): (number | '...')[] {
  const range: number[] = [];
  const rangeWithDots: (number | '...')[] = [];
  let l: number | undefined;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  range.forEach((i) => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  });

  return rangeWithDots;
}
