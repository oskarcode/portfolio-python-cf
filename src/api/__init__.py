"""API handlers for the portfolio REST API."""
from .read import (
    api_health, api_self_intro, api_skills, api_get_skill,
    api_projects, api_get_project, api_content, api_get_content,
    api_consulting, api_contacts, api_get_contact, api_resume, api_teaching
)
from .write import (
    api_update_self_intro, api_create_skill, api_update_skill, api_delete_skill,
    api_create_project, api_update_project, api_delete_project,
    api_create_content, api_update_content, api_delete_content,
    api_update_consulting, api_create_contact, api_update_contact, api_delete_contact,
    api_update_resume, api_update_teaching
)
from .chat import api_chat

__all__ = [
    # Read
    "api_health", "api_self_intro", "api_skills", "api_get_skill",
    "api_projects", "api_get_project", "api_content", "api_get_content",
    "api_consulting", "api_contacts", "api_get_contact", "api_resume", "api_teaching",
    # Write
    "api_update_self_intro", "api_create_skill", "api_update_skill", "api_delete_skill",
    "api_create_project", "api_update_project", "api_delete_project",
    "api_create_content", "api_update_content", "api_delete_content",
    "api_update_consulting", "api_create_contact", "api_update_contact", "api_delete_contact",
    "api_update_resume", "api_update_teaching",
    # Chat
    "api_chat"
]
