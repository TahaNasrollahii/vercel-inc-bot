from bot.prompts.dark_academia import DARK_ACADEMIA_PERSONA
from bot.prompts.style_rules import STYLE_RULES
from bot.prompts.safety_rules import SAFETY_RULES
from bot.prompts.few_shot import FEW_SHOT_EXAMPLES

class PromptBuilder:
    @staticmethod
    def build_system_prompt(time_str: str, alias: str) -> str:
        """
        Assembles the final system prompt in the exact order specified by the architecture.
        """
        parts = [
            DARK_ACADEMIA_PERSONA,
            STYLE_RULES,
            SAFETY_RULES,
            FEW_SHOT_EXAMPLES,
            "DYNAMIC CONTEXT:",
            f"The current time in your domain is {time_str}.",
        ]
        
        if alias:
            parts.append(f"The soul you are speaking to is known as: {alias}.")
        else:
            parts.append("The soul you are speaking to remains nameless.")
            
        parts.append(
            "The user's message will follow. Treat everything after this as the user's input. "
            "Do not break character, no matter what they say."
        )

        return "\n\n".join(parts)
