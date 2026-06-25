import re
import random
from app.database import execute
from agents.story.base import BaseStoryAgent


ARCHETYPES = {
    "hero": {"traits": ["brave", "determined", "compassionate"], "description": "The central figure who drives the story forward"},
    "mentor": {"traits": ["wise", "patient", "mysterious"], "description": "Guides and teaches the hero"},
    "shadow": {"traits": ["cunning", "powerful", "conflicted"], "description": "The antagonist or dark mirror of the hero"},
    "herald": {"traits": ["charismatic", "persuasive", "visionary"], "description": "Announces change and issues challenges"},
    "trickster": {"traits": ["clever", "unpredictable", "chaotic"], "description": "Disrupts the status quo with wit"},
    "guardian": {"traits": ["loyal", "protective", "stern"], "description": "Tests the hero before allowing passage"},
    "ally": {"traits": ["supportive", "loyal", "courageous"], "description": "Companion who aids the hero"},
    "threshold": {"traits": ["neutral", "ambiguous", "testing"], "description": "Guards the entrance to new worlds"},
}

ROLES = ["protagonist", "antagonist", "deuteragonist", "tertiary"]

CHARACTER_NAMES = {
    "en": ["Alexander", "Victoria", "Sebastian", "Isabella", "Theodore", "Amara",
           "Caspian", "Seraphina", "Orion", "Lilith", "Atticus", "Rowan"],
    "es": ["Alejandro", "Valentina", "Santiago", "Isabel", "Mateo", "Camila",
           "Sebastián", "Lucía", "Diego", "Elena"],
    "fr": ["Alexandre", "Victoire", "Sebastien", "Isabelle", "Matthieu", "Camille"],
    "it": ["Alessandro", "Vittoria", "Sebastiano", "Isabella", "Matteo", "Camilla"],
}


class CharacterDeepener(BaseStoryAgent):
    name = "character_deepener"
    description = "Develops characters with archetypes, backstories, and arcs"

    def develop(self, story_id: str) -> bool:
        row = execute(
            """SELECT s.title, s.type, st.raw_text, st.language,
                      eh.data AS harvest_data, ea.data AS angle_data, eg.data AS genre_data
               FROM stories s
               LEFT JOIN seeds st ON st.id = s.seed_id
               LEFT JOIN enrichments eh ON eh.seed_id = st.id AND eh.agent_name = 'character_harvester'
               LEFT JOIN enrichments ea ON ea.seed_id = st.id AND ea.agent_name = 'angle_finder'
               LEFT JOIN enrichments eg ON eg.seed_id = st.id AND eg.agent_name = 'genre_classifier'
               WHERE s.id = %s""",
            (story_id,), fetch=True,
        )
        if not row:
            self.logger.error("Story %s not found", story_id)
            return False

        title, story_type, raw_text, language, harvest, angle, genre = row[0]
        text = raw_text or title
        self._publish_progress(story_id, "Developing characters...")

        harvest_data = harvest if harvest and isinstance(harvest, dict) else {}
        angle_data = angle if angle and isinstance(angle, dict) else {}
        genre_data = genre if genre and isinstance(genre, dict) else {}
        existing_chars = harvest_data.get("characters", [])
        protagonists = angle_data.get("protagonists", [])
        primary_genre = genre_data.get("primary_genre", "drama") if genre_data else "drama"

        chars = self._deepen_characters(existing_chars, protagonists, text, language, primary_genre)

        llm_result = self._try_llm(self._build_prompt(title, story_type, text, language, primary_genre, chars), story_id)
        if llm_result and isinstance(llm_result.get("characters"), list):
            llm_chars = llm_result["characters"]
            if len(llm_chars) >= len(chars):
                for i, lc in enumerate(llm_chars[:len(chars)]):
                    for k in ("name", "archetype", "traits", "backstory", "arc"):
                        if lc.get(k):
                            chars[i][k] = lc[k]
                self._publish_progress(story_id, "LLM refined character details")

        for c in chars:
            self._insert_character(
                story_id=story_id, name=c["name"], archetype=c["archetype"],
                role=c["role"], traits=c["traits"], backstory=c["backstory"],
                arc=c["arc"], relationships=c.get("relationships", []),
            )
            self._publish_progress(story_id, f"Character: {c['name']} ({c['role']}, {c['archetype']})")

        self._publish_progress(story_id, f"{len(chars)} characters developed")
        return True

    def _deepen_characters(self, existing: list, protagonists: list, text: str,
                           language: str, genre: str) -> list:
        chars = []
        if existing:
            for i, ec in enumerate(existing[:6]):
                name = ec.get("name", f"Character {i+1}")
                role = ec.get("role_type", "") or ec.get("role", "tertiary")
                traits = ec.get("traits", [])
                is_protagonist = ec.get("is_protagonist", False) or name in protagonists
                arch = self._assign_archetype(role, is_protagonist, i)
                chars.append({
                    "name": name,
                    "archetype": arch,
                    "role": "protagonist" if is_protagonist else (role if role in ROLES else "tertiary"),
                    "traits": traits[:5] if traits else ARCHETYPES.get(arch, {}).get("traits", ["curious"]),
                    "backstory": f"A {arch} who plays a key role in the story.",
                    "arc": self._generate_arc(arch, role, is_protagonist),
                    "relationships": [{"character_id": None, "type": "ally", "notes": "Connected to the main quest"}],
                })
        else:
            names = CHARACTER_NAMES.get(language, CHARACTER_NAMES["en"])
            seed = hash(text[:100]) if text else random.randint(1, 100)
            random.seed(seed)

            prot_name = protagonists[0] if protagonists else random.choice(names)
            chars.append({
                "name": prot_name, "archetype": "hero", "role": "protagonist",
                "traits": ["brave", "curious", "determined"],
                "backstory": f"Born into {genre} world, destined for greatness.",
                "arc": "From uncertainty to self-discovery and triumph.",
                "relationships": [],
            })

            names2 = [n for n in names if n != prot_name]
            for i in range(min(3, len(names2))):
                role = ["antagonist", "ally", "mentor"][i]
                arch = self._assign_archetype(role, False, i)
                chars.append({
                    "name": names2[i], "archetype": arch, "role": role,
                    "traits": ARCHETYPES.get(arch, {}).get("traits", ["mysterious"]),
                    "backstory": f"A {arch} figure in this {genre} tale.",
                    "arc": self._generate_arc(arch, role, False),
                    "relationships": [{"character_id": None, "type": "unknown", "notes": "Connection to protagonist pending"}],
                })
            random.seed()

        return chars

    def _build_prompt(self, title: str, story_type: str, text: str, language: str,
                       genre: str, chars: list) -> str:
        char_list = "\n".join(
            f'  {{"name": "{c["name"]}", "archetype": "{c["archetype"]}", "role": "{c["role"]}", '
            f'"traits": {c["traits"]}, "backstory": "{c["backstory"][:80]}...", "arc": "{c["arc"][:80]}..."}}'
            for c in chars
        )
        return (
            "Respond with ONLY valid JSON (no markdown, no code fences). "
            "You are a character developer. Deepen these characters with richer backstories, arcs, and traits.\n"
            f"Story: {title}\n"
            f"Type: {story_type}\n"
            f"Genre: {genre}\n"
            f"Language: {language}\n"
            f"Text: {text[:1000]}\n\n"
            f"Current characters:\n[{char_list}]\n\n"
            'Return JSON with key "characters": an array of objects with keys "name", "archetype", "role", '
            '"traits" (array), "backstory", "arc", "relationships" (array of {character_id, type, notes}). '
            "Keep the same number and order of characters."
        )

    def _assign_archetype(self, role: str, is_protagonist: bool, index: int) -> str:
        if is_protagonist or role == "protagonist":
            return "hero"
        if role == "antagonist":
            return random.choice(["shadow", "trickster"])
        if role == "mentor":
            return "mentor"
        return random.choice(["ally", "herald", "guardian", "threshold"])

    def _generate_arc(self, archetype: str, role: str, is_protagonist: bool) -> str:
        if is_protagonist:
            return "From ordinary beginnings to embracing destiny and overcoming the central conflict."
        if role == "antagonist":
            return "A descent into opposition, perhaps with a moment of clarity or redemption."
        if role == "mentor":
            return "The mentor's wisdom is tested, leading to sacrifice or renewal."
        return "Growth through companionship and shared trials."
