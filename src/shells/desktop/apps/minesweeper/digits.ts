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

export function setDigits(imgs: HTMLImageElement[], number: number): void {
  if (number < 0) {
    const n = (-number) % 100;
    const str = n < 10 ? `0${n}` : String(n);
    imgs[0].src = digitMinusUrl;
    imgs[1].src = digitUrls[Number(str[0])];
    imgs[2].src = digitUrls[Number(str[1])];
    return;
  }

  const n = Math.min(999, number);
  const str = String(n).padStart(3, '0');
  imgs[0].src = digitUrls[Number(str[0])];
  imgs[1].src = digitUrls[Number(str[1])];
  imgs[2].src = digitUrls[Number(str[2])];
}
