import { useQuery } from "@tanstack/react-query";
import { getWeeklyReportFn } from "@/actions/retention";
import { useAnonAuth } from "@/hooks/use-anon-auth";

const STORAGE_KEY = "viax_weekly_report_seen";

function wasSeenThisWeek(): boolean {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    return localStorage.getItem(STORAGE_KEY) === key;
  } catch {
    return false;
  }
}

export function markWeeklyReportSeen() {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    localStorage.setItem(STORAGE_KEY, weekStart.toISOString().slice(0, 10));
  } catch {
    /* ignore */
  }
}

export function useWeeklyReport() {
  const { userId } = useAnonAuth();
  const isMonday = new Date().getDay() === 1;
  const alreadySeen = wasSeenThisWeek();

  const query = useQuery({
    queryKey: ["weekly-report", userId],
    queryFn: () => getWeeklyReportFn(),
    enabled: !!userId && isMonday && !alreadySeen,
    staleTime: 60 * 60 * 1000,
  });

  return {
    ...query,
    shouldShow: !!userId && isMonday && !alreadySeen && !!query.data,
  };
}
