import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ok, notFound, safeParse, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

const LocationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().optional(),
  description: z.string().optional(),
  significance: z.string().optional(),
  chaptersFeatured: z.array(z.number()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await safeParse(req, LocationSchema);
    if (error) return error;

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) return notFound("Story not found");

    const location = await prisma.storyLocation.create({
      data: { ...data, storyId: params.id },
    });

    logger.info("Location created", { locationId: location.id, storyId: params.id });
    return ok(location);
  } catch (e) {
    return handleError(e, "Failed to create location");
  }
}
