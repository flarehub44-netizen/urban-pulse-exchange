import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getKnockoutFixtures, getStandings } from "@/lib/api-football.server";

const copaQuerySchema = z.object({
  leagueId: z.number().default(1),
  season: z.number().default(2026),
});

export const getCopaStandingsFn = createServerFn({ method: "GET" })
  .validator(copaQuerySchema)
  .handler(async ({ data }) => {
    try {
      return await getStandings(data.leagueId, data.season);
    } catch {
      return [];
    }
  });

export const getCopaKnockoutFn = createServerFn({ method: "GET" })
  .validator(copaQuerySchema)
  .handler(async ({ data }) => {
    try {
      return await getKnockoutFixtures(data.leagueId, data.season);
    } catch {
      return [];
    }
  });
