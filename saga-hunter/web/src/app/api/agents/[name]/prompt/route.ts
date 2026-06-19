import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_PROMPTS: Record<string, string> = {
  angle_finder: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a narrative analysis assistant. Analyze the following news text and extract narrative elements.
Schema:
{
  "protagonists": ["name1", "name2"],
  "conflict_type": "internal" or "external",
  "settings": ["setting1"],
  "theme_scores": {"conflict": 0-10, "mystery": 0-10, "arc": 0-10},
  "summary": "One sentence summary"
}

Language of text: {language}

Text: {text}`,
  genre_classifier: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a literary genre classifier. Analyze the following text and classify its genres.
Schema:
{
  "genre_scores": {"genre_name": {"score": 0-100, "matches": number of textual signals found}},
  "primary_genre": "most likely genre",
  "secondary_genre": "second most likely genre or null"
}

Possible genres: sci-fi, fantasy, drama, thriller, romance, horror, mystery, comedy, adventure, tragedy, historical, dystopian, mythology, crime, western, satire.
Ensure 'matches' reflects an approximate count of textual signals or keywords found for each genre.

Language of text: {language}

Text: {text}`,
  story_structurer: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a story structure analyst. Analyze the following text and identify narrative structure.
Schema:
{
  "three_act_scores": {
    "act1": {"label": "Setup", "detected": true, "matches": 5},
    "act2": {"label": "Confrontation", "detected": true, "matches": 3},
    "act3": {"label": "Resolution", "detected": false, "matches": 0}
  },
  "structure_name": "Three-Act Structure" or other
}

For each act, set 'matches' to an estimate of how many textual signals support detection.

Language of text: {language}

Text: {text}`,
  character_harvester: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a character extraction assistant. Extract all characters mentioned in the text.
Schema:
{
  "characters": [{
    "name": "Character Name",
    "role": "protagonist/antagonist/supporting/mentioned",
    "traits": ["trait1", "trait2"],
    "motivations": ["motivation1"],
    "context": "quote or context from text",
    "is_protagonist": false,
    "mentions": 3
  }]
}

Count actual name/pronoun references in the text below for the 'mentions' field.

Language of text: {language}

Text: {text}`,
  what_if_generator: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a creative writing assistant. Generate exactly 5 creative 'what if' variations based on the text.
Schema:
{
  "original_genre": "detected genre",
  "original_protagonist": "the main person, entity, concept, or location from the original text",
  "variations": [{
    "id": 1,
    "question": "What if ...?",
    "description": "elaboration of the idea",
    "impact": "major" or "moderate" or "minor"
  }]
}

Language of text: {language}

Text: {text}`,
  world_builder: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a world-building assistant. Analyze the setting and world details in the text.
Schema:
{
  "setting": {
    "label": "setting name",
    "confidence": 0-100,
    "description": "brief description",
    "tech_level": "high_tech" or "low_tech" or "medieval" or "modern" or "none"
  },
  "geography": [{"name": "place name"}],
  "atmosphere": [{"label": "mood or atmosphere"}],
  "magic": {"power_level": "high"/"low"/"none", "systems": [{"label": "system name"}]},
  "factions": [{"name": "faction name"}],
  "world_rules": ["rule or law of this world"]
}

If the text doesn't specify a field (e.g. magic, factions), set it to a sensible default like 'none' or an empty array.

Language of text: {language}

Text: {text}`,
  voice_tuner: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a narrative voice analyst. Analyze the writing style and narrative voice of the text.
Schema:
{
  "narrative_voice": {
    "pov": {"label": "first-person"/"second-person"/"third-person"/"omniscient", "confidence": 0-100, "description": "..."},
    "tense": {"label": "past"/"present"/"future", "confidence": 0-100},
    "primary_register": "formal/informal/neutral/poetic/technical"
  },
  "pacing": {"label": "fast"/"moderate"/"slow", "description": "..."},
  "mood": [{"label": "mood word"}],
  "readability": {"level": "easy"/"moderate"/"complex", "avg_sentence_length": 15, "long_word_ratio": 20},
  "style_examples": {
    "original_style": {"sample": "representative sentence from text"},
    "alternatives": [{"style": "alternative style name", "example": "rewritten example", "note": "tip"}]
  }
}

Calculate avg_sentence_length and long_word_ratio from the actual text provided below.

Language of text: {language}

Text: {text}`,
  blurb_generator: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a blurb writer. Write 3 engaging blurb variants for a story based on the text.
Schema:
{
  "genre": "detected genre",
  "best_for": "hook" or "mystery" or "epic" or "character" or "atmospheric",
  "variants": [{
    "label": "Hook"/"Mystery"/"Epic"/"Character"/"Atmospheric",
    "blurb": "blurb text...",
    "word_count": 50,
    "length": "short"/"medium"/"long"
  }]
}

Ensure word_count is a realistic count close to the actual blurb length.

Language of text: {language}

Text: {text}`,
  plot_hole_detector: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a plot hole detector. Analyze the text for narrative inconsistencies and plot holes.
Schema:
{
  "grade": "A"/"B"/"C"/"D"/"F",
  "consistency_score": 0-100,
  "total_issues": 0,
  "by_severity": {"critical": 0, "major": 0, "minor": 0},
  "issues": [{
    "label": "short label",
    "severity": "critical"/"major"/"minor",
    "description": "explanation of the issue",
    "suggestion": "how to fix it"
  }],
  "agents_analyzed": 5
}

Set 'agents_analyzed' to a reasonable number (3-8) based on how many analytical angles you considered.

Language of text: {language}

Text: {text}`,
  series_connector: `Respond with ONLY valid JSON (no markdown, no code fences, no explanation). Code-fence-wrapped JSON is NOT valid — respond with raw JSON only. You are a connection finder for story seeds. Based on the given text, suggest potential hypothetical connections this seed COULD form with other stories in a shared narrative universe.
Schema:
{
  "total_connections": 2,
  "connections": [{
    "seed_title": "Hypothetical: Suggested story type",
    "connection_label": "shared_universe" or "thematic_saga" or "character_overlap",
    "connection_type": "shared_universe" or "thematic_saga" or "character_overlap",
    "connection_description": "explanation of how they would connect",
    "score": 75,
    "matches": [["shared_setting", ["place1"]], ["overlap", ["detail1"]]]
  }]
}

Generate 2-4 plausible hypothetical connections. Prefix seed_title with 'Hypothetical: ' to indicate these are suggested connection types, not existing seeds.

Language of text: {language}

Text: {text}`,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const agent = await prisma.agentConfig.findUnique({
    where: { agentName: params.name },
    select: { llmPrompt: true },
  });

  const defaultPrompt = DEFAULT_PROMPTS[params.name] || null;
  const customPrompt = agent?.llmPrompt || null;

  return NextResponse.json({
    prompt: customPrompt || defaultPrompt,
    isCustom: !!customPrompt,
    defaultPrompt,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const body = await req.json();
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : null;

  if (prompt !== null && prompt.length === 0) {
    return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
  }

  const agent = await prisma.agentConfig.upsert({
    where: { agentName: params.name },
    update: { llmPrompt: prompt },
    create: { agentName: params.name, llmPrompt: prompt },
  });

  return NextResponse.json({ agentName: agent.agentName, saved: true });
}
