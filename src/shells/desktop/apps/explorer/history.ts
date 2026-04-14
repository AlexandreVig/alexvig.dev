export interface NavHistory {
  canBack(): boolean;
  canForward(): boolean;
  back(current: string): string | undefined;
  forward(current: string): string | undefined;
  push(current: string): void;
}

export function createHistory(): NavHistory {
  const back: string[] = [];
  const forward: string[] = [];

  return {
    canBack: () => back.length > 0,
    canForward: () => forward.length > 0,
    back(current) {
      const prev = back.pop();
      if (prev === undefined) return undefined;
      forward.push(current);
      return prev;
    },
    forward(current) {
      const next = forward.pop();
      if (next === undefined) return undefined;
      back.push(current);
      return next;
    },
    push(current) {
      back.push(current);
      forward.length = 0;
    },
  };
}
