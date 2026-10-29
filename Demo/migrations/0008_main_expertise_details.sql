-- Expand the main expertise section with concrete, demonstrated capabilities.
UPDATE site_sections
SET title = 'Main expertise',
    summary = 'Hands-on engineering, cybersecurity, AI, teaching, and technical sales capabilities.',
    content_json = json_set(
      content_json,
      '$.items[0].title', 'Cloud platforms',
      '$.items[0].body', 'Built full-stack, serverless agentic workflows on Cloudflare using Pi Durable, OpenCode, and LangChain, supported by Workers, Durable Objects, D1, R2, Workers AI, AI Gateway, and MCP Portal.',
      '$.items[0].tags', json('["Workers","Durable Objects","D1","R2","Workers AI","AI Gateway","MCP Portal","Pi Durable","OpenCode","LangChain"]'),
      '$.items[1].title', 'Cybersecurity',
      '$.items[1].body', 'Able to identify common application, API, and traffic-layer threats—including DDoS, SQL injection, remote code execution, API abuse, and automated AI-bot scraping—and design layered mitigations with Cloudflare application security services.',
      '$.items[1].tags', json('["DDoS","SQL injection","RCE","API abuse","Bot scraping","WAF","API Shield","Bot Management"]'),
      '$.items[2].title', 'Agentic AI',
      '$.items[2].body', 'Integrates model APIs and adjusts inference parameters to improve model quality, reliability, latency, and cost for agentic applications.',
      '$.items[2].tags', json('["Model APIs","Inference parameters","Workers AI","AI Gateway","Agents"]'),
      '$.items[6].title', 'Technical teaching',
      '$.items[6].body', 'Built a full-stack teaching platform where students can use AI safely to learn, review, and extend their knowledge. Designs technical curricula, hands-on cloud labs, workshops, and practical learning paths.',
      '$.items[6].tags', json('["Teaching platform","AI-assisted learning","Curriculum design","Cloud labs","Workshops"]'),
      '$.items[#]', json('{"id":"infrastructure","title":"Infrastructure","body":"Builds full-stack applications on AWS using compute, storage, and networking services, and designs Well-Architected foundations using AWS best practices.","tags":["AWS","Compute","Storage","Networking","Well-Architected"]}'),
      '$.items[#]', json('{"id":"networking","title":"Networking","body":"Troubleshoots foundational DNS and TCP/IP issues, protects Layer 3 traffic with Cloudflare services, and designs corporate network architectures that connect, secure, and scale.","tags":["DNS","TCP/IP","Layer 3","Cloudflare Network","Corporate networking"]}'),
      '$.items[#]', json('{"id":"agent-harness","title":"Agent harness","body":"Works with open-source harnesses including LangChain, Pi, and OpenCode; explains the purpose of each harness component; and builds basic harnesses with an agent loop, model calls, tools, memory, permissions, and guardrails.","tags":["LangChain","Pi","OpenCode","Agent loops","Tools","Memory","Guardrails"]}')
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'capabilities';
