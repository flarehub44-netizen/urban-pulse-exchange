import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistState {
  ids: string[];
  toggle: (id: string) => void;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const { ids } = get();
        set({ ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
      },
    }),
    { name: "viax_watchlist" },
  ),
);
