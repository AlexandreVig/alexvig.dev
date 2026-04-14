export type Difficulty = 'Beginner' | 'Intermediate' | 'Expert';

export type GameStatus = 'new' | 'started' | 'died' | 'won';

export type CellState =
  | 'cover'
  | 'flag'
  | 'unknown'
  | 'open'
  | 'mine'
  | 'die'
  | 'misflagged';

export interface Cell {
  state: CellState;
  isMine: boolean;
  minesAround: number;
}

export interface GameConfig {
  rows: number;
  columns: number;
  mines: number;
}

export const CONFIG: Record<Difficulty, GameConfig> = {
  Beginner: { rows: 9, columns: 9, mines: 10 },
  Intermediate: { rows: 16, columns: 16, mines: 40 },
  Expert: { rows: 16, columns: 30, mines: 99 },
};

export function nearIndexes(index: number, rows: number, columns: number): number[] {
  if (index < 0 || index >= rows * columns) return [];
  const row = Math.floor(index / columns);
  const column = index % columns;
  const candidates = [
    index - columns - 1,
    index - columns,
    index - columns + 1,
    index - 1,
    index + 1,
    index + columns - 1,
    index + columns,
    index + columns + 1,
  ];
  return candidates.filter((_, arrayIndex) => {
    if (row === 0 && arrayIndex < 3) return false;
    if (row === rows - 1 && arrayIndex > 4) return false;
    if (column === 0 && [0, 3, 5].includes(arrayIndex)) return false;
    if (column === columns - 1 && [2, 4, 7].includes(arrayIndex)) return false;
    return true;
  });
}

export function initCells({ rows, columns }: GameConfig): Cell[] {
  return Array.from({ length: rows * columns }, () => ({
    state: 'cover',
    isMine: false,
    minesAround: 0,
  }));
}

function shufflePick(count: number, maxExclusive: number, exclude: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < maxExclusive; i++) {
    if (i !== exclude) arr.push(i);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function placeMines(cells: Cell[], cfg: GameConfig, excludeIndex: number): void {
  const { rows, columns, mines } = cfg;
  const mineIndexes = shufflePick(mines, rows * columns, excludeIndex);
  mineIndexes.forEach((chosen) => {
    cells[chosen].isMine = true;
    nearIndexes(chosen, rows, columns).forEach((ni) => {
      if (!cells[ni].isMine) cells[ni].minesAround += 1;
    });
  });
}

export function autoOpenIndexes(cells: Cell[], cfg: GameConfig, startIndex: number): number[] {
  const { rows, columns } = cfg;
  const walked = new Array<boolean>(cells.length).fill(false);

  const walk = (idx: number): number[] => {
    const cell = cells[idx];
    if (!cell) return [];
    if (walked[idx]) return [];
    if (cell.state === 'flag') return [];
    if (cell.isMine) return [];
    walked[idx] = true;
    if (cell.minesAround > 0) return [idx];

    const out: number[] = [idx];
    for (const n of nearIndexes(idx, rows, columns)) {
      out.push(...walk(n));
    }
    return out;
  };

  return Array.from(new Set(walk(startIndex)));
}

export function countRemainingSafe(cells: Cell[]): number {
  return cells.filter((c) => c.state !== 'open' && !c.isMine).length;
}

export function computeRemainingMines(cells: Cell[], mines: number): number {
  const marked = cells.filter((c) => c.state === 'flag' || c.state === 'misflagged').length;
  return mines - marked;
}

export function cycleMark(state: CellState): CellState {
  switch (state) {
    case 'cover':
      return 'flag';
    case 'flag':
      return 'unknown';
    case 'unknown':
      return 'cover';
    default:
      return state;
  }
}
