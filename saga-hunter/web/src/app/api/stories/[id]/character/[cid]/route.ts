import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const UpdateCharacterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  archetype: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  traits: z.array(z.string()).nullable().optional(),
  backstory: z.string().nullable().optional(),
  arc: z.string().nullable().optional(),
  relationships: z.array(z.any()).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  try {
    const { data, error } = await safeParse(req, UpdateCharacterSchema);
    if (error) return error;

    const character = await prisma.storyCharacter.findFirst({
      where: { id: params.cid, storyId: params.id },
    });
    if (!character) return notFound();

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value;
    }

    const updated = await prisma.storyCharacter.update({
      where: { id: params.cid },
      data: updateData as any,
    });

    logger.info("Character updated", { characterId: params.cid, storyId: params.id });
    return ok(updated);
  } catch (e) {
    return handleError(e, "Failed to update character");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; cid: string } }
) {
  try {
    const character = await prisma.storyCharacter.findFirst({
      where: { id: params.cid, storyId: params.id },
    });
    if (!character) return notFound();

    await prisma.storyCharacter.delete({ where: { id: params.cid } });

    logger.info("Character deleted", { characterId: params.cid, storyId: params.id });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e, "Failed to delete character");
  }
}
