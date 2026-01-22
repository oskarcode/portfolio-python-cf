"""Chat API handler for Claude MCP integration."""
from utils import json_response
import json
from mcp.claude import chat_with_claude

async def api_chat(request, env, is_admin=False):
    """Chat endpoint - Claude handles everything via MCP tools."""
    try:
       
        
        # Parse request body
        body_text = await request.text()
        body_dict = json.loads(body_text)
        message = body_dict.get("message", "")
        history = body_dict.get("history", [])
        
        if not message:
            return json_response({"error": "Message is required"})
        
        response = await chat_with_claude(message, env, history, is_admin)
        return json_response({"response": response})
    except Exception as e:
        return json_response({"error": str(e)})
