const digitUrls = [
  '/icons/minesweeper/digit0.png',
  '/icons/minesweeper/digit1.png',
  '/icons/minesweeper/digit2.png',
  '/icons/minesweeper/digit3.png',
  '/icons/minesweeper/digit4.png',
  '/icons/minesweeper/digit5.png',
  '/icons/minesweeper/digit6.png',
  '/icons/minesweeper/digit7.png',
  '/icons/minesweeper/digit8.png',
  '/icons/minesweeper/digit9.png',
];
const digitMinusUrl = '/icons/minesweeper/digit-.png';

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
