const fs = require('fs');
const path = require('path');

// Read all markdown files
const aiLearningDir = path.join(__dirname, 'ai-learning');
const files = [
    '00_LEARNING_PATH.md',
    '01_LLM_Fundamentals.md',
    '02_Tokens_Context_Embeddings.md',
    '03_Prompting_Temperature.md',
    '04_CoT_vs_ReAct.md',
    '05_Tool_Calling_Function_Calling.md',
    '06_Agent_Reasoning_Loops.md',
    '07_LangChain_Components.md',
    '08_Memory_Context_Management.md',
    '09_Output_Parsers_Structured_Outputs.md',
    '10_RAG_Vector_Databases.md',
    '11_Error_Handling_Production.md',
    '12_ML_System_Design_Best_Practices.md',
    '13_Hands_On_Exercises.md',
    'INTERVIEW_DEMO_PREP.md',
    'QUICK_REFERENCE.md'
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
    const filePath = path.join(aiLearningDir, file);
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

// Create navigation
const navHtml = modules.map((m, i) => {
    return `<a href="#${m.id}" class="nav-item" onclick="showModule('${m.id}')">${m.title}</a>`;
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
    <title>AI/ML Learning Hub - Master LLMs & Agentic AI</title>
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
            width: 300px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
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

        .nav-item {
            display: block;
            padding: 12px 15px;
            margin: 8px 0;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.3s ease;
            font-size: 14px;
            background: rgba(255,255,255,0.1);
        }

        .nav-item:hover {
            background: rgba(255,255,255,0.2);
            transform: translateX(5px);
        }

        .nav-item.active {
            background: rgba(255,255,255,0.3);
            font-weight: 600;
        }

        /* Main Content */
        .main-content {
            margin-left: 300px;
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
            color: #2d3748;
            margin-bottom: 20px;
            font-weight: 800;
            line-height: 1.2;
        }

        h2 {
            font-size: 32px;
            color: #4a5568;
            margin: 40px 0 20px 0;
            font-weight: 700;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }

        h3 {
            font-size: 24px;
            color: #667eea;
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
            content: "▶";
            position: absolute;
            left: 0;
            color: #667eea;
            font-size: 12px;
        }

        /* Code Blocks */
        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 25px;
            border-radius: 10px;
            overflow-x: auto;
            margin: 25px 0;
            border-left: 4px solid #667eea;
        }

        code {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.6;
        }

        p code {
            background: #f7fafc;
            color: #667eea;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 14px;
        }

        strong {
            color: #2d3748;
            font-weight: 600;
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
        }

        /* Progress Indicator */
        .progress-bar {
            position: fixed;
            top: 0;
            left: 300px;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
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
            background: #667eea;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
            background: #764ba2;
        }
    </style>
</head>
<body>
    <div class="progress-bar" id="progressBar"></div>
    
    <div class="container">
        <aside class="sidebar">
            <h1>🤖 AI/ML Learning Hub</h1>
            <p>Master LLMs, Agents, and Production ML</p>
            <nav>
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
            document.getElementById(moduleId).classList.add('active');

            // Update nav active state
            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.remove('active');
            });
            event.target.classList.add('active');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
const outputPath = path.join(__dirname, 'ai-learning.html');
fs.writeFileSync(outputPath, html);

console.log(`✅ Created ${outputPath}`);
console.log(`📚 Converted ${modules.length} modules`);
console.log(`🌐 Open file:///Users/kondapus/Desktop/glcp/hol/ai-learning.html in your browser`);
