# Quick Reference: AI/ML Concepts for K8s Agent Project

**Use this as a cheat sheet during interviews and demos**

---

## 🤖 **LLMs (Large Language Models)**

### **What They Are**
- Neural networks trained on massive text data
- Predict next token based on patterns
- Parameters = "knobs" (more = smarter but slower)

### **Key Specs**
| Model | Parameters | Context Window | Cost | Speed |
|-------|------------|----------------|------|-------|
| GPT-4 | ~1.7T | 8K-128K | $$$ | Slow |
| Llama 3 70B | 70B | 8K | Free | Medium |
| Llama 3 7B | 7B | 8K | Free | Fast |

### **Important Numbers**
- 1 token ≈ 0.75 words
- 8K tokens ≈ 6K words ≈ 10 pages
- Temperature 0.0 = deterministic, 1.0 = creative

---

## ⚛️ **ReAct Pattern**

### **The Loop**
```
Thought → Action → Observation → Thought → ...
```

### **Why Use It**
- ✅ Can call tools to get real data
- ✅ Can interact with systems (kubectl, APIs)
- ✅ Can verify facts, not just guess
- ❌ More complex than simple prompting
- ❌ Multiple LLM calls (slower/expensive)

### **When to Use**
- ✅ Troubleshooting (need real cluster data)
- ✅ Math/calculations (need calculator)
- ✅ Current info (need search tool)
- ❌ Just explaining concepts (use simple prompt)
- ❌ Creative writing (no tools needed)

---

## 🔧 **Tools/Function Calling**

### **3 Essential Parts**
1. **Name**: What LLM calls it
2. **Function**: Python code that executes
3. **Description**: When/how to use it

### **Good Description Template**
```
[What it does in one sentence]

Use this when:
- [Scenario 1]
- [Scenario 2]

Input: [Format]
Output: [What it returns]

Example:
Input: [example]
Output: [result]
```

### **Best Practices**
- ✅ 5-7 tools (not 20+)
- ✅ Clear, specific descriptions
- ✅ Handle all errors
- ✅ Validate inputs
- ✅ Return strings (not objects)

---

## 🧠 **Memory Types**

| Type | When to Use | Pros | Cons |
|------|-------------|------|------|
| **BufferMemory** | Demos, short sessions | Simple | Token overflow |
| **BufferWindowMemory** ⭐ | Multi-turn debugging | Predictable | Loses old context |
| **SummaryMemory** | Long sessions | Saves tokens | Extra LLM calls |
| **SummaryBufferMemory** | Production | Best balance | Complex |

### **Your Project: Use BufferWindowMemory**
```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=10,  # Last 10 exchanges
    memory_key="chat_history",
    return_messages=True
)
```

---

## 📊 **RAG (Retrieval-Augmented Generation)**

### **What It Is**
```
User Query → Retrieve Relevant Docs → LLM + Docs → Answer
```

### **Components**
1. **Embeddings**: Convert text to vectors
2. **Vector DB**: Store/search embeddings (Chroma, Pinecone)
3. **Retriever**: Find relevant docs
4. **Generator**: LLM synthesizes answer

### **When Needed**
- ✅ Large knowledge base (docs, runbooks)
- ✅ Frequently updated info
- ✅ Want to cite sources
- ❌ Simple Q&A (overkill)
- ❌ Your project v1 (add later)

---

## 🏗️ **Your K8s Agent Architecture**

```
User Query
    ↓
FastAPI Service (in K8s)
    ↓
LangChain ReAct Agent
    ├─ LLM (Copilot/Llama 3)
    ├─ Memory (BufferWindowMemory)
    ├─ Tools:
    │   ├─ GetPodStatus
    │   ├─ GetPodLogs
    │   ├─ DescribePod
    │   ├─ AnalyzeErrors
    │   └─ CheckResources
    └─ Output Parser (Pydantic)
    ↓
Structured Response
```

---

## 🎯 **Component Trade-offs**

### **LLM Choice**

#### **GitHub Copilot (GPT-4)**
- ✅ Best: Code understanding, your repos
- ✅ Quality: Highest accuracy
- ❌ Cost: $$$ per call
- ❌ Vendor lock-in

#### **Llama 3 70B**
- ✅ Free and open source
- ✅ Good quality (90% of GPT-4)
- ✅ Can fine-tune
- ❌ No code context
- ❌ Need GPU to run

#### **Llama 3 7B**
- ✅ Fast inference
- ✅ Runs on CPU
- ✅ Free
- ❌ Lower quality
- ❌ Simpler reasoning

### **Agent Pattern**

#### **ReAct**
- ✅ Can use tools
- ✅ Autonomous decisions
- ✅ Best for troubleshooting
- ❌ Multiple LLM calls
- ❌ Complex to debug

#### **Chain-of-Thought**
- ✅ Simple reasoning
- ✅ One LLM call
- ❌ No tools
- ❌ Can't get real data

### **Memory Strategy**

#### **BufferWindowMemory (Your choice)**
- ✅ Simple, predictable
- ✅ Fixed token usage
- ✅ Good for debugging sessions
- ❌ Loses old context
- ❌ Not ideal for very long sessions

#### **SummaryBufferMemory**
- ✅ Best token efficiency
- ✅ Preserves key info
- ❌ Extra LLM calls
- ❌ More complex
- ❌ Overkill for demo

---

## 💬 **Interview Talking Points**

### **Why This Architecture?**

*"I chose ReAct pattern because we need to interact with live Kubernetes clusters - the agent must call kubectl commands to get real data. Chain-of-Thought wouldn't work because it only reasons with training data."*

### **Why These Tools?**

*"I focused on 5 essential diagnostic tools rather than creating one for every kubectl command. More tools confuse the agent and hurt performance. These 5 cover 90% of common issues: status checks, logs, details, error patterns, and resources."*

### **Why This Memory?**

*"I used ConversationBufferWindowMemory with k=10 because debugging sessions typically involve 5-10 exchanges. This prevents token overflow while maintaining recent context. For production, I'd upgrade to SummaryBufferMemory for longer sessions."*

### **Why Copilot?**

*"GitHub Copilot has access to our code repositories, so it can analyze deployment YAMLs and suggest fixes specific to our stack. Alternative was Llama 3 which is free but lacks code context. Trade-off: cost vs accuracy."*

---

## 🚨 **Common Pitfalls to Avoid**

| Mistake | Why Bad | Fix |
|---------|---------|-----|
| Too many tools | Confuses agent | 5-7 focused tools max |
| Vague tool descriptions | Wrong tool selection | Detailed descriptions with examples |
| No error handling | Agent crashes | Try/except in all tools |
| High temperature | Inconsistent tool picks | Use 0.0-0.3 for agents |
| No max_iterations | Infinite loops | Set to 5-10 |
| Ignoring token limits | Context overflow | Monitor and manage memory |

---

## 📝 **Quick Decision Matrix**

### **Should I add RAG?**
- Do you have >100 pages of docs? → Yes
- Is info frequently updated? → Yes
- Demo only, static K8s? → No (add later)

### **Should I use GPT-4 or Llama?**
- Need code analysis? → GPT-4/Copilot
- Budget constrained? → Llama 3
- Demo simplicity? → Llama 3 (local, no API keys)

### **Should I add more tools?**
- Is tool used >20% of time? → Yes
- Does it add unique capability? → Yes
- Just another view of same data? → No

---

## 🎓 **One-Sentence Explanations**

**LLM**: Neural network that predicts next token based on patterns in training data

**Token**: Smallest unit LLM processes, roughly 0.75 words

**Context Window**: Maximum tokens LLM can "remember" at once

**ReAct**: Pattern where LLM thinks, calls tools, observes results, and repeats

**Tool Calling**: Giving LLM ability to request function executions

**Memory**: Storing conversation history to maintain context

**RAG**: Retrieving relevant docs before generating answer

**Embeddings**: Converting text to numeric vectors for similarity search

**Agent**: LLM with tools and autonomy to solve tasks

**Temperature**: Controls randomness (0=deterministic, 1=creative)

---

## 🎯 **Confidence Checklist**

Before the demo, can you explain:
- ✅ Why you chose ReAct over chain-of-thought?
- ✅ Why these specific 5 tools?
- ✅ How token limits affect your agent?
- ✅ Why you chose this memory type?
- ✅ Trade-offs of Copilot vs Llama?
- ✅ How the agent decides which tool to use?
- ✅ What happens if agent gets stuck in a loop?
- ✅ How you'd improve this in production?

If yes to all → **You're ready!** 🚀
