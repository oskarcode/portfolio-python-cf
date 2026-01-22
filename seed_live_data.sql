-- Clear existing data
DELETE FROM portfolioapp_project_skills;
DELETE FROM portfolioapp_project;
DELETE FROM portfolioapp_skill_links;
DELETE FROM portfolioapp_skill;
DELETE FROM portfolioapp_link;
DELETE FROM portfolioapp_self_intro_skills;
DELETE FROM portfolioapp_self_intro;
DELETE FROM portfolioapp_publishedcontent;
DELETE FROM portfolioapp_consultinginfo;
DELETE FROM portfolioapp_contactme;
DELETE FROM portfolioapp_resume;
DELETE FROM portfolioapp_teaching;

-- Self Intro
INSERT INTO portfolioapp_self_intro (id, summary, experiences, education, styling) VALUES (
    3,
    '<section style=''margin-bottom:1.2rem;''><span style=''font-size:1.2em;''>🚀</span> <strong>About Me</strong><br>My name is <strong>Oskar Ablimit</strong>, and I am a Senior Sales Engineer with an engineering mindset, holding a Master of Engineering in Cloud Computing from George Washington University. I foster long-term tech C-suite connections and specialize in Cloud Security, AI, Network, and Cybersecurity solutions across Fortune 500 tech firms, bridging technical expertise with business transformation.</section>
<section style=''margin-bottom:1.2rem;''><span style=''font-size:1.2em;''>🏆</span> <strong>Professional Achievements</strong><br>Proven technical sales experience with $1M+ quota achievement and 8+ years of consultative-based selling for IaaS and SaaS solutions. Currently serving as a <strong>Senior Sales Engineer at Cloudflare</strong> in New York, leveraging my top 10% enterprise sales performance with deep technical expertise to drive customer success through solution architecture and technical demonstrations.</section>
<section style=''margin-bottom:1.2rem;''><span style=''font-size:1.2em;''>👨‍🏫</span> <strong>Teaching & Mentorship</strong><br>Adjunct Professor at Yeshiva University, delivering comprehensive cloud computing courses with hands-on AWS projects to graduate students in AI, Data Science, and Cybersecurity tracks.</section>
<section style=''margin-bottom:1.2rem;''><span style=''font-size:1.2em;''>💡</span> <strong>Technical Focus</strong><br>My technical expertise combines strong learning and hands-on experience in Cloud, Cybersecurity, and AI technologies. I enjoy building Django applications and exploring new technologies in my spare time, bridging the gap between technical solutions and business transformation through solution engineering excellence.</section>',
    '☁️ **Enterprise Account Manager at Cloudflare (Oct 2022 - Present)** - Top 10% performer managing enterprise customers (5000+ employees) like New York Times and Madison Square Garden.

👨‍🏫 **Adjunct Professor at Yeshiva University (Jan 2025 - Present)** - Teaching comprehensive cloud computing with hands-on AWS projects to graduate students.

🎮 **Senior Strategic Sales Manager at Tencent Cloud (Jul 2021 - Oct 2022)** - First sales to achieve over $1M quota. Built partner channels in Europe.

🛒 **Inside Sales Manager at Alibaba Cloud (Jun 2020 - Jul 2021)** - Covered key internet customers in North China supporting Alibaba ecosystem.

⚡ **Global Account Manager at AWS (Jun 2016 - Jun 2020)** - Various customer-facing roles from SDR to Account Manager.',
    '🎓 **Master of Engineering in Cloud Computing** - George Washington University (May 2023)

🎓 **Human Resources Management** - Renmin University of China (Jul 2016)',
    NULL
);

-- Skills
INSERT INTO portfolioapp_skill (id, skill, example, styling) VALUES
(17, '🐍 API & Backend Development with Python', 'Expert in building API integrations and backend development using Python, Django, and Django REST Framework. Developed multiple web applications including chatbots with OpenAI API, MCP servers for AI integration, project management platforms, and course review systems.', NULL),
(18, '☁️ Cloud Solution Consulting', 'Cloudflare Pitch Certified professional with deep expertise in cloud infrastructure consulting across AWS, Alibaba Cloud, Tencent Cloud, and Cloudflare platforms. Solutions architect for 100+ enterprise and startup customers.', NULL),
(25, '🔐 Security & Zero Trust Consulting', 'Specialized in application security, network security, and Zero Trust architecture consulting for enterprise clients. Experience implementing Cloudflare''s security solutions including DDoS protection, WAF, and Zero Trust network access.', NULL),
(26, '📊 Data Science with Pandas', 'Data analysis and processing using Python pandas for business intelligence and technical content creation. Experience working with large datasets, data visualization, and analytics.', NULL),
(37, '🤖 AI & MCP Server Development', 'Specialized in creating Model Context Protocol (MCP) servers for AI integration and automation. Developed custom MCP servers for Canvas LMS integration, portfolio management systems, and educational platforms.', NULL),
(41, '🎯 Technical Sales Engineering', 'Senior Sales Engineer specializing in solution architecture, technical demonstrations, and proof-of-concept implementations for enterprise cloud and security solutions.', NULL);

-- Links
INSERT INTO portfolioapp_link (id, url, link_name, styling) VALUES
(10, 'https://github.com/oskarcode/gwu-course-review', 'GWU Course Review - GitHub', NULL),
(11, 'https://github.com/oskarcode/answermeopenai', 'OpenAI ChatBot - GitHub', NULL),
(14, 'https://github.com/oskarcode/coinml', 'CoinML Dataset - GitHub', NULL),
(24, 'https://medium.com/me/stories/public', 'Medium Security Articles', NULL),
(25, 'https://github.com/oskarcode/canvas-mcp-oskar', 'Canvas MCP Server - GitHub', NULL),
(26, 'https://github.com/oskarcode/portfolio', 'Portfolio MCP Server - GitHub', NULL);

-- Skill Links
INSERT INTO portfolioapp_skill_links (skill_id, link_id) VALUES
(17, 10), (17, 11),
(25, 24),
(26, 14),
(37, 25), (37, 26);

-- Projects
INSERT INTO portfolioapp_project (id, title, description, link, use_case, frontend, backend, hosting, styling) VALUES
(72, '⚡ Fetch API Demonstration', 'A comprehensive demonstration of modern JavaScript''s Fetch API showcasing asynchronous programming techniques and HTTP request handling.', 'https://github.com/oskarcode/fetchapi', 'Modern JavaScript HTTP requests and asynchronous programming', 'HTML5, CSS3, JavaScript (ES6+)', 'None (Frontend Only)', 'GitHub Pages', NULL),
(74, '📚 Frontend Learning Project', 'A hands-on frontend development learning project demonstrating HTML, CSS, and web design fundamentals.', 'https://github.com/oskarcode/frontendlearning', 'Frontend development learning and demonstration', 'HTML5, CSS3, Responsive Design', 'None (Frontend Only)', 'GitHub Pages', NULL),
(75, '🐍 Python Bootcamp Exercises', 'A collection of Python programming exercises and homework assignments from a bootcamp course.', 'https://github.com/oskarcode/python_bootcamp', 'Python learning and programming practice exercises', 'Jupyter Notebooks, Python Scripts', 'Python, Jupyter Notebooks', 'GitHub Repository', NULL),
(79, 'GWU Course Review Platform', 'An educational platform providing comprehensive course evaluations and academic guidance for George Washington University''s Engineering School programs.', 'https://gwu-course-review.mycodeforever.com/', 'Educational platform for course evaluation and academic guidance', 'HTML/CSS/JavaScript, Django Templates', 'Django REST Framework, Python', 'Custom domain hosting', NULL),
(83, '🚀 Portfolio Combined - AI-Driven Platform', 'A comprehensive AI-driven full-stack portfolio platform featuring Django REST API backend, vanilla JavaScript SPA frontend, and Model Context Protocol integration.', 'https://github.com/oskarcode/portfolio_combined', 'Full-stack AI-integrated portfolio platform with serverless architecture', 'Vanilla JavaScript, Tailwind CSS, HTML5/CSS3', 'Django 5.2.1, Django REST Framework, PostgreSQL, AWS Lambda', 'AWS Lambda (Backend), Cloudflare Workers (Frontend)', NULL),
(94, 'Cloudflare Security Demo E-commerce Site', 'A deliberately vulnerable Django e-commerce application designed to demonstrate Cloudflare''s comprehensive security features including WAF, Bot Management, Rate Limiting, DDoS Protection, and Access Rules.', 'https://demo.oskarcode.com/', 'Security demonstration platform for showcasing web application vulnerabilities and Cloudflare protection capabilities', 'HTML, CSS, JavaScript, Django Templates', 'Django 5.2.5, Python 3.10+, Nginx, Docker', 'AWS EC2 with Cloudflare Edge Network, Docker Deployment', NULL);

-- Published Content
INSERT INTO portfolioapp_publishedcontent (id, platform, title, url, styling) VALUES
(2, 'Medium', '🤖 Building Your First MCP Server: A Weather API Integration with Claude', 'https://medium.com/@rnwqyzxnn/building-your-first-mcp-server-a-weather-api-integration-with-claude-f21f19674717', NULL),
(3, 'Medium', '🚀 Building an AI-Powered Portfolio with MCP: A Complete Guide', 'https://medium.com/@rnwqyzxnn/building-an-ai-powered-portfolio-with-mcp-a-complete-guide-de6f6f76c900', NULL),
(4, 'Medium', '🔐 Implementing Zero Trust Access for AWS Access Portal', 'https://medium.com/@rnwqyzxnn/implementing-zero-trust-access-for-aws-access-portal-c155f0b041f9', NULL),
(5, 'Medium', '☁️ Deploying a Django Application with Docker into AWS EC2', 'https://medium.com/aws-tip/deploying-a-django-application-with-docker-into-aws-ec2-3ae642541c70', NULL),
(6, 'Medium', '💰 Building a Family Budget Management App with Django, AWS S3, AWS Textract, and Cloudflare', 'https://medium.com/aws-tip/building-a-family-budget-management-app-with-django-aws-s3-aws-textract-and-cloudflare-423d690ad6dc', NULL),
(7, 'Medium', '🔗 Connect MCP servers to Various Hosts', 'https://medium.com/@rnwqyzxnn/connect-mcp-servers-to-the-varies-host-fecfde9540de', NULL),
(8, 'Medium', '📚 MCP Workflow with Cloudflare and AWS Documentation', 'https://medium.com/@rnwqyzxnn/mcp-workflow-with-cloudflare-and-aws-documentation-6f10aad24a5c', NULL),
(9, 'Medium', '🏠 Developing a House Inventory App with AWS Rekognition', 'https://medium.com/aws-tip/developing-a-house-inventory-app-with-aws-rekognition-be796ec74e0e', NULL),
(10, 'Medium', '🏗️ VPC Design', 'https://medium.com/@rnwqyzxnn/vpc-design-793b6078e529', NULL),
(11, 'Medium', 'Building a Security-First E-commerce Demo: How I Created a Vulnerability Testing Platform with Cloudflare Workers', 'https://medium.com/@rnwqyzxnn/building-a-security-first-e-commerce-demo-how-i-created-a-vulnerability-testing-platform-with-7d373985ac66', NULL);

-- Consulting Info
INSERT INTO portfolioapp_consultinginfo (id, intro, consulting_services, included_details, why_me, success_criteria, booking_url, styling) VALUES (
    2,
    '🚀 Accelerate your tech career with expert guidance from 9+ years of proven experience across sales and solutions engineering. I''ve successfully navigated complex career transitions in global markets (APAC, EMEA, North America), specializing in cloud computing, cybersecurity, sales engineering transitions, and international business expansion.',
    '## 🌟 Tech Sales Career Development

### What I Offer
- Strategic roadmaps for transitioning from BDR to Account Executive
- Personalized technical sales career development plans
- Sales methodology training and quota attainment strategies

## 🎯 Solutions Engineering Career Transitions

### What I Offer
- Comprehensive AE/BDR to Sales Engineer transition strategies
- Solutions Engineering interview preparation and technical presentation coaching
- Technical discovery frameworks and customer education methodologies

## 🌍 Global Business Expansion

### What I Offer
- North America market entry strategies for B2B tech companies
- International sales methodologies and cross-cultural adaptation frameworks

## 🎓 Technical Education & Training

### What I Offer
- Cloud computing and cybersecurity curriculum development
- Corporate training programs for technical sales and engineering teams',
    '## 💰 Pricing & Packages

### Individual Coaching Sessions
$100/hour for personalized 1-on-1 sessions

### Enterprise Solutions
Custom consulting packages tailored to your organization''s needs

## 💳 Payment Options
- **Zelle** - For US clients
- **Venmo** - For US clients
- **WeChat Pay** - For international clients
- **Wire Transfer** - For enterprise clients',
    '## 🏆 Why Choose Me

### Career Progression
**9+ years progressive experience:** BDR → AE → Enterprise AE → Senior Sales Engineer

### Academic & Technical Credentials
- Master of Engineering in Cloud Computing (George Washington University, 3.8 GPA)
- Cloudflare Accredited Sales Engineer (ASE) & Configuration Engineer (ACE)
- AWS Certified Solutions Architect - Professional
- Active Adjunct Professor at Yeshiva University

### International Experience
- Successfully built careers in Beijing, Paris, and New York
- Fluent in English, Mandarin, French, and Uyghur',
    '',
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1xHKYdvcfsUs7Oj4wKIW8UOZmpNdOAyNYtDq0vI_WNlV_m_vuKA7QkDmlNYhgmXGHueVxGDPgw?gv=true',
    NULL
);

-- Contact Me
INSERT INTO portfolioapp_contactme (id, platform, url, styling) VALUES
(1, '📱 Xiaohongshu (Red Book)', 'https://www.xiaohongshu.com/user/profile/5a7aa2e04eacab5a7f697ec5', NULL),
(2, '💼 LinkedIn', 'https://www.linkedin.com/in/cloudflareoskar/', NULL),
(3, '📝 Medium', 'https://medium.com/@rnwqyzxnn', NULL),
(8, '💻 GitHub', 'https://github.com/oskarcode', NULL);

-- Resume
INSERT INTO portfolioapp_resume (id, summary, employment_history, education, certifications, my_skills, languages, styling) VALUES (
    2,
    '**Senior Sales Engineer & Cloud Computing Leader**

Accomplished Senior Sales Engineer with 9+ years driving enterprise cloud transformation across Fortune 500 platforms including AWS, Cloudflare, Tencent, and Alibaba Cloud. Proven success exceeding $1M+ annual quotas while building strategic C-suite partnerships. Expert in solution architecture, technical demonstrations, and translating complex technical capabilities into measurable business outcomes.',
    '[{"title":"Senior Sales Engineer","period":"October 2025 — Present","company":"Cloudflare","location":"New York, NY","description":"Drive technical sales excellence through solution architecture, proof-of-concept implementations, and customer education for enterprise cloud security and performance solutions."},{"title":"Enterprise Account Manager","period":"October 2022 — October 2025","company":"Cloudflare","location":"New York, NY","description":"Led enterprise cloud security transformation for Fortune 500 accounts (5,000+ employees) across the New York Metropolitan area."},{"title":"Adjunct Professor - Cloud Computing","period":"January 2025 — Present","company":"Yeshiva University","location":"New York, NY","description":"Design and deliver advanced cloud computing curriculum for graduate-level AI, Data Science, and Cybersecurity programs."},{"title":"Senior Strategic Sales Manager","period":"July 2021 — October 2022","company":"Tencent Cloud","location":"Paris, France","description":"Pioneered Western European market entry as the first sales professional to exceed $1M annual quota."},{"title":"Inside Sales Manager","period":"June 2020 — July 2021","company":"Alibaba Cloud","location":"Beijing, China","description":"Led North China internet customer coverage supporting Alibaba ecosystem."},{"title":"Global Account Manager","period":"June 2016 — June 2020","company":"AWS","location":"Beijing, China","description":"Various customer-facing roles from SDR to Account Manager covering 100+ GISVs."}]',
    '[{"degree":"Master of Engineering in Cloud Computing","institution":"George Washington University","period":"August 2021 — May 2023","description":"Comprehensive cloud computing topics including data center technology, cloud security, and AWS hands-on projects."},{"degree":"Bachelor of Management in Human Resources","institution":"Renmin University of China","period":"September 2012 — July 2016","description":"Theoretical and practical HR knowledge at one of China''s top universities."}]',
    '[{"name":"Cloudflare Accredited Sales Engineer (ASE)","issuer":"Cloudflare","period":"October 2025","status":"Active"},{"name":"Cloudflare Accredited Configuration Engineer (ACE)","issuer":"Cloudflare","period":"October 2025","status":"Active"},{"name":"AWS Certified Solutions Architect - Professional","issuer":"Amazon Web Services","period":"January 2018","status":"Active"},{"name":"Alibaba Cloud Professional Solution Architect","issuer":"Alibaba Cloud","period":"August 2020","status":"Active"},{"name":"Tencent Cloud Certified Practitioner","issuer":"Tencent Cloud","period":"January 2021","status":"Active"}]',
    '**Key Technical & Business Skills**
- 🎯 Technical Sales Engineering
- ☁️ Cloud Solution Consulting  
- 🔐 Security & Zero Trust Consulting
- 🐍 API & Backend Development with Python
- 💼 Enterprise Tech Sales
- ☁️ Cloud Computing & Tech Teaching',
    '[{"language":"English","proficiency":"Professional Working Proficiency","details":"Business fluent with expertise in technical presentations"},{"language":"Chinese (Mandarin)","proficiency":"Native Speaker","details":"Native fluency in business and technical contexts"},{"language":"French","proficiency":"Professional Working Proficiency","details":"Business conversations and market operations"},{"language":"Uyghur","proficiency":"Native Speaker","details":"Cultural heritage language"}]',
    NULL
);

-- Teaching
INSERT INTO portfolioapp_teaching (id, title, course_overview, teaching_school, learning_outcomes, syllabus, hands_on_projects, students_feedback, styling) VALUES (
    1,
    'Cloud Computing Course',
    'This class provides a comprehensive overview of cloud computing, covering foundational concepts and advanced topics, along with corresponding AWS hands-on projects. AWS will be used as the primary cloud provider for practical examples. Key AWS services in computing, networking, storage, big data, AI, serverless computing, and containerization will be introduced. The course includes a hands-on project for each topic. This course aims to equip students with both theoretical foundations and practical skills needed for the cloud computing industry.',
    'The Katz School of Science and Health at Yeshiva University',
    '["Understand cloud computing fundamentals.","Master enabling technologies like hyperscale computing and networking.","Gain insights into big data storage and analytics.","Explore AI in the cloud, serverless architectures, and containerization.","Formulate strategies for secure and compliant cloud adoption.","Develop hands-on expertise with AWS core services.","Most students who took this course are able to pass the AWS Cloud Practitioner Essentials."]',
    '[{"class_number":1,"main_topic":"Cloud Computing Basics","content_details":"Cloud Status, Definition, Characteristics, Service/Delivery Model","hands_on_project":"Set up AWS Account"},{"class_number":2,"main_topic":"AWS Section","content_details":"AWS Account, IAM, Global Infrastructure, Pricing Model, CLI, API/SDK","hands_on_project":"Set up IAM user, policy; Install AWS CLI"},{"class_number":3,"main_topic":"Cloud Enabling Technology","content_details":"Networking Technology, Virtualization, Web Technology, Containerization","hands_on_project":"Deploy a simple web application into AWS EC2"},{"class_number":4,"main_topic":"AWS VPC","content_details":"AWS VPC, Network ACL/Security Group, Shared Responsibility","hands_on_project":"Set up an AWS customized VPC"},{"class_number":5,"main_topic":"Cloud Architecture","content_details":"Scaling, High Availability, and Fault Tolerance","hands_on_project":"Create AWS Security Group and ACL"},{"class_number":6,"main_topic":"Load Balancing","content_details":"Load Balancing, Auto Scaling","hands_on_project":"Create a VPC with various elements"},{"class_number":7,"main_topic":"Storage & Database","content_details":"Different types of storage, databases, and data analytics tools","hands_on_project":"N/A"},{"class_number":8,"main_topic":"AWS Storage","content_details":"AWS EBS, S3, RDS, DynamoDB, CloudFormation","hands_on_project":"Connect to AWS RDS; Use CloudFormation templates"},{"class_number":9,"main_topic":"DNS & CDN","content_details":"DNS and CDN; Route 53 and CloudFront","hands_on_project":"Create hosted zones; Set up S3 static website with CloudFront"},{"class_number":10,"main_topic":"Containers","content_details":"Containers and AWS services (ECS/ECR)","hands_on_project":"Containerize Django app; Deploy using AWS ECS"},{"class_number":11,"main_topic":"Serverless","content_details":"Lambda, API Gateway","hands_on_project":"Create Lambda function and expose via API Gateway"},{"class_number":12,"main_topic":"Big Data","content_details":"Redshift, EMR, Glue, Athena","hands_on_project":"Analyze ALB logs using Athena"},{"class_number":13,"main_topic":"Cloud Security","content_details":"AWS KMS, CloudHSM, WAF, Shield, GuardDuty","hands_on_project":"Create WAF rules; Explore GuardDuty"},{"class_number":14,"main_topic":"AI in Cloud","content_details":"AWS Rekognition, Transcribe, Translate, Comprehend, Lex","hands_on_project":"Build app with Rekognition and Textract"},{"class_number":15,"main_topic":"Cloud Architecture","content_details":"Six Pillars of AWS Architectural Best Practices","hands_on_project":"Create a three-tier architecture"}]',
    'https://github.com/oskarcode/yuteaching.git',
    '[{"semester":"Spring 2025","url":"https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140"},{"semester":"Summer 2025","url":"https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140"},{"semester":"Fall 2025","url":"https://www.smartevals.com/GreatestHits/YouAreAwesome.aspx?P=216974140"}]',
    NULL
);
