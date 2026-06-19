import Redis from "ioredis";

type SSEClient = {
  id: string;
  write: (data: string) => void;
};

class RedisSubscriber {
  private sub: Redis | null = null;
  private clients: Map<string, SSEClient> = new Map();
  private channels = ["sagahunter:seeds:new", "sagahunter:enrichment:new", "sagahunter:agent:run"];

  async start() {
    if (this.sub) return;
    const url = process.env.REDIS_URL || "redis://localhost:6379/0";
    this.sub = new Redis(url);
    this.sub.on("connect", () => {
      for (const ch of this.channels) {
        this.sub!.subscribe(ch);
      }
    });
    this.sub.on("message", (_channel, message) => {
      const sse = `data: ${JSON.stringify({ channel: _channel, message, timestamp: new Date().toISOString() })}\n\n`;
      for (const client of this.clients.values()) {
        try {
          client.write(sse);
        } catch {
          this.clients.delete(client.id);
        }
      }
    });
  }

  register(client: SSEClient) {
    this.clients.set(client.id, client);
    client.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  }

  unregister(id: string) {
    this.clients.delete(id);
  }

  get clientCount() {
    return this.clients.size;
  }
}

export const redisSubscriber = new RedisSubscriber();
