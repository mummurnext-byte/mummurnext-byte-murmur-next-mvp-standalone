export type SingerConceptOutput = {
  positioning: string;
  personaSummary: string;
  musicStyle: string;
  audience: string;
  contentDirection: string;
  contentPillars: string[];
};

export type SongIdeaOutput = {
  songTitle: string;
  theme: string;
  lyricsDirection: string;
  hook: string;
  videoScript: string;
  targetPlatform: "tiktok" | "youtube_shorts" | "youtube";
};

export type LyricsOutput = {
  songTitle: string;
  lyrics: string;
  hook: string;
  hashtags: string[];
};

export type MusicPromptOutput = {
  songTitle: string;
  lyrics: string;
  genre: string;
  mood: string;
  stylePrompt: string;
  hook: string;
  duration: string;
  songPrompt: string;
  hashtags: string[];
};

export type VideoBriefOutput = {
  videoBrief: string;
  videoTitle: string;
  avatarInstructions: string;
  cameraStyle: string;
  lipSyncNotes: string;
  scenePrompt: string;
  subtitleText: string;
  coverTitle: string;
};

export type PublishCopyOutput = {
  title: string;
  description: string;
  tiktokCaption: string;
  youtubeShortsTitle: string;
  youtubeShortsDescription: string;
  hashtags: string[];
};

export type NextContentOutput = {
  recommendations: {
    theme: string;
    rationale: string;
    targetPlatform: "tiktok" | "youtube_shorts" | "youtube";
  }[];
};

export type SmartAIOutput =
  | SingerConceptOutput
  | SongIdeaOutput
  | LyricsOutput
  | MusicPromptOutput
  | VideoBriefOutput
  | PublishCopyOutput
  | NextContentOutput;

export type SmartAISchema<T extends SmartAIOutput> = {
  name: string;
  jsonSchema: Record<string, unknown>;
  validate(value: unknown): T;
};

export const singerConceptSchema: SmartAISchema<SingerConceptOutput> = {
  name: "singer_concept",
  jsonSchema: objectSchema({
    positioning: stringSchema(),
    personaSummary: stringSchema(),
    musicStyle: stringSchema(),
    audience: stringSchema(),
    contentDirection: stringSchema(),
    contentPillars: arraySchema(stringSchema())
  }),
  validate(value) {
    const record = expectRecord(value);
    return {
      positioning: expectString(record.positioning, "positioning"),
      personaSummary: expectString(record.personaSummary, "personaSummary"),
      musicStyle: expectString(record.musicStyle, "musicStyle"),
      audience: expectString(record.audience, "audience"),
      contentDirection: expectString(record.contentDirection, "contentDirection"),
      contentPillars: expectStringArray(record.contentPillars, "contentPillars")
    };
  }
};

export const songIdeaSchema: SmartAISchema<SongIdeaOutput> = {
  name: "song_idea",
  jsonSchema: objectSchema({
    songTitle: stringSchema(),
    theme: stringSchema(),
    lyricsDirection: stringSchema(),
    hook: stringSchema(),
    videoScript: stringSchema(),
    targetPlatform: enumSchema(["tiktok", "youtube_shorts", "youtube"])
  }),
  validate(value) {
    const record = expectRecord(value);
    return {
      songTitle: expectString(record.songTitle, "songTitle"),
      theme: expectString(record.theme, "theme"),
      lyricsDirection: expectString(record.lyricsDirection, "lyricsDirection"),
      hook: expectString(record.hook, "hook"),
      videoScript: expectString(record.videoScript, "videoScript"),
      targetPlatform: expectTargetPlatform(record.targetPlatform)
    };
  }
};

export const lyricsSchema: SmartAISchema<LyricsOutput> = {
  name: "lyrics",
  jsonSchema: objectSchema({
    songTitle: stringSchema(),
    lyrics: stringSchema(),
    hook: stringSchema(),
    hashtags: arraySchema(stringSchema())
  }),
  validate(value) {
    const record = expectRecord(value);
    return {
      songTitle: expectString(record.songTitle, "songTitle"),
      lyrics: expectString(record.lyrics, "lyrics"),
      hook: expectString(record.hook, "hook"),
      hashtags: expectStringArray(record.hashtags, "hashtags")
    };
  }
};

export const musicPromptSchema: SmartAISchema<MusicPromptOutput> = {
  name: "music_prompt",
  jsonSchema: objectSchema({
    songTitle: stringSchema(),
    lyrics: stringSchema(),
    genre: stringSchema(),
    mood: stringSchema(),
    stylePrompt: stringSchema(),
    hook: stringSchema(),
    duration: stringSchema(),
    songPrompt: stringSchema(),
    hashtags: arraySchema(stringSchema())
  }),
  validate(value) {
    const record = expectRecord(value);
    return {
      songTitle: expectString(record.songTitle, "songTitle"),
      lyrics: expectString(record.lyrics, "lyrics"),
      genre: expectString(record.genre, "genre"),
      mood: expectString(record.mood, "mood"),
      stylePrompt: expectString(record.stylePrompt, "stylePrompt"),
      hook: expectString(record.hook, "hook"),
      duration: expectString(record.duration, "duration"),
      songPrompt: expectString(record.songPrompt, "songPrompt"),
      hashtags: expectStringArray(record.hashtags, "hashtags")
    };
  }
};

export const videoBriefSchema: SmartAISchema<VideoBriefOutput> = {
  name: "video_brief",
  jsonSchema: objectSchema({
    videoBrief: stringSchema(),
    videoTitle: stringSchema(),
    avatarInstructions: stringSchema(),
    cameraStyle: stringSchema(),
    lipSyncNotes: stringSchema(),
    scenePrompt: stringSchema(),
    subtitleText: stringSchema(),
    coverTitle: stringSchema()
  }),
  validate(value) {
    const record = expectRecord(value);
    return {
      videoBrief: expectString(record.videoBrief, "videoBrief"),
      videoTitle: expectString(record.videoTitle, "videoTitle"),
      avatarInstructions: expectString(record.avatarInstructions, "avatarInstructions"),
      cameraStyle: expectString(record.cameraStyle, "cameraStyle"),
      lipSyncNotes: expectString(record.lipSyncNotes, "lipSyncNotes"),
      scenePrompt: expectString(record.scenePrompt, "scenePrompt"),
      subtitleText: expectString(record.subtitleText, "subtitleText"),
      coverTitle: expectString(record.coverTitle, "coverTitle")
    };
  }
};

export const publishCopySchema: SmartAISchema<PublishCopyOutput> = {
  name: "publish_copy",
  jsonSchema: objectSchema({
    title: stringSchema(),
    description: stringSchema(),
    tiktokCaption: stringSchema(),
    youtubeShortsTitle: stringSchema(),
    youtubeShortsDescription: stringSchema(),
    hashtags: arraySchema(stringSchema())
  }),
  validate(value) {
    const record = expectRecord(value);
    return {
      title: expectString(record.title, "title"),
      description: expectString(record.description, "description"),
      tiktokCaption: expectString(record.tiktokCaption, "tiktokCaption"),
      youtubeShortsTitle: expectString(record.youtubeShortsTitle, "youtubeShortsTitle"),
      youtubeShortsDescription: expectString(record.youtubeShortsDescription, "youtubeShortsDescription"),
      hashtags: expectStringArray(record.hashtags, "hashtags")
    };
  }
};

export const nextContentSchema: SmartAISchema<NextContentOutput> = {
  name: "next_content",
  jsonSchema: objectSchema({
    recommendations: arraySchema(
      objectSchema({
        theme: stringSchema(),
        rationale: stringSchema(),
        targetPlatform: enumSchema(["tiktok", "youtube_shorts", "youtube"])
      })
    )
  }),
  validate(value) {
    const record = expectRecord(value);
    if (!Array.isArray(record.recommendations)) {
      throw new Error("recommendations must be an array.");
    }

    return {
      recommendations: record.recommendations.map((item, index) => {
        const recommendation = expectRecord(item);
        return {
          theme: expectString(recommendation.theme, `recommendations.${index}.theme`),
          rationale: expectString(recommendation.rationale, `recommendations.${index}.rationale`),
          targetPlatform: expectTargetPlatform(recommendation.targetPlatform)
        };
      })
    };
  }
};

function objectSchema(properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties
  };
}

function stringSchema() {
  return { type: "string" };
}

function arraySchema(items: Record<string, unknown>) {
  return { type: "array", items };
}

function enumSchema(values: string[]) {
  return { type: "string", enum: values };
}

function expectRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Smart AI output must be an object.");
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function expectStringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty string array.`);
  }
  return value.map((item, index) => expectString(item, `${field}.${index}`));
}

function expectTargetPlatform(value: unknown) {
  if (value === "tiktok" || value === "youtube_shorts" || value === "youtube") return value;
  throw new Error("targetPlatform must be tiktok, youtube_shorts, or youtube.");
}
