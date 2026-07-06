import type { DigitalHuman, Persona, TargetPlatform } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type HumanWithPersona = DigitalHuman & { persona: Persona | null };

const themes = [
  "quiet confidence",
  "late night reset",
  "founder glow up",
  "summer revenge",
  "soft launch romance",
  "city lights",
  "future self"
];

const platforms: TargetPlatform[] = ["tiktok", "youtube_shorts", "youtube"];

export async function generateWeeklyPlan(digitalHumanId: string) {
  const digitalHuman = await prisma.digitalHuman.findFirst({
    where: { id: digitalHumanId, deletedAt: null },
    include: { persona: true }
  });

  if (!digitalHuman || !digitalHuman.persona || digitalHuman.persona.deletedAt) {
    throw new Error("Digital human and active persona are required.");
  }

  const consent = await prisma.consentRecord.findFirst({
    where: {
      digitalHumanId,
      deletedAt: null,
      signedAt: { lte: new Date() },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    }
  });

  if (!consent) {
    throw new Error("Active consent is required before generating a weekly plan.");
  }

  const windowStart = startOfDay(new Date());
  const windowEnd = addDays(windowStart, 7);
  const duplicate = await prisma.contentPlan.findFirst({
    where: {
      digitalHumanId,
      deletedAt: null,
      scheduledDate: { gte: windowStart, lt: windowEnd }
    },
    select: { id: true }
  });

  if (duplicate) {
    throw new Error("This digital human already has a plan in the current 7-day window.");
  }

  const items = mockGenerateWeeklyPlan(digitalHuman);

  await prisma.$transaction(
    items.map((item, index) =>
      prisma.songIdea.create({
        data: {
          digitalHumanId,
          theme: item.theme,
          lyricsDirection: item.lyricsDirection,
          videoScript: item.videoScript,
          musicPrompt: item.musicPrompt,
          contentPlans: {
            create: {
              digitalHumanId,
              scheduledDate: addDays(windowStart, index),
              title: item.title,
              caption: item.caption,
              hashtags: item.hashtags,
              targetPlatform: item.targetPlatform,
              platformPosts: {
                create: {
                  platform: item.targetPlatform
                }
              }
            }
          }
        }
      })
    )
  );
}

export function mockGenerateWeeklyPlan(digitalHuman: HumanWithPersona) {
  return themes.map((theme, index) => {
    const platform = platforms[index % platforms.length];
    const title = `${digitalHuman.displayName} - ${titleCase(theme)}`;
    const tag = digitalHuman.displayName.replace(/\s+/g, "");

    return {
      theme,
      lyricsDirection: `Write a concise hook about ${theme} for ${digitalHuman.persona?.audience}.`,
      videoScript: `Open with ${digitalHuman.displayName} facing camera, cut to a hook moment, close with a reusable short-form loop.`,
      musicPrompt: `${digitalHuman.persona?.musicStyle ?? "modern pop"} song about ${theme}.`,
      title,
      caption: `${title}. Original AI music concept for short-form video.`,
      hashtags: ["#MummurNext", `#${tag}`, "#AIMusic"],
      targetPlatform: platform
    };
  });
}

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
