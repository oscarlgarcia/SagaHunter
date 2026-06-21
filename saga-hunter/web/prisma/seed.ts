import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_FEEDS = [
  { name: "BBC News", url: "http://feeds.bbci.co.uk/news/rss.xml", sourceType: "news", language: "en", intervalMinutes: 360 },
  { name: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", sourceType: "news", language: "es", intervalMinutes: 360 },
  { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml", sourceType: "news", language: "fr", intervalMinutes: 360 },
  { name: "La Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", sourceType: "news", language: "it", intervalMinutes: 360 },
  { name: "Reddit TIL", url: "https://www.reddit.com/r/todayilearned/.rss", sourceType: "curiosity", language: "en", intervalMinutes: 360 },
];

const MINING = ["news_aggregator", "curiosity_engine", "trend_hunter"];
const ANALYSIS = ["angle_finder", "story_structurer", "genre_classifier"];
const CREATIVE = ["what_if_generator", "world_builder", "character_harvester", "voice_tuner"];
const PUBLISHING = ["blurb_generator", "series_connector", "plot_hole_detector", "story_critique", "auto_summary"];

const DEFAULT_CONNECTIONS = [
  ...MINING.flatMap((t) => ANALYSIS.map((a) => ({ triggerAgent: t, actionAgent: a, enabled: true }))),
  ...ANALYSIS.flatMap((t) => CREATIVE.map((a) => ({ triggerAgent: t, actionAgent: a, enabled: true }))),
  ...CREATIVE.flatMap((t) => PUBLISHING.map((a) => ({ triggerAgent: t, actionAgent: a, enabled: true }))),
];

const AGENT_CONFIGS = [
  { agentName: "news_aggregator", enabled: true, mode: "auto", schedule: "*/15 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "curiosity_engine", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "trend_hunter", enabled: true, mode: "auto", schedule: "*/20 * * * *", languages: ["en"] },
  { agentName: "angle_finder", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "story_structurer", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "genre_classifier", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "what_if_generator", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "world_builder", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "character_harvester", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "voice_tuner", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "blurb_generator", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "series_connector", enabled: true, mode: "auto", schedule: "*/60 * * * *", languages: ["en"] },
  { agentName: "plot_hole_detector", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "story_critique", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
  { agentName: "auto_summary", enabled: true, mode: "auto", schedule: "*/30 * * * *", languages: ["en", "es", "fr", "it"] },
];

async function main() {
  console.log("Seeding database...");

  for (const feed of DEFAULT_FEEDS) {
    await prisma.feed.upsert({
      where: { url: feed.url },
      update: {},
      create: feed,
    });
  }
  console.log(`Created ${DEFAULT_FEEDS.length} feeds`);

  for (const cfg of AGENT_CONFIGS) {
    await prisma.agentConfig.upsert({
      where: { agentName: cfg.agentName },
      update: {},
      create: cfg,
    });
  }
  console.log(`Created ${AGENT_CONFIGS.length} agent configs`);

  for (const conn of DEFAULT_CONNECTIONS) {
    const existing = await prisma.agentConnection.findFirst({
      where: { triggerAgent: conn.triggerAgent, actionAgent: conn.actionAgent },
    });
    if (!existing) {
      await prisma.agentConnection.create({ data: conn });
    }
  }
  console.log(`Created ${DEFAULT_CONNECTIONS.length} pipeline connections`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
