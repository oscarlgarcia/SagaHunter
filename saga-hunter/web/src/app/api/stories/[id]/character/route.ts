import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const CharacterSchema = z.object({
  name: z.string().min(1).max(200),
  archetype: z.string().optional(),
  role: z.string().optional(),
  traits: z.array(z.string()).optional(),
  backstory: z.string().optional(),
  arc: z.string().optional(),
  relationships: z.array(z.any()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await safeParse(req, CharacterSchema);
    if (error) return error;

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) return notFound("Story not found");

    const character = await prisma.storyCharacter.create({
      data: { ...data, storyId: params.id },
    });

    logger.info("Character created", { characterId: character.id, storyId: params.id });
    return ok(character);
  } catch (e) {
    return handleError(e, "Failed to create character");
  }
}
