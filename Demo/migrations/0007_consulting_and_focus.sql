-- Add consulting content, broaden focus areas, and keep profile education concise.
UPDATE site_sections
SET content_json = json_remove(content_json, '$.education[1]'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'credentials'
  AND json_extract(content_json, '$.education[1].title') LIKE 'Bachelor%';

UPDATE site_sections
SET content_json = json_insert(
      content_json,
      '$.items[#]', json('{"id":"technical-teaching","title":"Technical teaching","body":"Graduate teaching, hands-on cloud labs, technical workshops, curriculum development, and practical mentorship that turn complex systems into usable understanding.","tags":["Graduate teaching","AWS labs","Workshops","Curriculum design"]}'),
      '$.items[#]', json('{"id":"b2b-technical-sales","title":"B2B technical sales","body":"Technical discovery, value translation, demonstrations, enterprise sales strategy, and cross-cultural customer engagement across APAC, EMEA, and North America.","tags":["Discovery","Solutions engineering","Enterprise sales","Global markets"]}')
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'capabilities';

INSERT INTO site_sections (id, type, title, slug, summary, content_json, sort_order, status)
VALUES (
  'consulting',
  'consulting',
  'Consulting services',
  'consulting',
  'Practical guidance for technical careers, solutions engineering, B2B sales, technical education, and international expansion.',
  '{"intro":"Accelerate your technical career or business expansion with guidance grounded in 9+ years across sales, solutions engineering, global cloud platforms, and graduate teaching.","services":[{"title":"Tech sales career development","body":"Strategic roadmaps for moving from BDR to Account Executive, personalized technical-sales development plans, sales methodology coaching, and quota-attainment strategy."},{"title":"Solutions engineering career transitions","body":"AE or BDR to Sales Engineer transition planning, interview preparation, technical presentation coaching, discovery frameworks, and customer education methods."},{"title":"Global business expansion","body":"North America market-entry strategy for B2B technology companies, international sales methodology, and cross-cultural adaptation frameworks."},{"title":"Technical education and training","body":"Cloud computing and cybersecurity curriculum development plus corporate training for technical sales and engineering teams."}],"packages":[{"title":"Individual coaching","summary":"$100 / hour","body":"Personalized one-to-one sessions focused on the next concrete step in your career or customer-facing technical work.","tags":["Actionable strategies and frameworks","Customized career roadmap","Ongoing support between sessions"]},{"title":"Enterprise solutions","summary":"Custom proposal","body":"Consulting and training packages tailored to your organization, market, team, and desired outcomes.","tags":["Organization-specific scope","Detailed proposal and quote"]}],"payments":["Zelle — US clients","Venmo — US clients","WeChat Pay — international clients","Wire transfer — enterprise"],"reasons":[{"title":"Career progression","body":"9+ years progressing through BDR, account management, enterprise sales, and senior customer engineering, with consistent top-10% performance."},{"title":"Academic and technical credentials","body":"Master of Engineering in Cloud Computing, Cloudflare ASE and ACE credentials, AWS Solutions Architect Professional, and active graduate-level teaching at Yeshiva University."},{"title":"International experience","body":"Customer and business experience across Beijing, Paris, and New York, spanning APAC, EMEA, and North America in English, Mandarin, French, and Uyghur."}],"bookingUrl":"https://calendar.google.com/calendar/appointments/schedules/AcZssZ1xHKYdvcfsUs7Oj4wKIW8UOZmpNdOAyNYtDq0vI_WNlV_m_vuKA7QkDmlNYhgmXGHueVxGDPgw?gv=true"}',
  75,
  'published'
)
ON CONFLICT(id) DO UPDATE SET
  type = excluded.type,
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  content_json = excluded.content_json,
  sort_order = excluded.sort_order,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;
