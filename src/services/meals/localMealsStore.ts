import type { Meal } from "@/types/meal";
import { on } from "@/services/core/events";
import {
  getAllMealsLocal,
  getMealsPageLocal,
  getMealsPageLocalFiltered,
  getMealByCloudIdLocal,
} from "@/services/offline/meals.repo";
import {
  getMealDayKey,
  getMealSortTimestamp,
  isMealInDayKeyRange,
  normalizeMealDayKey,
} from "@/services/meals/mealMetadata";

type LocalMealEvent = {
  uid?: string;
  cloudId?: string;
  mealId?: string;
};

export type LocalMealsSnapshot = {
  meals: Meal[];
  loading: boolean;
  version: number;
};

type Listener = () => void;

const EMPTY_SNAPSHOT: LocalMealsSnapshot = {
  meals: [],
  loading: false,
  version: 0,
};

function mealIdentity(meal: Meal): string {
  return meal.cloudId || meal.mealId || `${meal.timestamp}:${meal.name || ""}`;
}

function sortMealsDesc(meals: Meal[]): Meal[] {
  return [...meals].sort(
    (left, right) => getMealSortTimestamp(right) - getMealSortTimestamp(left),
  );
}

async function loadAllMealsFromRepo(uid: string): Promise<Meal[]> {
  if (typeof getAllMealsLocal === "function") {
    return getAllMealsLocal(uid);
  }
  if (typeof getMealsPageLocal === "function") {
    return getMealsPageLocal(uid, 50, undefined);
  }
  if (typeof getMealsPageLocalFiltered === "function") {
    const page = await getMealsPageLocalFiltered(uid, {
      limit: 50,
      beforeISO: null,
    });
    return page.items;
  }
  return [];
}

class LocalMealsReadModel {
  private byId = new Map<string, Meal>();
  private listeners = new Set<Listener>();
  private unsubs: Array<() => void> = [];
  private loading = false;
  private version = 0;
  private loadToken = 0;

  constructor(private readonly uid: string) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.start();
    listener();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  snapshot(): LocalMealsSnapshot {
    return {
      meals: sortMealsDesc(Array.from(this.byId.values())),
      loading: this.loading,
      version: this.version,
    };
  }

  async refresh(): Promise<void> {
    const token = ++this.loadToken;
    this.loading = true;
    this.publish();

    try {
      const meals = await loadAllMealsFromRepo(this.uid);
      if (token !== this.loadToken) return;

      this.byId = new Map(
        meals
          .filter((meal) => !meal.deleted)
          .map((meal) => [mealIdentity(meal), meal]),
      );
      this.version += 1;
    } finally {
      if (token === this.loadToken) {
        this.loading = false;
        this.publish();
      }
    }
  }

  async applyLocalMealEvent(event?: LocalMealEvent): Promise<void> {
    if (!this.matchesUid(event)) return;

    const cloudId = String(event?.cloudId || event?.mealId || "");
    if (!cloudId) {
      await this.refresh();
      return;
    }

    const meal = await getMealByCloudIdLocal(this.uid, cloudId);
    if (!meal || meal.deleted) {
      this.removeById(cloudId);
      return;
    }

    this.upsert(meal);
  }

  removeById(id: string): void {
    if (this.removeByIdSilently(id)) {
      this.version += 1;
      this.publish();
    }
  }

  upsertLocal(meal: Meal): void {
    this.upsert(meal);
  }

  resetForTests(): void {
    this.stop();
  }

  private removeByIdSilently(id: string): boolean {
    let changed = false;
    for (const [key, meal] of this.byId.entries()) {
      if (key === id || meal.cloudId === id || meal.mealId === id) {
        this.byId.delete(key);
        changed = true;
      }
    }
    return changed;
  }

  private start(): void {
    if (this.unsubs.length > 0) return;

    this.unsubs = [
      on<LocalMealEvent>("meal:local:upserted", (event) => {
        void this.applyLocalMealEvent(event);
      }),
      on<LocalMealEvent>("meal:local:deleted", (event) => {
        void this.applyLocalMealEvent(event);
      }),
      on<LocalMealEvent>("meal:synced", (event) => {
        if (!this.matchesUid(event)) return;
        if (event?.cloudId || event?.mealId) {
          void this.applyLocalMealEvent(event);
        } else {
          void this.refresh();
        }
      }),
      on<LocalMealEvent>("meal:pushed", (event) => {
        if (!this.matchesUid(event)) return;
        if (event?.cloudId || event?.mealId) {
          void this.applyLocalMealEvent(event);
        } else {
          void this.refresh();
        }
      }),
      on<LocalMealEvent>("meal:deleted", (event) => {
        if (!this.matchesUid(event)) return;
        const cloudId = String(event?.cloudId || event?.mealId || "");
        if (cloudId) this.removeById(cloudId);
      }),
    ];

    void this.refresh();
  }

  private stop(): void {
    for (const unsubscribe of this.unsubs) {
      unsubscribe();
    }
    this.unsubs = [];
    this.byId.clear();
    this.loading = false;
    this.loadToken += 1;
    this.version += 1;
  }

  private matchesUid(event?: LocalMealEvent): boolean {
    return typeof event?.uid === "string" && event.uid === this.uid;
  }

  private upsert(meal: Meal): void {
    if (meal.userUid !== this.uid || meal.deleted) {
      this.removeById(mealIdentity(meal));
      return;
    }

    this.removeByIdSilently(meal.cloudId || meal.mealId);
    this.byId.set(mealIdentity(meal), meal);
    this.version += 1;
    this.publish();
  }

  private publish(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const stores = new Map<string, LocalMealsReadModel>();

function getStore(uid: string | null | undefined): LocalMealsReadModel | null {
  if (!uid) return null;
  let store = stores.get(uid);
  if (!store) {
    store = new LocalMealsReadModel(uid);
    stores.set(uid, store);
  }
  return store;
}

export function subscribeLocalMeals(
  uid: string | null | undefined,
  listener: Listener,
): () => void {
  const store = getStore(uid);
  if (!store) {
    listener();
    return () => undefined;
  }
  return store.subscribe(listener);
}

export function getLocalMealsSnapshot(
  uid: string | null | undefined,
): LocalMealsSnapshot {
  return getStore(uid)?.snapshot() ?? EMPTY_SNAPSHOT;
}

export async function refreshLocalMeals(
  uid: string | null | undefined,
): Promise<void> {
  await getStore(uid)?.refresh();
}

export function selectLocalMealsByDayKey(
  uid: string | null | undefined,
  dayKey: string | null | undefined,
  order: "asc" | "desc" = "asc",
): Meal[] {
  const normalizedDayKey = normalizeMealDayKey(dayKey);
  if (!normalizedDayKey) return [];

  const meals =
    getStore(uid)
      ?.snapshot()
      .meals.filter((meal) => getMealDayKey(meal) === normalizedDayKey) ?? [];

  return order === "asc" ? [...meals].reverse() : meals;
}

export function selectLocalMealsByRange(
  uid: string | null | undefined,
  range: { start: Date; end: Date },
): Meal[] {
  return (
    getStore(uid)
      ?.snapshot()
      .meals.filter((meal) => isMealInDayKeyRange(meal, range)) ?? []
  );
}

export function selectLocalMealByCloudId(
  uid: string | null | undefined,
  cloudId: string | null | undefined,
): Meal | null {
  if (!cloudId) return null;
  return (
    getStore(uid)
      ?.snapshot()
      .meals.find((meal) => meal.cloudId === cloudId || meal.mealId === cloudId) ??
    null
  );
}

export function upsertLocalMealSnapshot(
  uid: string | null | undefined,
  meal: Meal,
): void {
  getStore(uid)?.upsertLocal(meal);
}

export function removeLocalMealSnapshot(
  uid: string | null | undefined,
  cloudId: string,
): void {
  getStore(uid)?.removeById(cloudId);
}

export function __resetLocalMealsStoreForTests(): void {
  for (const store of stores.values()) {
    store.resetForTests();
  }
  stores.clear();
}
