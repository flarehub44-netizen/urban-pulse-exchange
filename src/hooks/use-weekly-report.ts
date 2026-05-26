import { useQuery } from "@tanstack/react-query";
import { getWeeklyReportFn } from "@/actions/retention";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "viax_weekly_report_seen";
const MIDWEEK_KEY = "viax_midweek_report_seen";

function weekKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function wasSeenThisWeek(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === weekKey();
  } catch {
    return false;
  }
}

function wasMidweekSeenThisWeek(): boolean {
  try {
    return localStorage.getItem(MIDWEEK_KEY) === weekKey();
  } catch {
    return false;
  }
}

export function markWeeklyReportSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, weekKey());
  } catch {
    /* ignore */
  }
}

export function markMidweekReportSeen() {
  try {
    localStorage.setItem(MIDWEEK_KEY, weekKey());
  } catch {
    /* ignore */
  }
}

export function useWeeklyReport() {
  const { userId } = useAuth();
  const day = new Date().getDay();
  const isMonday = day === 1;
  const isThursday = day === 4;
  const alreadySeen = wasSeenThisWeek();
  const midweekAlreadySeen = wasMidweekSeenThisWeek();

  const shouldFetch = !!userId && (isMonday || isThursday) && !(isMonday ? alreadySeen : midweekAlreadySeen);

  const query = useQuery({
    queryKey: ["weekly-report", userId],
    queryFn: () => getWeeklyReportFn(),
    enabled: shouldFetch,
    staleTime: 60 * 60 * 1000,
  });

  return {
    ...query,
    shouldShow: !!userId && isMonday && !alreadySeen && !!query.data,
    shouldShowMidweek: !!userId && isThursday && !midweekAlreadySeen && !!query.data,
  };
}
