-- Portfolio Seed Data (from live site scraping)
-- Run: wrangler d1 execute portfolio-django-db --file=seed_data.sql

-- ===========================================
-- SELF INTRO
-- ===========================================
INSERT INTO portfolioapp_self_intro (id, summary, experiences, education, styling) VALUES (
    1,
    'Senior Sales Engineer & Cloud Computing Leader - Accomplished Senior Sales Engineer with 9+ years driving enterprise cloud transformation across Fortune 500 platforms including AWS, Cloudflare, Tencent, and Alibaba Cloud. Proven success exceeding $1M+ annual quotas while building strategic C-suite partnerships. Expert in solution architecture, technical demonstrations, and translating complex technical capabilities into measurable business outcomes, with deep specialization in cloud security, AI/ML platforms, and cybersecurity architecture.',
    NULL,
    NULL,
    NULL
);

-- ===========================================
-- SKILLS
-- ===========================================
INSERT INTO portfolioapp_skills (id, skill, example, styling) VALUES
(1, '📊 Data Science with Pandas', 'Data analysis and processing using Python pandas for business intelligence and technical content creation. Experience working with large datasets, data visualization, and analytics for customer insights and technical decision-making.', NULL),
(2, '🔐 Security & Zero Trust Consulting', 'Specialized in application security, network security, and Zero Trust architecture consulting for enterprise clients. Experience implementing Cloudflare''s security solutions including DDoS protection, Web Application Firewalls (WAF), and Zero Trust network access.', NULL),
(3, '☁️ Cloud Solution Consulting', 'Cloudflare Pitch Certified professional with deep expertise in cloud infrastructure consulting across AWS, Alibaba Cloud, Tencent Cloud, and Cloudflare platforms. Solutions architect for 100+ enterprise and startup customers.', NULL),
(4, '🐍 API & Backend Development with Python', 'Expert in building API integrations and backend development using Python, Django, and Django REST Framework. Developed multiple web applications including chatbots with OpenAI API, MCP servers for AI integration.', NULL),
(5, '💼 Enterprise Tech Sales', 'Enterprise Account Manager at Cloudflare achieving top 10% performance for two consecutive years. Proven track record of $1M+ quota achievement across Fortune 500 tech firms.', NULL),
(6, '☁️ Cloud Computing & Tech Teaching', 'Adjunct Professor at Yeshiva University teaching comprehensive cloud computing courses with hands-on AWS projects to graduate students in AI, Data Science, and Cybersecurity tracks.', NULL),
(7, '🤖 AI & MCP Server Development', 'Specialized in creating Model Context Protocol (MCP) servers for AI integration and automation. Developed custom MCP servers for Canvas LMS integration, portfolio management systems, and educational platforms.', NULL),
(8, '🐍⚡ Python & JavaScript Development', 'Full-stack development expertise combining Python for robust backend systems with JavaScript for dynamic frontend experiences. Proficient in Django REST API development.', NULL),
(9, '🎯 Technical Sales Engineering', 'Expert in delivering compelling technical demonstrations and proof-of-concept projects. Building bridges between complex technical products and business outcomes.', NULL);

-- ===========================================
-- LINKS FOR SKILLS
-- ===========================================
INSERT INTO portfolioapp_link (id, url, link_name, styling) VALUES
(1, 'https://github.com/oskarcode/coinml', 'CoinML Dataset - GitHub', NULL),
(2, 'https://medium.com/me/stories/public', 'Medium Security Articles', NULL),
(3, 'https://github.com/oskarcode/gwu-course-review', 'GWU Course Review - GitHub', NULL),
(4, 'https://github.com/oskarcode/answermeopenai', 'OpenAI ChatBot - GitHub', NULL),
(5, 'https://github.com/oskarcode/canvas-mcp-oskar', 'Canvas MCP Server - GitHub', NULL),
(6, 'https://github.com/oskarcode/portfolio', 'Portfolio Website - GitHub', NULL),
(7, 'https://www.linkedin.com/in/cloudflareoskar/', 'LinkedIn Profile', NULL),
(8, 'https://cloudteaching.oskarcode.com/', 'Cloud Computing Syllabus Site', NULL),
(9, 'https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140', 'Student Survey Results', NULL),
(10, 'https://github.com/oskarcode', 'GitHub Profile', NULL);

-- Skills-Links relationships
INSERT INTO portfolioapp_skills_links (skills_id, link_id) VALUES
(1, 1),  -- Data Science -> CoinML
(2, 2),  -- Security -> Medium
(4, 3),  -- Python -> GWU Course Review
(4, 4),  -- Python -> OpenAI ChatBot
(4, 5),  -- Python -> Canvas MCP
(4, 6),  -- Python -> Portfolio
(5, 7),  -- Enterprise Sales -> LinkedIn
(6, 8),  -- Teaching -> Syllabus
(6, 9),  -- Teaching -> Survey
(7, 5),  -- MCP -> Canvas MCP
(7, 6),  -- MCP -> Portfolio
(8, 10); -- Full-stack -> GitHub

-- ===========================================
-- PUBLISHED CONTENT
-- ===========================================
INSERT INTO portfolioapp_publishedcontent (id, platform, title, url, styling) VALUES
(1, 'Medium', '🔐 Implementing Zero Trust Access for AWS Access Portal', 'https://medium.com/@rnwqyzxnn/implementing-zero-trust-access-for-aws-access-portal-c155f0b041f9', NULL),
(2, 'Medium', '☁️ Deploying a Django Application with Docker into AWS EC2', 'https://medium.com/aws-tip/deploying-a-django-application-with-docker-into-aws-ec2-3ae642541c70', NULL),
(3, 'Medium', '💰 Building a Family Budget Management App with Django, AWS S3, AWS Textract, and Cloudflare', 'https://medium.com/aws-tip/building-a-family-budget-management-app-with-django-aws-s3-aws-textract-and-cloudflare-423d690ad6dc', NULL),
(4, 'Medium', '🔗 Connect MCP servers to Various Hosts', 'https://medium.com/@rnwqyzxnn/connect-mcp-servers-to-the-varies-host-fecfde9540de', NULL),
(5, 'Medium', '📚 MCP Workflow with Cloudflare and AWS Documentation', 'https://medium.com/@rnwqyzxnn/mcp-workflow-with-cloudflare-and-aws-documentation-6f10aad24a5c', NULL),
(6, 'Medium', '🏠 Developing a House Inventory App with AWS Rekognition', 'https://medium.com/aws-tip/developing-a-house-inventory-app-with-aws-rekognition-be796ec74e0e', NULL),
(7, 'Medium', '🤖 Building Your First MCP Server: A Weather API Integration with Claude', 'https://medium.com/@rnwqyzxnn/building-your-first-mcp-server-a-weather-api-integration-with-claude-f21f19674717', NULL),
(8, 'Medium', '🚀 Building an AI-Powered Portfolio with MCP: A Complete Guide', 'https://medium.com/@rnwqyzxnn/building-an-ai-powered-portfolio-with-mcp-a-complete-guide-de6f6f76c900', NULL),
(9, 'Medium', '🏗️ VPC Design', 'https://medium.com/@rnwqyzxnn/vpc-design-793b6078e529', NULL),
(10, 'Medium', 'Building a Security-First E-commerce Demo: How I Created a Vulnerability Testing Platform with Cloudflare Workers', 'https://medium.com/@rnwqyzxnn/building-a-security-first-e-commerce-demo-how-i-created-a-vulnerability-testing-platform-with-7d373985ac66', NULL);

-- ===========================================
-- CONTACT ME
-- ===========================================
INSERT INTO portfolioapp_contactme (id, platform, url, styling) VALUES
(1, 'LinkedIn', 'https://www.linkedin.com/in/cloudflareoskar/', NULL),
(2, 'Medium', 'https://medium.com/@rnwqyzxnn', NULL),
(3, 'Xiaohongshu (Red Book)', 'https://www.xiaohongshu.com/user/profile/5a7aa2e04eacab5a7f697ec5', NULL),
(4, 'GitHub', 'https://github.com/oskarcode', NULL);

-- ===========================================
-- CONSULTING INFO
-- ===========================================
INSERT INTO portfolioapp_consultinginfo (id, intro, consulting_services, included_details, why_me, success_criteria, booking_url, styling) VALUES (
    1,
    'Expert cloud consulting services for enterprises looking to modernize their infrastructure.',
    'Cloud Architecture Design, Security Assessment, Zero Trust Implementation, Performance Optimization',
    'Initial consultation, Architecture review, Implementation roadmap, Best practices documentation',
    '9+ years of enterprise cloud experience across AWS, Cloudflare, Alibaba, and Tencent Cloud platforms.',
    'Measurable improvements in security posture, performance metrics, and cost optimization.',
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1xHKYdvcfsUs7Oj4wKIW8UOZmpNdOAyNYtDq0vI_WNlV_m_vuKA7QkDmlNYhgmXGHueVxGDPgw?gv=true',
    NULL
);

-- ===========================================
-- RESUME
-- ===========================================
INSERT INTO portfolioapp_resume (id, summary, employment_history, education, certifications, my_skills, languages, styling) VALUES (
    1,
    'Senior Sales Engineer & Cloud Computing Leader - Accomplished Senior Sales Engineer with 9+ years driving enterprise cloud transformation across Fortune 500 platforms including AWS, Cloudflare, Tencent, and Alibaba Cloud. Proven success exceeding $1M+ annual quotas while building strategic C-suite partnerships.',
    '[{"title": "Senior Sales Engineer", "company": "Cloudflare", "period": "Current", "description": "Enterprise cloud solutions and security architecture"}, {"title": "Adjunct Professor - Cloud Computing", "company": "Yeshiva University", "period": "Current", "description": "Teaching cloud computing to graduate students"}, {"title": "Enterprise Account Manager", "company": "Cloudflare", "period": "Previous", "description": "Top 10% performer for two consecutive years"}, {"title": "Senior Strategic Sales Manager", "company": "Alibaba Cloud", "period": "Previous", "description": "Cloud solutions for enterprise clients"}, {"title": "Global Account Manager", "company": "Tencent Cloud", "period": "Previous", "description": "Managing global enterprise accounts"}]',
    '[{"degree": "Master of Engineering in Cloud Computing Management", "school": "George Washington University", "year": "2018"}]',
    '[{"name": "Cloudflare Accredited Configuration Engineer (ACE)", "issuer": "Cloudflare", "date": "August 2024"}, {"name": "Cloudflare Accredited Sales Engineer (ASE)", "issuer": "Cloudflare", "date": "July 2024"}, {"name": "AWS Certified Solutions Architect - Professional", "issuer": "Amazon Web Services", "date": "January 2018"}, {"name": "AWS Certified Solutions Architect - Associate", "issuer": "Amazon Web Services", "date": "June 2017"}, {"name": "Alibaba Cloud Professional Solution Architect", "issuer": "Alibaba Cloud", "date": "August 2020"}, {"name": "Tencent Cloud Certified Practitioner", "issuer": "Tencent Cloud", "date": "January 2021"}]',
    '🎯 Technical Sales Engineering, ☁️ Cloud Solution Consulting, 🔐 Security & Zero Trust Consulting, 🐍 API & Backend Development with Python, 💼 Enterprise Tech Sales, ☁️ Cloud Computing & Tech Teaching',
    '[{"language": "English", "proficiency": "Professional Working Proficiency"}, {"language": "Chinese (Mandarin)", "proficiency": "Native Speaker"}, {"language": "French", "proficiency": "Professional Working Proficiency"}, {"language": "Uyghur", "proficiency": "Native Speaker"}]',
    NULL
);

-- ===========================================
-- TEACHING
-- ===========================================
INSERT INTO portfolioapp_teaching (id, title, course_overview, teaching_school, learning_outcomes, syllabus, hands_on_projects, students_feedback, styling) VALUES (
    1,
    'Cloud Computing Course',
    'This class provides a comprehensive overview of cloud computing, covering foundational concepts and advanced topics, along with corresponding AWS hands-on projects. AWS will be used as the primary cloud provider for practical examples. Key AWS services in computing, networking, storage, big data, AI, serverless computing, and containerization will be introduced.',
    'The Katz School of Science and Health at Yeshiva University',
    '["Understand cloud computing fundamentals", "Master enabling technologies like hyperscale computing and networking", "Gain insights into big data storage and analytics", "Explore AI in the cloud, serverless architectures, and containerization", "Formulate strategies for secure and compliant cloud adoption", "Develop hands-on expertise with AWS core services", "Most students pass AWS Cloud Practitioner, some pass Solutions Architect Associate"]',
    '[]',
    'https://github.com/oskarcode/yuteaching.git',
    '[{"semester": "Spring 2025", "url": "https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140"}, {"semester": "Summer 2025", "url": "https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140"}, {"semester": "Fall 2025", "url": "https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140"}]',
    NULL
);
