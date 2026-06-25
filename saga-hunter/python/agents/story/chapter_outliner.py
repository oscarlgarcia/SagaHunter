import json
from typing import Optional
from app.database import execute
from agents.story.base import BaseStoryAgent


ACT_OUTLINES = {
    "three_act": {
        "acts": [
            {"name": "Act I: Setup", "ratio": 0.25},
            {"name": "Act II: Confrontation", "ratio": 0.50},
            {"name": "Act III: Resolution", "ratio": 0.25},
        ],
        "act_themes": [
            ["introduction", "inciting incident", "establish stakes", "call to adventure"],
            ["rising action", "trials", "midpoint twist", "allies and enemies", "darkest moment"],
            ["climax", "falling action", "resolution", "new beginning"],
        ],
    },
    "hero_journey": {
        "acts": [
            {"name": "Departure", "ratio": 0.25},
            {"name": "Initiation", "ratio": 0.50},
            {"name": "Return", "ratio": 0.25},
        ],
        "act_themes": [
            ["ordinary world", "call to adventure", "refusal of the call", "meeting the mentor", "crossing the threshold"],
            ["tests allies enemies", "approach to the inmost cave", "supreme ordeal", "reward"],
            ["road back", "resurrection", "return with elixir"],
        ],
    },
    "seven_point": {
        "acts": [
            {"name": "Part 1", "ratio": 0.15},
            {"name": "Part 2", "ratio": 0.25},
            {"name": "Part 3", "ratio": 0.35},
            {"name": "Part 4", "ratio": 0.25},
        ],
        "act_themes": [
            ["hook", "protagonist introduced"],
            ["plot turn 1", "new world", "pinch point"],
            ["midpoint", "bad guys close in", "all is lost"],
            ["dark night of the soul", "break into act 3", "final battle", "return"],
        ],
    },
}


class ChapterOutliner(BaseStoryAgent):
    name = "chapter_outliner"
    description = "Creates chapter outline for the story"

    def develop(self, story_id: str) -> bool:
        row = execute(
            """SELECT type, target_chapters, narrative_structure, synopsis, title
               FROM stories WHERE id = %s""",
            (story_id,), fetch=True,
        )
        if not row:
            self.logger.error("Story %s not found", story_id)
            return False

        story_type, target_chapters, structure, synopsis, title = row[0]
        self._publish_progress(story_id, f"Outlining {target_chapters or 5} chapters...")

        chapters = self._generate_chapters(target_chapters or 5, structure or "three_act", synopsis or title)

        llm_result = self._try_llm(self._build_prompt(title, synopsis, story_type, structure, chapters), story_id)
        if llm_result and isinstance(llm_result.get("chapters"), list):
            llm_chapters = llm_result["chapters"]
            if len(llm_chapters) == len(chapters):
                for i, lc in enumerate(llm_chapters):
                    if lc.get("title"):
                        chapters[i]["title"] = lc["title"]
                    if lc.get("synopsis"):
                        chapters[i]["synopsis"] = lc["synopsis"]
                    if lc.get("scenes"):
                        chapters[i]["scenes"] = lc["scenes"]
                self._publish_progress(story_id, "LLM refined chapter titles and synopses")

        for ch in chapters:
            self._insert_chapter(
                story_id=story_id,
                chapter_number=ch["number"],
                title=ch["title"],
                synopsis=ch["synopsis"],
                word_count_target=ch["word_count"],
                scenes=ch.get("scenes"),
            )
            self._publish_progress(story_id, f"Chapter {ch['number']}: {ch['title']}")

        self._publish_progress(story_id, f"{len(chapters)} chapters outlined")
        return True

    def _build_prompt(self, title: str, synopsis: str, story_type: str, structure: str, chapters: list) -> str:
        chapter_list = "\n".join(
            f'  {{"number": {c["number"]}, "title": "{c["title"]}", "synopsis": "{c["synopsis"][:80]}..."}}'
            for c in chapters
        )
        return (
            "Respond with ONLY valid JSON (no markdown, no code fences). "
            "You are a story outliner. Improve the chapter titles and synopses to be more creative and compelling.\n"
            f"Story: {title}\n"
            f"Type: {story_type}\n"
            f"Structure: {structure}\n"
            f"Synopsis: {synopsis[:500]}\n\n"
            f"Current chapters:\n[{chapter_list}]\n\n"
            'Return JSON with key "chapters": an array of objects with keys "number", "title", "synopsis", "scenes" (array of {{scene, description}}). Keep the same number of chapters.'
        )

    def _generate_chapters(self, count: int, structure: str, synopsis: str) -> list:
        outline = ACT_OUTLINES.get(structure, ACT_OUTLINES["three_act"])
        acts = outline["acts"]
        act_themes = outline["act_themes"]

        ch_per_act = [max(1, int(count * a["ratio"])) for a in acts]
        diff = count - sum(ch_per_act)
        for i in range(abs(diff)):
            ch_per_act[i % len(ch_per_act)] += 1 if diff > 0 else -1
        ch_per_act = [max(1, c) for c in ch_per_act]

        chapters = []
        ch_num = 1
        for act_idx, (act, num_ch) in enumerate(zip(acts, ch_per_act)):
            themes = act_themes[act_idx] if act_idx < len(act_themes) else ["story development"]
            for i in range(num_ch):
                theme = themes[i % len(themes)]
                chapter = {
                    "number": ch_num,
                    "title": f"Chapter {ch_num}: {theme.replace('_', ' ').title()}",
                    "synopsis": f"{act['name']}: {theme.replace('_', ' ')}. {synopsis[:100] if synopsis else 'The story continues...'}",
                    "word_count": 1500 + (ch_num * 100),
                    "scenes": [{"scene": 1, "description": f"{theme.replace('_', ' ')}"}],
                }
                chapters.append(chapter)
                ch_num += 1

        return chapters
