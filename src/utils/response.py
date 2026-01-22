"""Response and parsing utilities."""
from workers import Response
import jinja2
import json

templates = jinja2.Environment(
    loader=jinja2.PackageLoader("entry", "templates"), 
    autoescape=True
)

def json_response(data, status=200):
    """Return a JSON response."""
    return Response(json.dumps(data), status=status, headers={"Content-Type": "application/json"})

def render(name, **ctx):
    """Render a Jinja2 template."""
    return Response(
        templates.get_template(name).render(**ctx), 
        headers={"Content-Type": "text/html; charset=utf-8"}
    )

def parse_json(val):
    """Parse a JSON string if valid, otherwise return original value."""
    if isinstance(val, str) and val:
        try: 
            return json.loads(val)
        except: 
            pass
    return val

def js_get(obj, key, default=""):
    """Safely get a property from a JS object or Python dict."""
    if obj is None: 
        return default
    try:
        # Try dict access first (for Python dicts from JSON)
        if isinstance(obj, dict):
            val = obj.get(key)
            return str(val) if val is not None else default
        # Then try attribute access (for JS objects)
        val = getattr(obj, key, None)
        return str(val) if val and not (hasattr(val, 'typeof') and val.typeof == 'undefined') else default
    except: 
        return default

def get_id(path, prefix):
    """Extract numeric ID from a path with given prefix."""
    if path.startswith(prefix):
        r = path[len(prefix):].strip("/")
        return int(r) if r.isdigit() else None
    return None

async def get_request_json(request):
    """Parse JSON from request body."""
    try: 
        return await request.json()
    except: 
        return None
