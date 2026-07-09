import type { DigitalHuman, Persona, TargetPlatform } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { languageSettingsFromRecord, localizedText } from "@/services/global-language";

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
  const languageSettings = languageSettingsFromRecord(digitalHuman.persona);

  await prisma.$transaction(
    items.map((item, index) =>
      prisma.songIdea.create({
        data: {
          digitalHumanId,
          theme: item.theme,
          lyricsDirection: item.lyricsDirection,
          videoScript: item.videoScript,
          musicPrompt: item.musicPrompt,
          inputLanguage: languageSettings.inputLanguage,
          outputLanguage: languageSettings.outputLanguage,
          targetMarket: languageSettings.targetMarket,
          contentPlans: {
            create: {
              digitalHumanId,
              scheduledDate: addDays(windowStart, index),
              title: item.title,
              caption: item.caption,
              hashtags: item.hashtags,
              targetPlatform: item.targetPlatform,
              inputLanguage: languageSettings.inputLanguage,
              outputLanguage: languageSettings.outputLanguage,
              targetMarket: languageSettings.targetMarket,
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
  const languageSettings = languageSettingsFromRecord(digitalHuman.persona);
  return themes.map((theme, index) => {
    const platform = platforms[index % platforms.length];
    const title = `${digitalHuman.displayName} - ${titleCase(theme)}`;
    const tag = digitalHuman.displayName.replace(/\s+/g, "");

    return {
      theme,
      lyricsDirection: localizedText(
        languageSettings,
        `Write a concise hook about ${theme} for ${digitalHuman.persona?.audience}.`,
        `为 ${digitalHuman.persona?.audience} 写一句关于 ${theme} 的简洁中文副歌钩子。`,
        `เขียนฮุกภาษาไทยสั้นๆ เกี่ยวกับ ${theme} สำหรับ ${digitalHuman.persona?.audience}`
      ),
      videoScript: localizedText(
        languageSettings,
        `Open with ${digitalHuman.displayName} facing camera, cut to a hook moment, close with a reusable short-form loop.`,
        `开场让 ${digitalHuman.displayName} 直视镜头，切到副歌高光，结尾形成可循环短视频。`,
        `เปิดด้วย ${digitalHuman.displayName} มองกล้อง ตัดเข้าช่วงฮุก แล้วจบแบบวนลูปได้`
      ),
      musicPrompt: localizedText(
        languageSettings,
        `${digitalHuman.persona?.musicStyle ?? "modern pop"} song about ${theme}.`,
        `关于 ${theme} 的 ${digitalHuman.persona?.musicStyle ?? "modern pop"} 歌曲。`,
        `เพลง ${digitalHuman.persona?.musicStyle ?? "modern pop"} เกี่ยวกับ ${theme}`
      ),
      title,
      caption: localizedText(
        languageSettings,
        `${title}. Original AI music concept for short-form video.`,
        `${title}。面向短视频的原创 AI 音乐概念。`,
        `${title} คอนเซปต์เพลง AI ต้นฉบับสำหรับวิดีโอสั้น`
      ),
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
