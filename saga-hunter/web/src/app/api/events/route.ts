import { NextRequest } from "next/server";
import { redisSubscriber } from "@/lib/sse-server";

export async function GET(req: NextRequest) {
  const id = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      redisSubscriber.start();
      redisSubscriber.register({
        id,
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            redisSubscriber.unregister(id);
          }
        },
      });
    },
    cancel() {
      redisSubscriber.unregister(id);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
