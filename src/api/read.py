"""Read-only API handlers."""
from utils import json_response, parse_json, query_all, query_first
from workers import Response
import json


def api_health():
    """Health check endpoint."""
    return json_response({"status": "ok"})


async def api_self_intro(db):
    """Get self introduction."""
    intro = await query_first(db, "SELECT * FROM portfolioapp_self_intro LIMIT 1")
    return json_response(intro or {})


async def api_skills(db):
    """List all skills."""
    skills = await query_all(db, "SELECT * FROM portfolioapp_skill")
    return json_response(skills)


async def api_get_skill(db, skill_id):
    """Get a single skill by ID."""
    result = await db.prepare("SELECT * FROM portfolioapp_skill WHERE id = ?").bind(skill_id).first()
    if not result:
        return Response(json.dumps({"error": "Skill not found"}), status=404, headers={"Content-Type": "application/json"})
    return json_response(dict(result.to_py()))


async def api_projects(db):
    """List all projects."""
    projects = await query_all(db, "SELECT * FROM portfolioapp_project")
    return json_response(projects)


async def api_get_project(db, project_id):
    """Get a single project by ID."""
    result = await db.prepare("SELECT * FROM portfolioapp_project WHERE id = ?").bind(project_id).first()
    if not result:
        return Response(json.dumps({"error": "Project not found"}), status=404, headers={"Content-Type": "application/json"})
    return json_response(dict(result.to_py()))


async def api_content(db):
    """List all published content."""
    content = await query_all(db, "SELECT * FROM portfolioapp_publishedcontent")
    return json_response(content)


async def api_get_content(db, content_id):
    """Get a single content item by ID."""
    result = await db.prepare("SELECT * FROM portfolioapp_publishedcontent WHERE id = ?").bind(content_id).first()
    if not result:
        return Response(json.dumps({"error": "Content not found"}), status=404, headers={"Content-Type": "application/json"})
    return json_response(dict(result.to_py()))


async def api_consulting(db):
    """Get consulting information."""
    consulting = await query_all(db, "SELECT * FROM portfolioapp_consultinginfo")
    return json_response(consulting)


async def api_contacts(db):
    """List all contact methods."""
    contacts = await query_all(db, "SELECT * FROM portfolioapp_contactme")
    return json_response(contacts)


async def api_get_contact(db, contact_id):
    """Get a single contact by ID."""
    result = await db.prepare("SELECT * FROM portfolioapp_contactme WHERE id = ?").bind(contact_id).first()
    if not result:
        return Response(json.dumps({"error": "Contact not found"}), status=404, headers={"Content-Type": "application/json"})
    return json_response(dict(result.to_py()))


async def api_resume(db):
    """Get resume data with parsed JSON fields."""
    resume = await query_first(db, "SELECT * FROM portfolioapp_resume LIMIT 1")
    if resume:
        resume["employment_history"] = parse_json(resume.get("employment_history"))
        resume["education"] = parse_json(resume.get("education"))
        resume["certifications"] = parse_json(resume.get("certifications"))
        resume["languages"] = parse_json(resume.get("languages"))
    return json_response(resume or {})


async def api_teaching(db):
    """Get teaching data with parsed JSON fields."""
    teaching = await query_all(db, "SELECT * FROM portfolioapp_teaching")
    for t in teaching:
        t["learning_outcomes"] = parse_json(t.get("learning_outcomes"))
        t["syllabus"] = parse_json(t.get("syllabus"))
        t["students_feedback"] = parse_json(t.get("students_feedback"))
    return json_response(teaching)



