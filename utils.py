import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_logger(name: str):
    """Configures and returns a logger instance."""
    logger = logging.getLogger(name)
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, log_level))
    
    return logger

def validate_config():
    """Validates that essential configuration is present."""
    if not os.getenv("GROQ_API_KEY"):
        raise ValueError("GROQ_API_KEY is not set in environment variables.")
