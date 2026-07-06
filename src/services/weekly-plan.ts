import type { DigitalHuman, Persona } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getConfiguredLLMProvider,
  MockLLMProvider,
  withLLMFallback,
  type LLMProviderKey
} from "@/services/llm-provider";

type HumanWithPersona = DigitalHuman & { persona: Persona | null };

export async function generateWeeklyPlan(digitalHumanId: string, providerKey?: LLMProviderKey | null) {
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

  const generation = await withLLMFallback(
    getConfiguredLLMProvider(providerKey),
    (mock) => mock.generateWeeklyPlan(promptDigitalHuman(digitalHuman)),
    (provider) => provider.generateWeeklyPlan(promptDigitalHuman(digitalHuman))
  );

  await prisma.$transaction(
    generation.value.map((item, index) =>
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

  return generation;
}

export function mockGenerateWeeklyPlan(digitalHuman: HumanWithPersona) {
  return new MockLLMProvider().generateWeeklyPlan(promptDigitalHuman(digitalHuman));
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

function promptDigitalHuman(digitalHuman: HumanWithPersona) {
  if (!digitalHuman.persona) throw new Error("Digital human persona is required.");
  return {
    displayName: digitalHuman.displayName,
    persona: {
      archetype: digitalHuman.persona.archetype,
      backstory: digitalHuman.persona.backstory,
      toneOfVoice: digitalHuman.persona.toneOfVoice,
      audience: digitalHuman.persona.audience,
      musicStyle: digitalHuman.persona.musicStyle,
      visualStyle: digitalHuman.persona.visualStyle
    }
  };
}
