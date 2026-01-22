"""Page handlers - render HTML pages from database data."""
from utils import render, parse_json, query_all, query_first


async def home(db):
    """Homepage with self introduction."""
    intro = await query_first(db, "SELECT * FROM portfolioapp_self_intro LIMIT 1")
    return render("home.html", self_intro=intro or {})


async def projects(db):
    """Projects listing page."""
    projects = await query_all(db, "SELECT * FROM portfolioapp_project")
    for p in projects:
        p["styling"] = parse_json(p.get("styling"))
    return render("projects.html", projects=projects, hover_css="")


async def skills(db):
    """Skills listing page with associated links."""
    skills = await query_all(db, "SELECT * FROM portfolioapp_skill")
    for s in skills:
        s["styling"] = parse_json(s.get("styling"))
        # Get links for this skill
        links = await db.prepare(
            """SELECT l.* FROM portfolioapp_link l
               JOIN portfolioapp_skill_links sl ON l.id = sl.link_id
               WHERE sl.skill_id = ?"""
        ).bind(s["id"]).all()
        s["links"] = [dict(row.to_py()) for row in links.results]
    return render("skills.html", skills=skills, hover_css="")


async def teaching(db):
    """Teaching courses page."""
    teaching = await query_all(db, "SELECT * FROM portfolioapp_teaching")
    for t in teaching:
        t["learning_outcomes"] = parse_json(t.get("learning_outcomes"))
        t["syllabus"] = parse_json(t.get("syllabus"))
        t["students_feedback"] = parse_json(t.get("students_feedback"))
    return render("teaching.html", teaching=teaching)


async def consulting(db):
    """Consulting services page."""
    consulting = await query_all(db, "SELECT * FROM portfolioapp_consultinginfo")
    for c in consulting:
        c["styling"] = parse_json(c.get("styling"))
    return render("consulting.html", consulting=consulting, hover_css="")


async def content(db):
    """Published content listing page."""
    content = await query_all(db, "SELECT * FROM portfolioapp_publishedcontent")
    return render("content.html", content=content)


async def resume(db):
    """Resume page with employment, education, certifications."""
    resume = await query_first(db, "SELECT * FROM portfolioapp_resume LIMIT 1")
    if resume:
        resume["employment_history"] = parse_json(resume.get("employment_history"))
        resume["education"] = parse_json(resume.get("education"))
        resume["certifications"] = parse_json(resume.get("certifications"))
        resume["languages"] = parse_json(resume.get("languages"))
    job_links = {"Adjunct Professor": "https://cloudteaching.oskarcode.com/"}
    edu_links = {"Master of Engineering in Cloud Computing Management": "https://gwu-course-review.mycodeforever.com/"}
    return render("resume.html", resume=resume or {}, job_links=job_links, edu_links=edu_links)


async def contact_me(db):
    """Contact information page."""
    contacts = await query_all(db, "SELECT * FROM portfolioapp_contactme")
    for c in contacts:
        c["styling"] = parse_json(c.get("styling"))
    return render("contact_me.html", contact_me=contacts, hover_css="")
