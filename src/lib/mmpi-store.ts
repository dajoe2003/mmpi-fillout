import { useSyncExternalStore } from "react";
import type { ParsedData } from "./mmpi-parser";

type State = {
  data: ParsedData | null;
  selectedIndices: Set<number>;
  sourceLabel: string;
};

let state: State = { data: null, selectedIndices: new Set(), sourceLabel: "" };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const mmpiStore = {
  get: () => state,
  set(partial: Partial<State>) {
    state = { ...state, ...partial };
    emit();
  },
  setData(data: ParsedData, sourceLabel: string) {
    state = { data, selectedIndices: new Set(), sourceLabel };
    emit();
  },
  toggle(idx: number) {
    const s = new Set(state.selectedIndices);
    if (s.has(idx)) s.delete(idx);
    else s.add(idx);
    state = { ...state, selectedIndices: s };
    emit();
  },
  selectAll(indices: number[]) {
    state = { ...state, selectedIndices: new Set(indices) };
    emit();
  },
  clear() {
    state = { ...state, selectedIndices: new Set() };
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useMmpi() {
  return useSyncExternalStore(
    (cb) => mmpiStore.subscribe(cb),
    () => state,
    () => state,
  );
}