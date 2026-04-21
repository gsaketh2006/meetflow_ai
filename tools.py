import spacy
import dateparser.search
import re
from typing import List, Dict, Optional
from utils import get_logger

logger = get_logger(__name__)

# Attempt to load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    logger.warning("spaCy model 'en_core_web_sm' not found.")
    nlp = None

def extract_tasks(text: str) -> List[str]:
    logger.info("Executing extract_tasks tool")
    tasks = []
    keywords = ["need to", "must", "action item", "todo", "should", "tasked with", "assigned to"]
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line: continue
        if any(kw in line.lower() for kw in keywords) or line.startswith(('-', '*', '1.')):
            tasks.append(line)
    return tasks if tasks else ["No explicit tasks found via keyword matching."]

def identify_deadlines(text: str) -> List[Dict[str, str]]:
    logger.info("Executing identify_deadlines tool")
    dates = dateparser.search.search_dates(text, settings={'PREFER_DATES_FROM': 'future'})
    results = []
    if dates:
        for original_text, parsed_date in dates:
            results.append({
                "raw_text": original_text,
                "parsed_date": parsed_date.strftime("%Y-%m-%d %H:%M")
            })
    return results

def extract_assignees(text: str) -> List[str]:
    logger.info("Executing extract_assignees tool")
    if not nlp: return ["NLP model not loaded."]
    doc = nlp(text)
    names = set()
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            names.add(ent.text)
    return list(names)

def detect_priority(text: str) -> str:
    logger.info("Executing detect_priority tool")
    high_priority = ["urgent", "asap", "immediate", "critical", "blocking"]
    medium_priority = ["soon", "important", "next week", "planned"]
    text_lower = text.lower()
    if any(hp in text_lower for hp in high_priority):
        return "High"
    elif any(mp in text_lower for mp in medium_priority):
        return "Medium"
    else:
        return "Low"
