"""A two-agent research pipeline: one agent gathers, one agent writes."""

from .config import Settings
from .llm import LLM

__all__ = ["Settings", "LLM"]
__version__ = "0.1.0"
