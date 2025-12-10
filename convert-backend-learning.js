const fs = require('fs');
const path = require('path');

// Read all markdown files for backend learning
const backendLearningDir = path.join(__dirname, 'fullstack-backend-learning');
const files = [
    '00_LEARNING_PATH.md',
    '01_Go_Fundamentals.md',
    '02_Go_Concurrency.md',
    '03_Go_REST_APIs.md',
    '04_Go_Database_Integration.md',
    '05_Go_Testing_Best_Practices.md',
    '06_Kubernetes_Architecture.md',
    '07_Kubernetes_Workloads_CRDs.md',
    '08_Kubernetes_Networking.md',
    '09_Kubernetes_Storage.md',
    '10_Kubernetes_Configuration.md',
    '11_Kubernetes_Tools.md',
    '12_Infrastructure_Server_Setup.md',
    '13_Terraform_IaC.md',
    '14_Ansible_Configuration_Management.md',
    '15_Database_Deep_Dive.md',
    '16_System_Design_Patterns.md',
    '17_Microservices_Architecture.md',
    '18_Authentication_Authorization.md',
    '19_Kafka_Event_Driven.md',
    '20_Frontend_Backend_Integration.md',
    '21_AWS_IAM_VPC.md',
    '22_AWS_Compute.md',
    '23_AWS_Storage.md',
    '24_AWS_Databases.md',
    '25_AWS_DevOps_CICD.md',
    '26_Prometheus_Monitoring.md',
    '27_Grafana_Dashboards.md',
    '28_EFK_Stack.md',
    '29_Distributed_Tracing.md',
    '30_Production_Best_Practices.md',
    '31_System_Design_Interview.md',
    '32_Backend_Interview_Prep.md'
];

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
    let html = markdown;
    
    // Code blocks with language
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Paragraphs
    html = html.split('\n\n').map(para => {
        if (para.trim() && !para.startsWith('<')) {
            return `<p>${para.trim()}</p>`;
        }
        return para;
    }).join('\n');
    
    return html;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Read and convert all files
const modules = files.map((file, index) => {
    const filePath = path.join(backendLearningDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const title = file.replace(/\.md$/, '').replace(/_/g, ' ');
    const id = `module-${index}`;
    
    return {
        id,
        title,
        file,
        content: markdownToHtml(content)
    };
});

// Create navigation grouped by parts
const navGroups = [
    { name: 'Getting Started', modules: modules.slice(0, 1) },
    { name: 'Part 1: Go Programming', modules: modules.slice(1, 6) },
    { name: 'Part 2: Kubernetes', modules: modules.slice(6, 12) },
    { name: 'Part 3: Infrastructure & Databases', modules: modules.slice(12, 16) },
    { name: 'Part 4: Microservices', modules: modules.slice(16, 21) },
    { name: 'Part 5: AWS', modules: modules.slice(21, 26) },
    { name: 'Part 6: Observability', modules: modules.slice(26, 29) },
    { name: 'Part 7: Production & Interview', modules: modules.slice(29, 33) }
];

const navHtml = navGroups.map(group => {
    const items = group.modules.map(m => {
        return `<a href="#${m.id}" class="nav-item" onclick="showModule('${m.id}')">${m.title}</a>`;
    }).join('\n');
    
    return `
        <div class="nav-group">
            <div class="nav-group-title">${group.name}</div>
            ${items}
        </div>
    `;
}).join('\n');

// Create content sections
const contentHtml = modules.map(m => {
    return `
    <div class="module-content" id="${m.id}">
        ${m.content}
    </div>
    `;
}).join('\n');

// Create HTML page
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backend Engineering Hub - Go, Kubernetes, AWS & System Design</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
        }

        .container {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar Navigation */
        .sidebar {
            width: 320px;
            background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
            color: white;
            padding: 30px 20px;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.2);
        }

        .sidebar h1 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .sidebar p {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 30px;
        }

        .nav-group {
            margin-bottom: 25px;
        }

        .nav-group-title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.7;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .nav-item {
            display: block;
            padding: 10px 15px;
            margin: 5px 0;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.3s ease;
            font-size: 13px;
            background: rgba(255,255,255,0.05);
        }

        .nav-item:hover {
            background: rgba(255,255,255,0.15);
            transform: translateX(5px);
        }

        .nav-item.active {
            background: rgba(255,255,255,0.25);
            font-weight: 600;
        }

        /* Main Content */
        .main-content {
            margin-left: 320px;
            flex: 1;
            padding: 40px 60px;
            max-width: 1200px;
        }

        .module-content {
            display: none;
            background: white;
            padding: 50px;
            border-radius: 15px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.08);
            animation: fadeIn 0.5s ease;
        }

        .module-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Typography */
        h1 {
            font-size: 42px;
            color: #1a202c;
            margin-bottom: 20px;
            font-weight: 800;
            line-height: 1.2;
        }

        h2 {
            font-size: 32px;
            color: #2d3748;
            margin: 40px 0 20px 0;
            font-weight: 700;
            border-bottom: 3px solid #2c5364;
            padding-bottom: 10px;
        }

        h3 {
            font-size: 24px;
            color: #2c5364;
            margin: 30px 0 15px 0;
            font-weight: 600;
        }

        p {
            margin: 15px 0;
            color: #4a5568;
            font-size: 16px;
            line-height: 1.8;
        }

        /* Lists */
        ul {
            margin: 20px 0;
            padding-left: 0;
            list-style: none;
        }

        li {
            margin: 12px 0;
            padding-left: 30px;
            position: relative;
            color: #4a5568;
            line-height: 1.8;
        }

        li:before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #2c5364;
            font-size: 14px;
            font-weight: bold;
        }

        /* Code Blocks */
        pre {
            background: #1a202c;
            color: #e2e8f0;
            padding: 25px;
            border-radius: 10px;
            overflow-x: auto;
            margin: 25px 0;
            border-left: 4px solid #2c5364;
        }

        code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.6;
        }

        p code, li code {
            background: #f7fafc;
            color: #2c5364;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
        }

        strong {
            color: #1a202c;
            font-weight: 600;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        th {
            background: #f7fafc;
            font-weight: 600;
            color: #2d3748;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                height: auto;
            }

            .main-content {
                margin-left: 0;
                padding: 20px;
            }

            .container {
                flex-direction: column;
            }

            .module-content {
                padding: 30px 20px;
            }
        }

        /* Progress Indicator */
        .progress-bar {
            position: fixed;
            top: 0;
            left: 320px;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #2c5364 0%, #203a43 100%);
            transform-origin: left;
            z-index: 1000;
        }

        /* Scroll to Top */
        .scroll-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: #2c5364;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(44, 83, 100, 0.4);
            transition: all 0.3s ease;
            opacity: 0;
            pointer-events: none;
        }

        .scroll-top.visible {
            opacity: 1;
            pointer-events: all;
        }

        .scroll-top:hover {
            transform: scale(1.1);
            background: #203a43;
        }

        /* Search Box */
        .search-box {
            margin-bottom: 20px;
            position: relative;
        }

        .search-box input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.1);
            color: white;
            border-radius: 8px;
            font-size: 14px;
        }

        .search-box input::placeholder {
            color: rgba(255,255,255,0.6);
        }

        .search-box input:focus {
            outline: none;
            background: rgba(255,255,255,0.15);
            border-color: rgba(255,255,255,0.3);
        }
    </style>
</head>
<body>
    <div class="progress-bar" id="progressBar"></div>
    
    <div class="container">
        <aside class="sidebar">
            <h1>💻 Backend Engineering Hub</h1>
            <p>Master Go, Kubernetes, AWS & System Design</p>
            
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="Search modules..." onkeyup="searchModules()">
            </div>
            
            <nav id="navigation">
                ${navHtml}
            </nav>
        </aside>

        <main class="main-content">
            ${contentHtml}
        </main>
    </div>

    <button class="scroll-top" id="scrollTop" onclick="scrollToTop()">↑</button>

    <script>
        // Show first module by default
        document.addEventListener('DOMContentLoaded', () => {
            showModule('module-0');
        });

        function showModule(moduleId) {
            // Hide all modules
            document.querySelectorAll('.module-content').forEach(el => {
                el.classList.remove('active');
            });

            // Show selected module
            const selectedModule = document.getElementById(moduleId);
            if (selectedModule) {
                selectedModule.classList.add('active');
            }

            // Update nav active state
            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.remove('active');
            });
            
            const activeNav = document.querySelector(\`a[href="#\${moduleId}"]\`);
            if (activeNav) {
                activeNav.classList.add('active');
            }

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Search functionality
        function searchModules() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const navItems = document.querySelectorAll('.nav-item');
            
            navItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        // Progress bar
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById('progressBar').style.transform = \`scaleX(\${scrolled / 100})\`;

            // Show/hide scroll to top button
            const scrollTop = document.getElementById('scrollTop');
            if (winScroll > 300) {
                scrollTop.classList.add('visible');
            } else {
                scrollTop.classList.remove('visible');
            }
        });

        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            const modules = Array.from(document.querySelectorAll('.module-content'));
            const activeModule = document.querySelector('.module-content.active');
            const currentIndex = modules.indexOf(activeModule);

            if (e.key === 'ArrowRight' && currentIndex < modules.length - 1) {
                showModule(\`module-\${currentIndex + 1}\`);
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                showModule(\`module-\${currentIndex - 1}\`);
            }
        });
    </script>
</body>
</html>`;

// Write the HTML file
const outputPath = path.join(__dirname, 'backend-learning.html');
fs.writeFileSync(outputPath, html);

console.log(`✅ Created ${outputPath}`);
console.log(`📚 Converted ${modules.length} modules`);
console.log(`🌐 Open file://${outputPath} in your browser`);
console.log('');
console.log('📋 Module Structure:');
navGroups.forEach(group => {
    console.log(`  ${group.name}: ${group.modules.length} modules`);
});
