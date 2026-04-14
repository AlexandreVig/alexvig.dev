const digitUrls = [
  '/icons/minesweeper/digit0.webp',
  '/icons/minesweeper/digit1.webp',
  '/icons/minesweeper/digit2.webp',
  '/icons/minesweeper/digit3.webp',
  '/icons/minesweeper/digit4.webp',
  '/icons/minesweeper/digit5.webp',
  '/icons/minesweeper/digit6.webp',
  '/icons/minesweeper/digit7.webp',
  '/icons/minesweeper/digit8.webp',
  '/icons/minesweeper/digit9.webp',
];
const digitMinusUrl = '/icons/minesweeper/digit-.webp';

export function createDigits(container: HTMLElement): HTMLImageElement[] {
  container.innerHTML = '';
  const imgs = [
    document.createElement('img'),
    document.createElement('img'),
    document.createElement('img'),
  ];
  imgs.forEach((img) => {
    img.alt = '';
    container.appendChild(img);
  });
  return imgs;
}

function digitUrl(digit: string): string {
  return digitUrls[Number(digit)] ?? digitUrls[0]!;
}

export function setDigits(imgs: HTMLImageElement[], number: number): void {
  const [a, b, c] = imgs;
  if (!a || !b || !c) return;
  if (number < 0) {
    const n = -number % 100;
    const str = n < 10 ? `0${n}` : String(n);
    a.src = digitMinusUrl;
    b.src = digitUrl(str[0]!);
    c.src = digitUrl(str[1]!);
    return;
  }

  const n = Math.min(999, number);
  const str = String(n).padStart(3, '0');
  a.src = digitUrl(str[0]!);
  b.src = digitUrl(str[1]!);
  c.src = digitUrl(str[2]!);
}
