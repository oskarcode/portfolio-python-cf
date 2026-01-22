"""
Claude API with MCP Connector for Portfolio Chatbot
Claude connects to Portfolio MCP server and handles tool execution automatically
"""

import json
from js import fetch, Object
from pyodide.ffi import to_js


API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-20250514"
MCP_URL = "https://portfolio-mcp.oskarmansanqu.workers.dev/sse"
MCP_SERVER_NAME = "portfolio"

# READ-only tools (allowlist for public endpoint)
READ_TOOLS = [
    "health_check",
    "get_self_intro",
    "list_skills", 
    "list_projects",
    "list_published_content",
    "get_consulting",
    "list_contact_me",
    "get_resume",
    "get_teaching"
]





SYSTEM_READ_ONLY = """You are a friendly assistant for Oskar Ablimit's portfolio website.

IMPORTANT FORMATTING RULES:
1. NEVER show raw JSON data to users - always transform it into natural, readable text
2. Use conversational language, not technical output
3. Format responses with clear sections using **bold** headers
4. Use bullet points for lists
5. Keep responses concise and scannable
6. Include relevant links when available
7. Be warm and helpful in tone

AVAILABLE TOOLS:
- get_self_intro: Get Oskar's background
- list_skills: Get skills with examples
- list_projects: Get projects with descriptions
- list_published_content: Get published articles
- get_consulting: Get consulting services info
- list_contact_me: Get contact methods
- get_resume: Get resume/employment history
- get_teaching: Get teaching information

When responding, extract the key information and present it naturally. For example:
- Instead of showing JSON, summarize: "Oskar offers consulting in tech sales and solutions engineering..."
- Use friendly transitions: "Here's what I found...", "Oskar specializes in..."
- End with helpful prompts: "Would you like more details on any of these?"

Be friendly, professional, and make Oskar's portfolio information easy to understand."""

SYSTEM_ADMIN = """You are an admin assistant for Oskar Ablimit's portfolio website.
You can both READ and WRITE portfolio data.

## READ Tools
- get_self_intro, list_skills, list_projects, list_published_content
- get_consulting, list_contact_me, get_resume, get_teaching

## WRITE Tools
- update_self_intro: Update introduction
- create_skill, update_skill, delete_skill: Manage skills
- create_project, update_project, delete_project: Manage projects
- create_published_content, update_published_content, delete_published_content: Manage articles
- update_consulting: Update consulting info
- create_contact_me, update_contact_me, delete_contact_me: Manage contacts
- update_resume: Update resume
- update_teaching: Update teaching info

Help the admin manage their portfolio content. Confirm before making changes."""


def _to_py(obj):
    """Convert JS to Python"""
    return obj.to_py() if hasattr(obj, 'to_py') else obj


def _extract_text(content: list) -> str:
    """Extract only Claude's text responses, skip raw MCP tool results"""
    parts = []
    for b in content:
        b = _to_py(b)
        # Only include Claude's text responses, not tool results
        if b.get('type') == 'text':
            parts.append(b.get('text', ''))
        # Skip mcp_tool_result - we don't want raw JSON in output
    return '\n'.join(parts) or "Let me help you with that!"



async def chat_with_claude(message: str, env, history: list = None, is_admin: bool = False) -> str:
    """Send message to Claude with MCP Connector.
    
    Args:
        message: Current user message
        env: Environment with API keys
        history: Previous messages [{text: str, isUser: bool}, ...]
        is_admin: If True, use admin system prompt with write tools
    """
    try:
        api_key = str(env.ANTHROPIC_API_KEY)
        system_prompt = SYSTEM_ADMIN if is_admin else SYSTEM_READ_ONLY
        
        # Build messages array
        messages = []
        if history:
            recent_history = history[-20:] if len(history) > 20 else history
            for msg in recent_history:
                role = "user" if msg.get('isUser') else "assistant"
                text = msg.get('text', '')
                if text:
                    messages.append({"role": role, "content": text})
        
        messages.append({"role": "user", "content": message})
        messages = _fix_message_order(messages)
        
        # Build toolset config based on mode
        # Admin: all tools enabled (default)
        # Public: only READ tools via allowlist pattern
        if is_admin:
            toolset = {
                "type": "mcp_toolset",
                "mcp_server_name": MCP_SERVER_NAME
            }
        else:
            # Allowlist pattern: disable all by default, enable only READ tools
            toolset = {
                "type": "mcp_toolset",
                "mcp_server_name": MCP_SERVER_NAME,
                "default_config": {"enabled": False},
                "configs": {tool: {"enabled": True} for tool in READ_TOOLS}
            }
        
        body = {
            "model": MODEL,
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": messages,
            "mcp_servers": [{
                "type": "url",
                "url": MCP_URL,
                "name": MCP_SERVER_NAME
            }],
            "tools": [toolset]
        }
        
        response = await fetch(API_URL, Object.fromEntries(to_js([
            ["method", "POST"],
            ["headers", Object.fromEntries(to_js([
                ["x-api-key", api_key],
                ["anthropic-version", "2023-06-01"],
                ["anthropic-beta", "mcp-client-2025-11-20"],
                ["Content-Type", "application/json"]
            ]))],
            ["body", json.dumps(body)]
        ])))
        
        result = _to_py(await response.json())
        
        if 'error' in result:
            return f"Error: {result['error'].get('message', 'Unknown')}"
        
        return _extract_text(result.get('content', []))
    except Exception as e:
        return f"Error: {e}"


def _fix_message_order(messages: list) -> list:
    """Ensure messages alternate user/assistant (Claude requirement)."""
    if not messages:
        return [{"role": "user", "content": "Hello"}]
    
    fixed = []
    last_role = None
    
    for msg in messages:
        role = msg.get('role')
        if role == last_role:
            if role == 'user':
                fixed[-1]['content'] += '\n' + msg['content']
            continue
        fixed.append(msg)
        last_role = role
    
    if fixed and fixed[0].get('role') != 'user':
        fixed = fixed[1:]
    if fixed and fixed[-1].get('role') != 'user':
        fixed = fixed[:-1]
    
    return fixed if fixed else [{"role": "user", "content": "Hello"}]
