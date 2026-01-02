"""
AI-powered research summarizer using Claude Haiku.

Transforms academic abstracts into bite-sized, actionable insights.
Uses Claude Haiku for cost efficiency (~$0.25/1M input tokens).
"""

import json
from typing import Any

from anthropic import AsyncAnthropic

from src.modules.research.models import ResearchDigest, KeyBenefit


# System prompt for the summarizer
SUMMARIZER_SYSTEM_PROMPT = """You are a health research translator for a fitness app called UGOKI.
Your job is to convert scientific abstracts into bite-sized, actionable insights for busy fitness enthusiasts.

RULES:
1. Use simple language (8th grade reading level)
2. Focus on practical benefits, not methodology
3. Be accurate - don't exaggerate findings
4. Use emojis sparingly but effectively
5. Keep each benefit point to 1-2 sentences max
6. Always relate findings to real-world application

OUTPUT FORMAT (JSON):
{
    "one_liner": "Single sentence capturing the key finding",
    "key_benefits": [
        {"emoji": "🔥", "title": "Short Title", "description": "1-2 sentence benefit"},
        {"emoji": "💪", "title": "Another Benefit", "description": "Explanation"},
        {"emoji": "🧠", "title": "Third Point", "description": "Why this matters"}
    ],
    "who_benefits": "Best for: [specific audience who would benefit most]",
    "tldr": "2-3 sentence plain English summary of the research and its implications"
}

EMOJI SUGGESTIONS:
- 🔥 Fat burning, metabolism
- 💪 Muscle, strength
- 🧠 Brain, focus, mental
- ⚡ Energy, performance
- ❤️ Heart health
- ⏰ Time, efficiency
- 😴 Sleep, recovery
- 🍽️ Eating, nutrition
- 🏃 Cardio, endurance
- 🧘 Stress, relaxation

Respond ONLY with valid JSON. No explanations or markdown."""


class ResearchSummarizer:
    """
    Summarizes research abstracts using Claude Haiku.

    Cost estimation for 20 users:
    - ~100 summaries/month
    - ~500 tokens/summary
    - Total: ~50K tokens/month
    - Cost: < $0.15/month
    """

    def __init__(self, api_key: str):
        """
        Initialize the summarizer.

        Args:
            api_key: Anthropic API key
        """
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = "claude-3-haiku-20240307"  # Fast and cheap

    async def summarize(
        self,
        title: str,
        abstract: str,
        topic_context: str | None = None,
    ) -> ResearchDigest | None:
        """
        Generate a bite-sized digest of a research paper.

        Args:
            title: Paper title
            abstract: Paper abstract
            topic_context: Optional context about the topic

        Returns:
            ResearchDigest or None if summarization fails
        """
        if not abstract or len(abstract) < 50:
            # Abstract too short to summarize meaningfully
            return self._create_fallback_digest(title)

        user_message = f"Title: {title}\n\nAbstract: {abstract}"
        if topic_context:
            user_message = f"Topic: {topic_context}\n\n{user_message}"

        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=500,
                system=SUMMARIZER_SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": user_message}
                ],
            )

            # Parse the response
            content = response.content[0].text
            return self._parse_response(content)

        except Exception as e:
            print(f"Summarization error: {e}")
            return self._create_fallback_digest(title)

    def _parse_response(self, content: str) -> ResearchDigest | None:
        """Parse Claude's JSON response into a ResearchDigest."""
        try:
            # Clean up the response (remove any markdown if present)
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()

            data = json.loads(content)

            # Parse key benefits
            key_benefits = []
            for benefit_data in data.get("key_benefits", [])[:5]:  # Max 5 benefits
                key_benefits.append(KeyBenefit(
                    emoji=benefit_data.get("emoji", "✨"),
                    title=benefit_data.get("title", "Key Finding")[:50],
                    description=benefit_data.get("description", "")[:200],
                ))

            return ResearchDigest(
                one_liner=data.get("one_liner", "Research finding")[:200],
                key_benefits=key_benefits,
                who_benefits=data.get("who_benefits", "Fitness enthusiasts")[:200],
                tldr=data.get("tldr", "")[:500],
            )

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"Parse error: {e}")
            return None

    def _create_fallback_digest(self, title: str) -> ResearchDigest:
        """Create a basic digest when AI summarization fails."""
        return ResearchDigest(
            one_liner=title[:200] if title else "Research paper",
            key_benefits=[
                KeyBenefit(
                    emoji="📄",
                    title="Research Paper",
                    description="Read the full abstract for detailed findings.",
                )
            ],
            who_benefits="Those interested in health and fitness research",
            tldr="This research paper explores health and wellness topics. View the full study for detailed findings.",
        )


class MockSummarizer:
    """
    Mock summarizer for testing and development without API calls.
    """

    async def summarize(
        self,
        title: str,
        abstract: str,
        topic_context: str | None = None,
    ) -> ResearchDigest:
        """Return a mock digest."""
        return ResearchDigest(
            one_liner=f"Key finding from: {title[:50]}...",
            key_benefits=[
                KeyBenefit(
                    emoji="🔥",
                    title="Evidence-Based",
                    description="Research supports this approach for improved outcomes.",
                ),
                KeyBenefit(
                    emoji="💪",
                    title="Practical Application",
                    description="Can be easily incorporated into daily routine.",
                ),
                KeyBenefit(
                    emoji="⏰",
                    title="Time Efficient",
                    description="Benefits observed with reasonable time investment.",
                ),
            ],
            who_benefits="Best for: People looking to optimize their health routine",
            tldr=f"This study examines {title[:100]}. The findings suggest practical benefits for health and fitness goals.",
        )
