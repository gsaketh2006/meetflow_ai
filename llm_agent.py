import os
import json
import re
from groq import Groq
from typing import Dict, Any
from utils import get_logger

logger = get_logger(__name__)


class MeetFlowAgent:
    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        if not os.getenv("GROQ_API_KEY"):
            raise ValueError("GROQ_API_KEY is not set.")
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = model

    def process_notes(self, notes: str) -> Dict[str, Any]:
        logger.info("Starting processing via direct JSON prompt")

        system_prompt = """You are an expert senior project manager AI. Your job is to analyze meeting notes and extract a structured action plan with extreme precision.

You MUST respond ONLY with a valid JSON object. No markdown, no explanation, just raw JSON.

The JSON must follow this exact structure:
{
  "tasks": [
    {
      "task": "Explicit action item",
      "assignee": "Person responsible (or 'Team' if unclear)",
      "deadline": "Specific date or timeframe (e.g. 'Wednesday', 'April 26', 'Next Week'). Use 'No deadline' only if truly absent.",
      "priority": "High" | "Medium" | "Low",
      "ai_confidence_refinement": 0.0 to 0.1
    }
  ]
}

Extraction Guidelines:
1. Deadlines: Look for phrases like "by [Day]", "due [Date]", "at the latest", "deadline is", "sooner than".
2. Priorities: 
   - High: Use for words like "CRITICAL", "URGENT", "BLOCKING", "ASAP", "IMMEDIATE".
   - Medium: Use for "IMPORTANT", "NEEDS TO", "SOON", "PLANNED".
   - Low: Use for "NICE TO HAVE", "SOMETIME", "IDEALLY".
3. Confidence Refinement (ai_confidence_refinement):
   - 0.1: Task is explicit ("X must do Y by Z").
   - 0.05: Task is implicit or missing one key entity.
   - 0.0: Task is vague or speculative.

Extract EVERY identifiable action item. Be professional and concise."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze these notes and generate the action plan. Pay close attention to deadlines and high-priority keywords:\n\n{notes}"}
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2048
            )

            content = response.choices[0].message.content
            logger.info("Received response from Groq API")

            # Robust JSON extraction
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                content = match.group(0)

            result = json.loads(content)

            # Normalize priority casing
            for task in result.get("tasks", []):
                task["priority"] = task.get("priority", "Low").capitalize()

            logger.info(f"Successfully extracted {len(result.get('tasks', []))} tasks")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            return {"tasks": [], "error": "Failed to parse AI response."}
        except Exception as e:
            logger.error(f"Groq API error: {str(e)}")
            raise
