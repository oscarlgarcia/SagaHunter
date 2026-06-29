import Redis from "ioredis";

type SSEClient = {
  id: string;
  write: (data: string) => void;
};

class RedisSubscriber {
  private sub: Redis | null = null;
  private clients: Map<string, SSEClient> = new Map();
  private channels = ["sagahunter:seeds:new", "sagahunter:enrichment:new", "sagahunter:agent:run", "sagahunter:agent:start", "sagahunter:agent:progress", "sagahunter:story:progress", "sagahunter:story:complete"];

  async start() {
    if (this.sub) return;
    const url = process.env.REDIS_URL || process.env.KV_URL || "redis://localhost:6379/0";
    this.sub = new Redis(url, { enableReadyCheck: false });
    this.sub.on("ready", () => {
      console.log("[redis-subscriber] connected, subscribing to channels...");
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
    this.sub.on("error", (err) => {
      console.error("[redis-subscriber] error:", err.message);
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
