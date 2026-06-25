import re
import random
from app.database import execute
from agents.story.base import BaseStoryAgent


SETTING_NAMES = {
    "city": ["The Old Quarter", "Crystal Square", "Shadow Market", "The Spire", "Iron District"],
    "forest": ["The Whispering Woods", "Darkwood Forest", "Emerald Grove", "The Forgotten Wilds"],
    "mountain": ["The Peaks of Eternity", "Dragon's Tooth", "Mount Despair", "The High Pass"],
    "water": ["The Serpent River", "Lake of Tears", "The Silver Strait", "Abyssal Trench"],
    "ruins": ["The Sunken Temple", "Ruins of Aldorath", "The Lost Citadel", "Ancient Catacombs"],
    "village": ["Millbrook", "Haven's Rest", "Stonewall", "Riverside", "Oakvale"],
    "castle": ["Ironhold Castle", "Crystal Palace", "The Obsidian Fortress", "Highkeep"],
    "desert": ["The Endless Dunes", "Scorched Wastes", "Oasis of Whispers", "Salt Flats"],
}


class LocationBuilder(BaseStoryAgent):
    name = "location_builder"
    description = "Builds story locations with narrative significance"

    def develop(self, story_id: str) -> bool:
        row = execute(
            """SELECT s.title, s.type, s.target_chapters, st.raw_text, st.language,
                      ew.data AS world_data, ea.data AS angle_data
               FROM stories s
               LEFT JOIN seeds st ON st.id = s.seed_id
               LEFT JOIN enrichments ew ON ew.seed_id = st.id AND ew.agent_name = 'world_builder'
               LEFT JOIN enrichments ea ON ea.seed_id = st.id AND ea.agent_name = 'angle_finder'
               WHERE s.id = %s""",
            (story_id,), fetch=True,
        )
        if not row:
            self.logger.error("Story %s not found", story_id)
            return False

        title, story_type, target_chapters, raw_text, language, world_data, angle_data = row[0]
        text = raw_text or title
        self._publish_progress(story_id, "Building locations...")

        world = world_data if world_data and isinstance(world_data, dict) else {}
        angle = angle_data if angle_data and isinstance(angle_data, dict) else {}
        geography = world.get("geography", [])
        settings = angle.get("settings", [])

        locations = self._build_locations(geography, settings, text, target_chapters or 5, language)

        llm_result = self._try_llm(self._build_prompt(title, story_type, text, language, locations), story_id)
        if llm_result and isinstance(llm_result.get("locations"), list):
            llm_locs = llm_result["locations"]
            if len(llm_locs) >= len(locations):
                for i, ll in enumerate(llm_locs[:len(locations)]):
                    for k in ("name", "description", "significance"):
                        if ll.get(k):
                            locations[i][k] = ll[k]
                self._publish_progress(story_id, "LLM refined location details")

        for loc in locations:
            self._insert_location(
                story_id=story_id, name=loc["name"], type_=loc["type"],
                description=loc["description"], significance=loc["significance"],
                chapters_featured=loc.get("chapters_featured", [1]),
            )
            self._publish_progress(story_id, f"Location: {loc['name']} ({loc['type']})")

        self._publish_progress(story_id, f"{len(locations)} locations built")
        return True

    def _build_prompt(self, title: str, story_type: str, text: str, language: str, locations: list) -> str:
        loc_list = "\n".join(
            f'  {{"name": "{loc["name"]}", "type": "{loc["type"]}", '
            f'"description": "{loc["description"][:80]}...", "significance": "{loc["significance"][:80]}..."}}'
            for loc in locations
        )
        return (
            "Respond with ONLY valid JSON (no markdown, no code fences). "
            "You are a world builder. Enhance these locations with vivid descriptions and deeper narrative significance.\n"
            f"Story: {title}\n"
            f"Type: {story_type}\n"
            f"Language: {language}\n"
            f"Text: {text[:1000]}\n\n"
            f"Current locations:\n[{loc_list}]\n\n"
            'Return JSON with key "locations": an array of objects with keys "name", "type", '
            '"description", "significance", "chapters_featured" (array). '
            "Keep the same number and order of locations."
        )

    def _build_locations(self, geography: list, settings: list, text: str,
                        target_chapters: int, language: str) -> list:
        locations = []
        used_names = set()
        types_used = []
        seed = hash(text[:200]) if text else random.randint(1, 100)
        random.seed(seed)

        geo_types = [g.get("type", "forest") if isinstance(g, dict) else "forest" for g in geography[:3]]
        setting_types = [s.lower() for s in settings[:2]]
        preferred = list(dict.fromkeys(geo_types + setting_types))[:4]

        for pt in preferred:
            if pt in SETTING_NAMES and pt not in types_used:
                types_used.append(pt)

        if not types_used:
            types_used = ["village", "forest", "castle", "ruins"]

        for i, t in enumerate(types_used):
            names = SETTING_NAMES.get(t, ["Unknown Place"])
            available = [n for n in names if n not in used_names]
            if not available:
                available = names
            name = available[0]
            used_names.add(name)

            chs = list(range(i + 1, target_chapters + 1, len(types_used)))

            significance_templates = {
                "village": "Where the protagonist's journey begins",
                "forest": "A place of mystery and hidden dangers",
                "castle": "Center of power and political intrigue",
                "ruins": "Holds ancient secrets crucial to the plot",
                "city": "Hub of culture, commerce, and conflict",
                "mountain": "The final challenge before the climax",
                "desert": "A harsh landscape that tests resolve",
                "water": "A boundary between worlds or states of being",
            }

            locations.append({
                "name": name,
                "type": t,
                "description": f"A {t} location that plays a pivotal role in the story.",
                "significance": significance_templates.get(t, "A key location in the narrative"),
                "chapters_featured": chs[:max(1, target_chapters // len(types_used))],
            })

        random.seed()
        return locations
