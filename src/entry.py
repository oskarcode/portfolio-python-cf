"""
Portfolio Website - Python Workers + Jinja2 + D1
Main entry point with routing only - handlers in separate modules.
"""
from workers import WorkerEntrypoint, Response

# Import utilities
from utils import render, get_id, get_request_json

# Import page handlers
from pages import (
    home, projects, skills, teaching, consulting, 
    content, resume, contact_me
)

# Import API handlers
from api import (
    api_health, api_self_intro, api_skills, api_get_skill,
    api_projects, api_get_project, api_content, api_get_content,
    api_consulting, api_contacts, api_get_contact, api_resume, api_teaching,
    api_update_self_intro, api_create_skill, api_update_skill, api_delete_skill,
    api_create_project, api_update_project, api_delete_project,
    api_create_content, api_update_content, api_delete_content,
    api_update_consulting, api_create_contact, api_update_contact, api_delete_contact,
    api_update_resume, api_update_teaching, api_chat
)


class Default(WorkerEntrypoint):
    """Main Worker entrypoint - routes requests to appropriate handlers."""
    
    async def on_fetch(self, request):
        # Parse path
        url = request.url
        path = url.split("?")[0].rstrip("/")
        if path.startswith("http"):
            path = "/" + "/".join(path.split("/")[3:])
        path = path or "/"
        
        db = self.env.DB
        method = request.method
        
        # =====================================================================
        # Page Routes (GET only)
        # =====================================================================
        if method == "GET":
            # Static pages (no async needed)
            if path == "/chat":
                return render("chat.html", is_admin=False)
            if path == "/admin-chat":
                return render("chat.html", is_admin=True)
            
            # Teaching feedback redirects (shareable URLs for LinkedIn)
            if path.startswith("/teaching/feedback/"):
                feedback_urls = {
                    "/teaching/feedback/1": "https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140",  # Spring 2025
                    "/teaching/feedback/2": "https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140",  # Summer 2025
                    "/teaching/feedback/3": "https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140",  # Fall 2025
                }
                if path in feedback_urls:
                    return Response(None, status=302, headers={"Location": feedback_urls[path]})
            
            # Dynamic pages (async - fetch from DB)
            routes = {
                "/": lambda: home(db),
                "": lambda: home(db),
                "/projects": lambda: projects(db),
                "/skills": lambda: skills(db),
                "/teaching": lambda: teaching(db),
                "/consulting": lambda: consulting(db),
                "/content": lambda: content(db),
                "/resume": lambda: resume(db),
                "/contact-me": lambda: contact_me(db),
            }
            if path in routes:
                return await routes[path]()
        
        # =====================================================================
        # Chat API Routes
        # =====================================================================
        if path == "/api/chat" and method == "POST":
            return await api_chat(request, self.env, is_admin=False)
        if path == "/api/admin-chat" and method == "POST":
            return await api_chat(request, self.env, is_admin=True)
        
        # =====================================================================
        # REST API Routes
        # =====================================================================
        
        # Health check
        if method == "GET" and path == "/api/health":
            return api_health()
        
        # Self Intro
        if path == "/api/self-intro":
            if method == "GET":
                return await api_self_intro(db)
            if method == "PUT":
                return await api_update_self_intro(db, await get_request_json(request))
        
        # Skills
        if path == "/api/skills":
            if method == "GET":
                return await api_skills(db)
            if method == "POST":
                return await api_create_skill(db, await get_request_json(request))
        
        skill_id = get_id(path, "/api/skills/")
        if skill_id:
            if method == "GET":
                return await api_get_skill(db, skill_id)
            if method == "PUT":
                return await api_update_skill(db, skill_id, await get_request_json(request))
            if method == "DELETE":
                return await api_delete_skill(db, skill_id)
        
        # Projects
        if path == "/api/projects":
            if method == "GET":
                return await api_projects(db)
            if method == "POST":
                return await api_create_project(db, await get_request_json(request))
        
        project_id = get_id(path, "/api/projects/")
        if project_id:
            if method == "GET":
                return await api_get_project(db, project_id)
            if method == "PUT":
                return await api_update_project(db, project_id, await get_request_json(request))
            if method == "DELETE":
                return await api_delete_project(db, project_id)
        
        # Published Content
        if path == "/api/published-content":
            if method == "GET":
                return await api_content(db)
            if method == "POST":
                return await api_create_content(db, await get_request_json(request))
        
        content_id = get_id(path, "/api/published-content/")
        if content_id:
            if method == "GET":
                return await api_get_content(db, content_id)
            if method == "PUT":
                return await api_update_content(db, content_id, await get_request_json(request))
            if method == "DELETE":
                return await api_delete_content(db, content_id)
        
        # Consulting
        if path == "/api/consulting":
            if method == "GET":
                return await api_consulting(db)
            if method == "PUT":
                return await api_update_consulting(db, await get_request_json(request))
        
        # Contact Me
        if path == "/api/contact-me":
            if method == "GET":
                return await api_contacts(db)
            if method == "POST":
                return await api_create_contact(db, await get_request_json(request))
        
        contact_id = get_id(path, "/api/contact-me/")
        if contact_id:
            if method == "GET":
                return await api_get_contact(db, contact_id)
            if method == "PUT":
                return await api_update_contact(db, contact_id, await get_request_json(request))
            if method == "DELETE":
                return await api_delete_contact(db, contact_id)
        
        # Resume
        if path == "/api/resume":
            if method == "GET":
                return await api_resume(db)
            if method == "PUT":
                return await api_update_resume(db, await get_request_json(request))
        
        # Teaching
        if path == "/api/teaching":
            if method == "GET":
                return await api_teaching(db)
            if method == "PUT":
                return await api_update_teaching(db, await get_request_json(request))
        
        return Response("Not Found", status=404)
