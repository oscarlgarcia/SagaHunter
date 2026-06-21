"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type ViewMode = "heuristic" | "ai" | "hybrid";

export interface Enrichment {
  id: string;
  agentName: string;
  data: any;
  llmData: any | null;
  llmGeneratedAt: string | null;
  createdAt: string;
}

export default function EnrichmentContent({ agentName, data }: { agentName: string; data: any }) {
  const te = useTranslations("seed.enrichment");
  if (typeof data === "string") {
    return <p className="text-sm text-gray-600 whitespace-pre-wrap">{data}</p>;
  }

  if (agentName === "genre_classifier" && data.genre_scores) {
    const genres = Object.entries(data.genre_scores) as [string, { score: number; matches: number }][];
    const sorted = genres.sort(([, a], [, b]) => b.score - a.score);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {sorted.slice(0, 5).map(([genre, scores]) => (
            <span key={genre} className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              scores.score >= 50 ? "bg-saga-100 text-saga-700" :
              scores.score >= 20 ? "bg-blue-50 text-blue-600" :
              "bg-gray-100 text-gray-500"
            )}>
              {genre}
              <span className="opacity-60">{scores.score}%</span>
            </span>
          ))}
        </div>
        {data.primary_genre && (
          <p className="text-xs text-gray-400">
            Primary: <span className="font-medium text-gray-600 capitalize">{data.primary_genre}</span>
            {data.secondary_genre && <> · Secondary: <span className="font-medium text-gray-600 capitalize">{data.secondary_genre}</span></>}
          </p>
        )}
      </div>
    );
  }

  if (agentName === "story_structurer" && data.three_act_scores) {
    const acts = Object.entries(data.three_act_scores) as [string, { label: string; detected: boolean; matches: number }][];
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {acts.map(([, act]) => (
            <span key={act.label} className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              act.detected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
            )}>
              {act.detected ? "+" : "o"} {act.label}
            </span>
          ))}
        </div>
        {data.structure_name && (
          <p className="text-xs text-gray-400">
            Structure: <span className="font-medium text-gray-600">{data.structure_name}</span>
          </p>
        )}
      </div>
    );
  }

  if (agentName === "angle_finder" && data.theme_scores) {
    const themeLabels: Record<string, string> = { conflict: "Conflict", mystery: "Mystery", arc: "Arc" };
    const themeColors: Record<string, string> = { conflict: "bg-red-400", mystery: "bg-purple-400", arc: "bg-blue-400" };
    return (
      <div className="space-y-3 text-sm text-gray-600">
        {data.summary && (
          <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-gray-400 text-lg leading-none mt-0.5 shrink-0">"</span>
            <p className="text-gray-700 italic leading-relaxed">{data.summary}</p>
          </div>
        )}
        {data.protagonists?.length > 0 && (
          <p><span className="text-gray-400">Protagonists:</span> <span className="font-medium text-gray-700">{data.protagonists.join(", ")}</span></p>
        )}
        {data.conflict_type && (
          <p><span className="text-gray-400">Conflict:</span> <span className="font-medium text-gray-700 capitalize">{data.conflict_type}</span></p>
        )}
        {data.settings?.length > 0 && (
          <p><span className="text-gray-400">Setting:</span> <span className="font-medium text-gray-700">{data.settings.join(", ")}</span></p>
        )}
        {data.theme_scores && (
          <div className="flex items-center gap-3 pt-1">
            {Object.entries(data.theme_scores).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-full", themeColors[key] || "bg-gray-400")} />
                <span className="text-xs text-gray-500">{themeLabels[key] || key}</span>
                <span className="text-xs font-semibold text-gray-700">{val as number}/10</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agentName === "plot_hole_detector" && data.issues !== undefined) {
    const gradeColor = (grade: string) =>
      grade === "A" ? "text-green-600" :
      grade === "B" ? "text-blue-600" :
      grade === "C" ? "text-yellow-600" :
      grade === "D" ? "text-orange-600" : "text-red-600";
    const sevColor = (s: string) =>
      s === "critical" ? "bg-red-100 text-red-700 border-red-200" :
      s === "major" ? "bg-orange-100 text-orange-700 border-orange-200" :
      "bg-yellow-100 text-yellow-700 border-yellow-200";

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={cn("text-3xl font-bold tabular-nums", gradeColor(data.grade))}>{data.grade}</div>
            <div className="text-xs text-gray-400 mt-0.5">{te("plot_hole_detector.grade")}</div>
          </div>
          <div className="text-center">
            <div className={cn("text-2xl font-bold tabular-nums", data.consistency_score >= 70 ? "text-green-600" : "text-orange-600")}>{data.consistency_score}%</div>
            <div className="text-xs text-gray-400 mt-0.5">{te("plot_hole_detector.consistency")}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums text-gray-700">{data.total_issues}</div>
            <div className="text-xs text-gray-400 mt-0.5">{te("plot_hole_detector.issues")}</div>
          </div>
        </div>

        {data.by_severity && (data.by_severity.critical > 0 || data.by_severity.major > 0 || data.by_severity.minor > 0) && (
          <div className="flex gap-3 text-xs">
            {data.by_severity.critical > 0 && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">{data.by_severity.critical} {te("plot_hole_detector.critical")}</span>}
            {data.by_severity.major > 0 && <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">{data.by_severity.major} {te("plot_hole_detector.major")}</span>}
            {data.by_severity.minor > 0 && <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">{data.by_severity.minor} {te("plot_hole_detector.minor")}</span>}
          </div>
        )}

        {data.issues?.length > 0 && (
          <div className="space-y-2">
            {data.issues.map((issue: any, i: number) => (
              <div key={i} className={cn("rounded-lg border p-3", sevColor(issue.severity))}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase">{issue.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-white/50">{issue.severity}</span>
                </div>
                <p className="text-xs opacity-80 mb-1">{issue.description}</p>
                <p className="text-xs opacity-60 italic">{issue.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {data.issues?.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-green-700">{te("plot_hole_detector.no_issues")}</p>
            <p className="text-xs text-green-600 mt-1">{te("plot_hole_detector.consistent")}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">{te("plot_hole_detector.based_on", { count: data.agents_analyzed })}</p>
      </div>
    );
  }

  if (agentName === "series_connector" && data.connections) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          {data.total_connections > 0
            ? te("series_connector.connects_to", { count: data.total_connections })
            : te("series_connector.no_connections")}
        </p>
        {data.connections.map((conn: any, i: number) => (
          <div key={i} className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 p-4">
            <div className={cn(
              "w-2 h-full min-h-[3rem] rounded-full shrink-0 mt-0.5",
              conn.connection_type === "character_overlap" ? "bg-purple-400" :
              conn.connection_type === "shared_universe" ? "bg-blue-400" :
              conn.connection_type === "thematic_saga" ? "bg-green-400" :
              "bg-gray-400"
            )} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">{conn.seed_title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {conn.connection_label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{conn.connection_description}</p>
              <div className="flex flex-wrap gap-1.5">
                {conn.matches?.map((m: any, j: number) => (
                  <span key={j} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    {m[0]}: {m[1].join(", ")}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs font-medium text-saga-600">{conn.score} pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agentName === "blurb_generator" && data.variants) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-400">{te("blurb_generator.genre")}</span>
          <span className="text-xs font-medium text-gray-600 capitalize">{data.genre}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{te("blurb_generator.best_for")}</span>
          <span className="text-xs font-medium text-gray-600">{data.best_for}</span>
        </div>
        {data.variants.map((v: any, i: number) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-saga-600 uppercase">{v.label}</span>
              <span className="text-xs text-gray-400">{te("blurb_generator.words", { count: v.word_count })} · {v.length}</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed italic">{v.blurb}</p>
          </div>
        ))}
      </div>
    );
  }

  if (agentName === "voice_tuner" && data.narrative_voice) {
    const v = data.narrative_voice;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">{te("voice_tuner.pov")}</span>
            <span className="text-sm font-medium text-gray-800">{v.pov.label}</span>
            <span className="text-xs text-gray-400 ml-2">({v.pov.confidence}%)</span>
            <p className="text-xs text-gray-500 mt-1">{v.pov.description}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">{te("voice_tuner.tense")}</span>
            <span className="text-sm font-medium text-gray-800">{v.tense.label}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">{te("voice_tuner.register")}</span>
            <span className="text-sm font-medium text-gray-800">{v.primary_register}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">{te("voice_tuner.pacing")}</span>
            <span className="text-sm font-medium text-gray-800">{data.pacing.label}</span>
            <p className="text-xs text-gray-500 mt-1">{data.pacing.description}</p>
          </div>
        </div>

        {data.mood?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("voice_tuner.mood")}</h5>
            <div className="flex flex-wrap gap-2">
              {data.mood.map((m: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.readability && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("voice_tuner.readability")}</h5>
            <div className="flex items-center gap-3 text-sm">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                data.readability.level === "easy" ? "bg-green-100 text-green-700" :
                data.readability.level === "moderate" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                {data.readability.level}
              </span>
              <span className="text-xs text-gray-500">{data.readability.avg_sentence_length} words/sentence</span>
              <span className="text-xs text-gray-500">{data.readability.long_word_ratio}% long words</span>
            </div>
          </div>
        )}

        {data.style_examples && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("voice_tuner.style_exploration")}</h5>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-2">
              <span className="text-xs font-semibold text-blue-600 uppercase block mb-1">{te("voice_tuner.original")}</span>
              <p className="text-xs text-blue-800 italic">{data.style_examples.original_style?.sample}</p>
            </div>
            {data.style_examples.alternatives?.map((alt: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 mb-2">
                <span className="text-xs font-semibold text-saga-600 uppercase block mb-1">{te("voice_tuner.try")}: {alt.style}</span>
                <p className="text-xs text-gray-600 italic mb-1">{alt.example}</p>
                <p className="text-xs text-gray-400">{alt.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agentName === "character_harvester" && data.characters) {
    return (
      <div className="space-y-3">
        {data.characters.length === 0 && (
          <p className="text-sm text-gray-400">{te("character_harvester.no_characters")}</p>
        )}
        {data.characters.map((ch: any, i: number) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-saga-100 flex items-center justify-center text-saga-700 font-bold text-sm shrink-0">
                {ch.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800 text-sm">{ch.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {ch.role}
                  </span>
                  {ch.is_protagonist && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                      {te("character_harvester.main")}
                    </span>
                  )}
                </div>
                {ch.context && (
                  <p className="text-xs text-gray-500 mb-2 italic">"{ch.context}"</p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ch.traits?.map((trait: string, j: number) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                      {trait}
                    </span>
                  ))}
                </div>
                {ch.motivations?.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">{te("character_harvester.motivations")}</span> {ch.motivations.join(", ")}
                  </div>
                )}
                {ch.potential_arcs?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-xs font-medium text-gray-600">{te("character_harvester.potential_arcs")}</span>
                    {ch.potential_arcs.map((arc: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-saga-500">-</span>
                        <span className="font-medium text-gray-600">{arc.name}</span>
                        <span className="text-gray-400">({arc.confidence}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{ch.mentions}x</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agentName === "world_builder" && data.setting) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">{te("world_builder.setting")}</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              data.setting.confidence >= 50 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            )}>
              {data.setting.label} ({Math.round(data.setting.confidence)}%)
            </span>
          </div>
          <p className="text-sm text-gray-600">{data.setting.description}</p>
          {data.setting.tech_level && (
            <p className="text-xs text-gray-400 mt-1">{te("world_builder.tech_level")}: <span className="font-medium text-gray-600 capitalize">{data.setting.tech_level.replace("_", " ")}</span></p>
          )}
        </div>

        {data.geography?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("world_builder.geography")}</h5>
            <div className="flex flex-wrap gap-2">
              {data.geography.map((g: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.atmosphere?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("world_builder.atmosphere")}</h5>
            <div className="flex flex-wrap gap-2">
              {data.atmosphere.map((a: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.magic && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("world_builder.magic")}</h5>
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  data.magic.power_level === "high" ? "bg-indigo-200 text-indigo-800" :
                  data.magic.power_level === "low" ? "bg-indigo-100 text-indigo-600" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {data.magic.power_level === "none" ? te("world_builder.no_magic") : `${data.magic.power_level} ${te("world_builder.magic")}`}
                </span>
              </div>
              {data.magic.systems?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.magic.systems.map((s: any, i: number) => (
                    <span key={i} className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {data.factions?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("world_builder.factions")}</h5>
            <div className="space-y-1.5">
              {data.factions.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded px-3 py-1.5">
                  <span className="text-gray-400">-</span>
                  <span className="font-medium text-gray-700">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.world_rules?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">{te("world_builder.world_rules")}</h5>
            <ul className="space-y-1">
              {data.world_rules.map((rule: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-saga-500 mt-0.5 shrink-0">-</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (agentName === "what_if_generator" && data.variations) {
    const impactColor = (impact: string) =>
      impact === "major" ? "border-red-300 bg-red-50" :
      impact === "moderate" ? "border-yellow-300 bg-yellow-50" :
      "border-blue-200 bg-blue-50";
    const impactBadge = (impact: string) =>
      impact === "major" ? "bg-red-100 text-red-700" :
      impact === "moderate" ? "bg-yellow-100 text-yellow-700" :
      "bg-blue-100 text-blue-600";
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">
          {te("what_if_generator.original")}: <span className="font-medium text-gray-600 capitalize">{data.original_genre}</span>
          {data.original_protagonist && <> · {te("what_if_generator.protagonist")}: <span className="font-medium text-gray-600">{data.original_protagonist}</span></>}
        </p>
        {data.variations.map((v: any) => (
          <div key={v.id} className={cn("rounded-lg border p-4", impactColor(v.impact))}>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5 shrink-0">?</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{v.question}</p>
                <p className="text-xs text-gray-600 mt-1">{v.description}</p>
                <span className={cn("inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium", impactBadge(v.impact))}>
                  {te("what_if_generator.impact", { level: v.impact })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
