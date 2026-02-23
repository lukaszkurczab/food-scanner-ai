import type { Meal } from "@/types/meal";

export type DaySection = {
  title: string;
  dateKey: string;
  totalKcal: number;
  data: Meal[];
};
