from abc import ABC, abstractmethod
from typing import Any

class AIProvider(ABC):
    """Abstract base class for all AI model providers."""

    @abstractmethod
    async def generate_response(self, prompt: str, history: list[dict], **kwargs) -> str:
        """
        Generate a response given a system prompt and conversation history.
        
        :param prompt: The assembled system prompt (persona, rules, context).
        :param history: List of messages [{"role": "user"|"assistant"|"system", "content": "..."}]
        :param kwargs: Provider-specific options (temperature, max_tokens, etc.)
        :return: The generated string response.
        """
        pass
