"""Web search tools for UGOKI AI Coach."""

import logging
from httpx import AsyncClient

logger = logging.getLogger(__name__)


async def perform_brave_search(
    query: str,
    http_client: AsyncClient,
    brave_api_key: str,
) -> str:
    """
    Search the web using Brave Search API.

    Args:
        query: The search query
        http_client: Async HTTP client
        brave_api_key: Brave Search API key

    Returns:
        Formatted search results
    """
    headers = {
        "X-Subscription-Token": brave_api_key,
        "Accept": "application/json",
    }

    try:
        response = await http_client.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={
                "q": query,
                "count": 5,
                "text_decorations": True,
                "search_lang": "en",
            },
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        web_results = data.get("web", {}).get("results", [])

        for item in web_results[:5]:
            title = item.get("title", "")
            description = item.get("description", "")
            url = item.get("url", "")
            if title and description:
                results.append(f"**{title}**\n{description}\nSource: {url}\n")

        return "\n".join(results) if results else "No results found for the query."

    except Exception as e:
        logger.error(f"Brave search error: {e}")
        return f"Search error: {str(e)}"


async def perform_web_search(
    query: str,
    http_client: AsyncClient,
    brave_api_key: str | None = None,
) -> str:
    """
    Search the web for fitness, nutrition, and wellness information.

    Currently supports Brave Search. Falls back to informative message
    if no API key is configured.

    Args:
        query: The search query
        http_client: Async HTTP client
        brave_api_key: Optional Brave Search API key

    Returns:
        Formatted search results or fallback message
    """
    # Enhance query for wellness context
    wellness_query = f"{query} fitness nutrition wellness health"

    if brave_api_key:
        logger.info(f"Performing Brave web search: {query[:50]}...")
        return await perform_brave_search(wellness_query, http_client, brave_api_key)

    # No search provider configured
    logger.warning("No web search API configured")
    return (
        "Web search is not currently available. "
        "I'll provide guidance based on my training data. "
        "For the most up-to-date information, please consult reputable health and fitness sources."
    )
