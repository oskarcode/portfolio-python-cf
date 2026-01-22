"""Write API handlers (create, update, delete)."""
from utils import json_response, js_get


# ----- Self Intro -----
async def api_update_self_intro(db, body):
    """Update self introduction."""
    await db.prepare(
        """UPDATE portfolioapp_self_intro SET 
           summary = ?, experiences = ?, education = ?, styling = ?
           WHERE id = (SELECT id FROM portfolioapp_self_intro LIMIT 1)"""
    ).bind(
        js_get(body, "summary", ""), js_get(body, "experiences", ""), 
        js_get(body, "education", ""), ""
    ).run()
    return json_response({"success": True, "message": "Self intro updated"})


# ----- Skills -----
async def api_create_skill(db, body):
    """Create a new skill."""
    result = await db.prepare(
        "INSERT INTO portfolioapp_skill (skill, example, styling) VALUES (?, ?, ?) RETURNING id"
    ).bind(js_get(body, "skill", ""), js_get(body, "example", ""), "").first()
    new_id = dict(result.to_py())["id"] if result else None
    return json_response({"success": True, "id": new_id, "message": "Skill created"})


async def api_update_skill(db, skill_id, body):
    """Update an existing skill."""
    await db.prepare(
        "UPDATE portfolioapp_skill SET skill = ?, example = ?, styling = ? WHERE id = ?"
    ).bind(js_get(body, "skill", ""), js_get(body, "example", ""), "", skill_id).run()
    return json_response({"success": True, "message": "Skill updated"})


async def api_delete_skill(db, skill_id):
    """Delete a skill and its links."""
    await db.prepare("DELETE FROM portfolioapp_skill_links WHERE skill_id = ?").bind(skill_id).run()
    await db.prepare("DELETE FROM portfolioapp_skill WHERE id = ?").bind(skill_id).run()
    return json_response({"success": True, "message": "Skill deleted"})


# ----- Projects -----
async def api_create_project(db, body):
    """Create a new project."""
    result = await db.prepare(
        """INSERT INTO portfolioapp_project 
           (title, description, link, use_case, frontend, backend, hosting, styling) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"""
    ).bind(
        js_get(body, "title", ""), js_get(body, "description", ""), js_get(body, "link", ""),
        js_get(body, "use_case", ""), js_get(body, "frontend", ""), js_get(body, "backend", ""), 
        js_get(body, "hosting", ""), ""
    ).first()
    new_id = dict(result.to_py())["id"] if result else None
    return json_response({"success": True, "id": new_id, "message": "Project created"})


async def api_update_project(db, project_id, body):
    """Update an existing project."""
    await db.prepare(
        """UPDATE portfolioapp_project SET 
           title = ?, description = ?, link = ?, use_case = ?, 
           frontend = ?, backend = ?, hosting = ?, styling = ? WHERE id = ?"""
    ).bind(
        js_get(body, "title", ""), js_get(body, "description", ""), js_get(body, "link", ""),
        js_get(body, "use_case", ""), js_get(body, "frontend", ""), js_get(body, "backend", ""),
        js_get(body, "hosting", ""), "", project_id
    ).run()
    return json_response({"success": True, "message": "Project updated"})


async def api_delete_project(db, project_id):
    """Delete a project and its skill associations."""
    await db.prepare("DELETE FROM portfolioapp_project_skills WHERE project_id = ?").bind(project_id).run()
    await db.prepare("DELETE FROM portfolioapp_project WHERE id = ?").bind(project_id).run()
    return json_response({"success": True, "message": "Project deleted"})


# ----- Published Content -----
async def api_create_content(db, body):
    """Create new published content."""
    result = await db.prepare(
        "INSERT INTO portfolioapp_publishedcontent (platform, title, url, styling) VALUES (?, ?, ?, ?) RETURNING id"
    ).bind(js_get(body, "platform", ""), js_get(body, "title", ""), js_get(body, "url", ""), "").first()
    new_id = dict(result.to_py())["id"] if result else None
    return json_response({"success": True, "id": new_id, "message": "Content created"})


async def api_update_content(db, content_id, body):
    """Update published content."""
    await db.prepare(
        "UPDATE portfolioapp_publishedcontent SET platform = ?, title = ?, url = ?, styling = ? WHERE id = ?"
    ).bind(js_get(body, "platform", ""), js_get(body, "title", ""), js_get(body, "url", ""), "", content_id).run()
    return json_response({"success": True, "message": "Content updated"})


async def api_delete_content(db, content_id):
    """Delete published content."""
    await db.prepare("DELETE FROM portfolioapp_publishedcontent WHERE id = ?").bind(content_id).run()
    return json_response({"success": True, "message": "Content deleted"})


# ----- Consulting -----
async def api_update_consulting(db, body):
    """Update consulting information."""
    await db.prepare(
        """UPDATE portfolioapp_consultinginfo SET 
           intro = ?, consulting_services = ?, included_details = ?, 
           why_me = ?, success_criteria = ?, booking_url = ?, styling = ?
           WHERE id = (SELECT id FROM portfolioapp_consultinginfo LIMIT 1)"""
    ).bind(
        js_get(body, "intro", ""), js_get(body, "consulting_services", ""), js_get(body, "included_details", ""),
        js_get(body, "why_me", ""), js_get(body, "success_criteria", ""), js_get(body, "booking_url", ""), ""
    ).run()
    return json_response({"success": True, "message": "Consulting updated"})


# ----- Contact Me -----
async def api_create_contact(db, body):
    """Create a new contact method."""
    result = await db.prepare(
        "INSERT INTO portfolioapp_contactme (platform, url, styling) VALUES (?, ?, ?) RETURNING id"
    ).bind(js_get(body, "platform", ""), js_get(body, "url", ""), "").first()
    new_id = dict(result.to_py())["id"] if result else None
    return json_response({"success": True, "id": new_id, "message": "Contact created"})


async def api_update_contact(db, contact_id, body):
    """Update a contact method."""
    await db.prepare(
        "UPDATE portfolioapp_contactme SET platform = ?, url = ?, styling = ? WHERE id = ?"
    ).bind(js_get(body, "platform", ""), js_get(body, "url", ""), "", contact_id).run()
    return json_response({"success": True, "message": "Contact updated"})


async def api_delete_contact(db, contact_id):
    """Delete a contact method."""
    await db.prepare("DELETE FROM portfolioapp_contactme WHERE id = ?").bind(contact_id).run()
    return json_response({"success": True, "message": "Contact deleted"})


# ----- Resume -----
async def api_update_resume(db, body):
    """Update resume information."""
    await db.prepare(
        """UPDATE portfolioapp_resume SET 
           summary = ?, employment_history = ?, education = ?, 
           certifications = ?, my_skills = ?, languages = ?, styling = ?
           WHERE id = (SELECT id FROM portfolioapp_resume LIMIT 1)"""
    ).bind(
        js_get(body, "summary", ""), js_get(body, "employment_history", ""), js_get(body, "education", ""),
        js_get(body, "certifications", ""), js_get(body, "my_skills", ""), js_get(body, "languages", ""), ""
    ).run()
    return json_response({"success": True, "message": "Resume updated"})


# ----- Teaching -----
async def api_update_teaching(db, body):
    """Update teaching information."""
    await db.prepare(
        """UPDATE portfolioapp_teaching SET 
           title = ?, course_overview = ?, teaching_school = ?,
           learning_outcomes = ?, syllabus = ?, hands_on_projects = ?, 
           students_feedback = ?, styling = ?
           WHERE id = (SELECT id FROM portfolioapp_teaching LIMIT 1)"""
    ).bind(
        js_get(body, "title", ""), js_get(body, "course_overview", ""), js_get(body, "teaching_school", ""),
        js_get(body, "learning_outcomes", ""), js_get(body, "syllabus", ""), js_get(body, "hands_on_projects", ""),
        js_get(body, "students_feedback", ""), ""
    ).run()
    return json_response({"success": True, "message": "Teaching updated"})
