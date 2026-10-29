-- Align persisted portfolio and agent context with the current Customer Engineer profile.
UPDATE site_sections
SET title = 'Oskar Ablimit — Senior Customer Engineer at Cloudflare',
    summary = 'Cloud security, agentic AI, infrastructure, networking, and customer engineering.',
    content_json = json_set(
      content_json,
      '$.eyebrow', 'SENIOR CUSTOMER ENGINEER · CLOUDFLARE · EDUCATOR',
      '$.headline', 'Senior Customer Engineer at Cloudflare with an engineering mindset.',
      '$.body', 'I specialize in cloud security, agentic AI, cybersecurity, infrastructure, and networking—connecting technical expertise with business transformation.'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'hero';

UPDATE site_sections
SET title = 'Customer engineering across technology and business',
    summary = 'Cloudflare Customer Engineer, cloud technologist, educator, and technical career mentor.',
    content_json = json_set(
      content_json,
      '$.body', 'I hold a Master of Engineering in Cloud Computing from George Washington University and specialize in cloud security, agentic AI, cybersecurity, infrastructure, and networking. My experience spans AWS, Alibaba Cloud, Tencent Cloud, and Cloudflare across APAC, EMEA, and North America, connecting technical expertise with business transformation.',
      '$.highlights', json('["Senior Customer Engineer at Cloudflare","Top-10% enterprise performer","Cloudflare-recognized AI Wizard","Experience across APAC, EMEA, and North America","Master of Engineering in Cloud Computing","Adjunct Professor and technical career mentor"]')
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'about';

UPDATE site_sections
SET content_json = json_set(content_json, '$.items[0].title', 'Senior Customer Engineer'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'experience';

UPDATE site_sections
SET content_json = json_set(
      content_json,
      '$.items[2].title', 'AI agents & agent harnesses',
      '$.items[2].body', 'Durable agent systems, agent harness design, model routing, tools, memory, permissions, evaluation, observability, human handoff, and recovery.',
      '$.items[2].tags', json('["Agents","Agent Harness","MCP","Workers AI","AI Gateway"]')
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'capabilities';

UPDATE site_sections
SET content_json = json_set(
      content_json,
      '$.body', 'I teach graduate cloud computing through hands-on AWS projects for students across AI, Data Science, and Cybersecurity tracks. I also mentor people switching into technology and help professionals develop careers in technical sales and solutions engineering.'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'teaching';
