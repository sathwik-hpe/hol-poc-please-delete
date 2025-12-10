# Module 12: ML System Design & Best Practices

**Study Time**: ~30 minutes  
**Prerequisites**: All previous modules

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. How to design scalable ML systems
2. Common architecture patterns
3. Development workflow (prototype → production)
4. Evaluation and testing strategies
5. Cost optimization
6. How to talk about system design in interviews

---

## 🏛️ **ML System Architecture Layers**

### **Layer 1: Presentation**
- User interface (Web, CLI, API)
- Input validation
- Output formatting

### **Layer 2: Application Logic**
- Request routing
- Session management
- Business rules

### **Layer 3: ML/AI Layer**
- Agents
- LLM calls
- Tool execution
- Memory management

### **Layer 4: Data Layer**
- Vector databases
- Document stores
- Caching
- External APIs

### **Layer 5: Infrastructure**
- Kubernetes (deployment, scaling)
- Monitoring & logging
- Security & RBAC

---

## 🎨 **Common ML Architecture Patterns**

### **Pattern 1: Simple API Gateway**

```
User → FastAPI → LLM → Response
```

**Use case**: Simple Q&A, no tools, no memory

**Example**:
```python
from fastapi import FastAPI
from langchain_openai import ChatOpenAI

app = FastAPI()
llm = ChatOpenAI(model="gpt-4", temperature=0.0)

@app.post("/ask")
async def ask(query: str):
    response = llm.invoke(query)
    return {"answer": response.content}
```

**Pros**: ✅ Simple, fast to build  
**Cons**: ❌ No state, no tools, limited use

---

### **Pattern 2: Agent with Tools**

```
User → FastAPI → Agent → Tools → Response
                    ↓
                 Memory
```

**Use case**: Your K8s troubleshooting agent

**Example**:
```python
from fastapi import FastAPI
from langchain.agents import AgentExecutor
from langchain.memory import ConversationBufferWindowMemory

app = FastAPI()

# Global agent (in production, use session management)
memory = ConversationBufferWindowMemory(k=10)
agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory)

@app.post("/diagnose")
async def diagnose(query: str):
    result = agent_executor.invoke({"input": query})
    return {
        "diagnosis": result["output"],
        "success": True
    }
```

**Pros**: ✅ Can take actions, maintains context  
**Cons**: ❌ Need session management for multi-user

---

### **Pattern 3: RAG System**

```
User → FastAPI → RAG Chain → Vector DB → LLM → Response
```

**Use case**: Document Q&A, knowledge base

**Example**:
```python
from fastapi import FastAPI
from langchain.chains import RetrievalQA
from langchain.vectorstores import Chroma

app = FastAPI()

# Load vector store
vectorstore = Chroma(persist_directory="./db")
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever()
)

@app.post("/search")
async def search(query: str):
    result = qa_chain.invoke({"query": query})
    return {
        "answer": result["result"],
        "sources": result.get("source_documents", [])
    }
```

**Pros**: ✅ Grounded in docs, cite sources  
**Cons**: ❌ Need document ingestion pipeline

---

### **Pattern 4: Agent + RAG (Hybrid)**

```
User → FastAPI → Agent → [Kubectl Tools, RAG Tool] → Response
                    ↓
                 Memory
```

**Use case**: Your K8s agent v2 (production)

**Architecture**:
```python
from fastapi import FastAPI
from langchain.agents import AgentExecutor
from langchain.tools import tool

# RAG as a tool
@tool
def search_runbooks(query: str) -> str:
    """Search K8s runbooks"""
    return qa_chain.invoke({"query": query})["result"]

# Agent with kubectl + RAG tools
tools = [
    get_pod_status,
    get_pod_logs,
    describe_pod,
    search_runbooks  # ⭐ RAG tool
]

agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory)

@app.post("/diagnose")
async def diagnose(query: str, session_id: str):
    # Get or create session memory
    memory = get_session_memory(session_id)
    
    result = agent_executor.invoke({"input": query})
    
    return {
        "diagnosis": result["output"],
        "session_id": session_id
    }
```

**Pros**: ✅ Best of both worlds (real-time + docs)  
**Cons**: ❌ More complex, higher cost

---

## 📊 **Your K8s Agent: 3-Tier Architecture**

### **Tier 1: Demo/MVP (What you're building)**

```
┌─────────────┐
│   Terminal  │  (User)
└──────┬──────┘
       │
┌──────▼────────┐
│  FastAPI App  │
│  Port 8000    │
└──────┬────────┘
       │
┌──────▼─────────────────┐
│  LangChain Agent       │
│  - GetPodStatus        │
│  - GetPodLogs          │
│  - DescribePod         │
│  - CheckResources      │
│  - AnalyzeErrors       │
└──────┬─────────────────┘
       │
┌──────▼──────┐
│   kubectl   │  (Local K8s)
└─────────────┘
```

**Characteristics**:
- ✅ Simple, monolithic
- ✅ Local deployment (minikube)
- ✅ No database needed
- ✅ 5 tools, no RAG
- ✅ BufferWindowMemory (in-process)

**Suitable for**: Demo, interview, proof of concept

---

### **Tier 2: Production-Ready**

```
┌──────────────┐
│  Web UI      │  (React/Streamlit)
└──────┬───────┘
       │
┌──────▼───────────────────┐
│  API Gateway (FastAPI)   │
│  - Auth                  │
│  - Rate limiting         │
│  - Session management    │
└──────┬───────────────────┘
       │
┌──────▼────────────────────┐
│  Agent Service (K8s Pod)  │
│  - LangChain Agent        │
│  - Memory (Redis)         │
│  - Tools (kubectl + RAG)  │
└──────┬────────────────────┘
       │
┌──────▼───────┬─────────────┐
│  Vector DB   │  K8s Cluster│
│  (Chroma)    │  (kubectl)  │
└──────────────┴─────────────┘
```

**Additions**:
- ✅ Web UI
- ✅ Authentication
- ✅ Session management (Redis)
- ✅ RAG for runbooks
- ✅ Deployed in K8s
- ✅ Monitoring & logs

**Suitable for**: Internal tooling, small team

---

### **Tier 3: Enterprise Scale**

```
┌────────────────────────────────────────┐
│  Load Balancer                         │
└────────┬───────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│  API Gateway (Kong/NGINX)               │
│  - Auth (OAuth)                         │
│  - Rate limiting                        │
│  - Caching                              │
└────────┬────────────────────────────────┘
         │
┌────────▼────────────────────────────────┐
│  Agent Service (Auto-scaling Pods)      │
│  - Multiple replicas                    │
│  - Load balanced                        │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────────┐
│ Redis │ │ Vector DB   │
│ Cluster│ │ (Pinecone) │
└───────┘ └─────────────┘
    │         │
┌───▼─────────▼────────┐
│  Observability       │
│  - Prometheus        │
│  - Grafana           │
│  - ELK Stack         │
└──────────────────────┘
```

**Additions**:
- ✅ Horizontal scaling
- ✅ High availability
- ✅ Managed services (Pinecone, Redis Cloud)
- ✅ Advanced observability
- ✅ Multi-cluster support
- ✅ Cost tracking & optimization

**Suitable for**: Large enterprise, thousands of users

---

## 🚀 **Development Workflow**

### **Phase 1: Prototype (1-2 days)**

**Goal**: Prove the concept works

```
1. Define problem ✅ (K8s troubleshooting)
2. Build simplest version ✅ (5 tools, local)
3. Test with 10 scenarios ✅
4. Demo to stakeholders ✅
```

**Tools**:
- Python script or Jupyter notebook
- Local LLM (Ollama) or API (OpenAI)
- Hardcoded configs
- Print statements for debugging

**Output**: Working demo, validated approach

---

### **Phase 2: MVP (3-5 days)**

**Goal**: Production-ready v1

```
1. Add error handling ✅
2. Create FastAPI service ✅
3. Add logging ✅
4. Write tests ✅
5. Deploy to K8s ✅
6. Document API ✅
```

**Tools**:
- FastAPI
- Docker
- Kubernetes manifests
- pytest for testing

**Output**: Deployable service, basic monitoring

---

### **Phase 3: Production (1-2 weeks)**

**Goal**: Scale and polish

```
1. Add RAG for runbooks ✅
2. Implement session management ✅
3. Build web UI ✅
4. Add authentication ✅
5. Set up monitoring (Prometheus) ✅
6. Load testing & optimization ✅
7. Write runbooks for ops ✅
```

**Tools**:
- Redis for sessions
- Chroma/Pinecone for RAG
- React/Streamlit for UI
- Prometheus + Grafana for monitoring

**Output**: Production-ready system

---

## 📐 **Design Principles**

### **1. Start Simple, Add Complexity Later**

❌ **Don't start here**:
```
Agent + RAG + Multi-model + Fine-tuning + Advanced memory + 
Vector DB + Kubernetes + Monitoring + ...
```

✅ **Start here**:
```
Agent + 5 tools + Local deployment
```

Then add:
- More tools → RAG → Better memory → Production deployment → Monitoring

### **2. Optimize for Iteration Speed**

**Early stages**: Use APIs (OpenAI, Anthropic)
- Fast to test
- High quality
- Don't worry about cost yet

**Later**: Optimize costs
- Self-hosted models (Llama 3)
- Caching
- Cheaper models for simple tasks

### **3. Measure Before Optimizing**

**Collect data first**:
- Which tools are used most?
- What queries take longest?
- What's the error rate?
- What's the cost per query?

**Then optimize**:
- Cache frequent tool outputs
- Use cheaper LLM for simple queries
- Remove unused tools

### **4. Build for Observability**

**From day 1**:
- Log every agent call
- Track tool usage
- Monitor errors
- Measure latency

**Benefits**:
- Debug issues faster
- Understand usage patterns
- Optimize based on data

---

## 🧪 **Testing & Evaluation**

### **Unit Tests**

Test individual tools:

```python
def test_get_pod_status():
    """Test pod status tool"""
    # Happy path
    result = get_pod_status("nginx-abc", "default")
    assert "nginx-abc" in result.lower()
    
    # Pod not found
    result = get_pod_status("nonexistent-pod", "default")
    assert "not found" in result.lower()
    
    # Invalid namespace
    result = get_pod_status("nginx-abc", "invalid-ns")
    assert "error" in result.lower()
```

### **Integration Tests**

Test agent end-to-end:

```python
def test_agent_diagnose_crashloop():
    """Test agent can diagnose CrashLoopBackOff"""
    agent = ProductionK8sAgent()
    
    result = agent.diagnose("Why is pod nginx-abc crashing?")
    
    assert result["success"] == True
    assert "crashloop" in result["output"].lower() or "crash" in result["output"].lower()
    assert result["steps"] >= 2  # Should call multiple tools
```

### **Evaluation Set**

Create test cases:

```python
test_cases = [
    {
        "query": "Pod nginx-abc is CrashLoopBackOff",
        "expected_tools": ["GetPodStatus", "GetPodLogs"],
        "expected_keywords": ["crash", "error", "fix"],
        "max_iterations": 3
    },
    {
        "query": "Pod is OOMKilled",
        "expected_tools": ["GetPodStatus", "GetPodLogs", "CheckResources"],
        "expected_keywords": ["memory", "limit", "increase"],
        "max_iterations": 3
    },
    # ... 20-50 test cases
]

def evaluate_agent(agent, test_cases):
    """Run agent on all test cases"""
    results = []
    
    for test in test_cases:
        result = agent.diagnose(test["query"])
        
        # Check expected tools were called
        tools_called = extract_tools_from_result(result)
        tools_match = all(tool in tools_called for tool in test["expected_tools"])
        
        # Check expected keywords in output
        output_lower = result["output"].lower()
        keywords_match = any(kw in output_lower for kw in test["expected_keywords"])
        
        # Check iterations
        iterations_ok = result["steps"] <= test["max_iterations"]
        
        results.append({
            "query": test["query"],
            "success": result["success"],
            "tools_match": tools_match,
            "keywords_match": keywords_match,
            "iterations_ok": iterations_ok,
            "score": sum([result["success"], tools_match, keywords_match, iterations_ok]) / 4
        })
    
    # Calculate metrics
    avg_score = sum(r["score"] for r in results) / len(results)
    print(f"Average Score: {avg_score:.2%}")
    
    return results
```

---

## 💰 **Cost Optimization**

### **1. Model Selection**

```python
# Expensive: GPT-4 for everything
llm = ChatOpenAI(model="gpt-4")  # $0.03/1K input tokens

# Optimized: GPT-3.5 for simple, GPT-4 for complex
def get_llm(query: str):
    if is_complex_query(query):
        return ChatOpenAI(model="gpt-4")
    else:
        return ChatOpenAI(model="gpt-3.5-turbo")  # $0.0015/1K tokens (20x cheaper!)
```

### **2. Caching**

```python
from functools import lru_cache
import hashlib

# Cache tool outputs
@lru_cache(maxsize=100)
def get_pod_status_cached(pod_name: str, namespace: str) -> str:
    """Cached version - pod status doesn't change every second"""
    return get_pod_status(pod_name, namespace)
    
# Cache LLM responses
class LLMCache:
    def __init__(self):
        self.cache = {}
    
    def get_or_call(self, prompt: str, llm):
        key = hashlib.md5(prompt.encode()).hexdigest()
        
        if key in self.cache:
            return self.cache[key]
        
        result = llm.invoke(prompt)
        self.cache[key] = result
        return result
```

### **3. Prompt Optimization**

```python
# ❌ Verbose prompt (wastes tokens)
prompt = f"""
You are an expert Kubernetes administrator with 10 years of experience...
[500 words of instructions]

Question: {query}
"""

# ✅ Concise prompt
prompt = f"""
K8s troubleshooting assistant. Diagnose issues using tools.

Question: {query}
"""
```

### **4. Batch Processing**

```python
# ❌ One request per query
for query in queries:
    result = llm.invoke(query)

# ✅ Batch multiple queries
batch_prompt = "\n\n".join([
    f"Query {i+1}: {q}" for i, q in enumerate(queries)
])
result = llm.invoke(batch_prompt)
```

---

## 🎤 **Interview Talking Points**

### **"Walk me through your system design"**

*"I designed a 3-tier architecture:*

1. ***Tier 1 (Demo)***: Monolithic FastAPI app with LangChain agent, 5 kubectl tools, in-process memory. Deployed locally with minikube. Simple, fast to build, proves concept.

2. ***Tier 2 (Production)***: Separate agent service in Kubernetes, Redis for session management, added RAG tool for runbooks. Includes monitoring, error handling, API authentication.

3. ***Tier 3 (Scale)***: Horizontal scaling with multiple agent replicas, managed services (Pinecone, Redis Cloud), advanced observability with Prometheus/Grafana, multi-cluster support.

*I started with Tier 1 for the demo, with clear path to Tier 2/3 for production."*

---

### **"How did you choose your tech stack?"**

*"I evaluated options across 3 dimensions:*

**LLM**: GPT-4 vs Llama 3
- *GPT-4*: Better quality, code-aware (GitHub Copilot)
- *Llama 3*: Free, can fine-tune
- **Choice**: GPT-4 for demo (quality matters), plan to add Llama 3 fallback

**Agent Framework**: LangChain vs custom
- *LangChain*: Mature, well-documented, less boilerplate
- *Custom*: Full control, lighter weight
- **Choice**: LangChain (faster development)

**Memory**: Buffer vs Window vs Summary
- *BufferWindow*: Fixed size, predictable
- *Summary*: Token-efficient but extra LLM calls
- **Choice**: BufferWindowMemory(k=10) - debugging sessions are short

*Every choice balances speed, quality, and cost."*

---

### **"How would you improve this for production?"**

*"5 key improvements:*

1. **RAG Integration**: Add vector DB with runbooks so agent can reference documented solutions

2. **Session Management**: Redis-backed memory for multi-user support

3. **Observability**: Prometheus metrics, structured logging, distributed tracing

4. **Cost Optimization**: Cache tool outputs, use GPT-3.5 for simple queries, batch processing

5. **Safety**: Add approval workflows for write operations, limit to specific namespaces, RBAC

*I'd also add evaluation suite with 50+ test cases to measure accuracy before/after changes."*

---

## 🎓 **Self-Check: Can You Explain?**

Before the interview, make sure you can answer:

✅ **Architecture**:
- Why 3 tiers? (demo → prod → scale)
- Why FastAPI? (async, modern, fast)
- Why LangChain? (less boilerplate, mature)

✅ **Design Choices**:
- Why these 5 tools? (cover 80% of issues)
- Why BufferWindowMemory? (short sessions)
- Why temperature=0.0? (deterministic)

✅ **Trade-offs**:
- GPT-4 vs Llama 3? (quality vs cost)
- ReAct vs RAG? (real-time vs docs)
- BufferWindow vs Summary? (simple vs efficient)

✅ **Production**:
- How to scale? (K8s replicas, Redis)
- How to monitor? (Prometheus, logs)
- How to optimize cost? (caching, cheaper models)

✅ **Improvement Path**:
- v1 → v2 → v3 roadmap
- What to add next? (RAG, auth, UI)
- How to evaluate? (test cases, metrics)

---

## 🚀 **Key Takeaways**

1. **Start simple**: Agent + tools → Add complexity later
2. **3-tier architecture**: Demo → Production → Scale
3. **Optimize for iteration**: Fast feedback loop
4. **Measure everything**: Logs, metrics, costs
5. **Test systematically**: Unit → integration → evaluation
6. **Plan for scale**: But don't over-engineer early
7. **Know trade-offs**: Explain every design decision

---

## 🎉 **Congratulations!**

You've completed all 12 core modules! You now have:
- ✅ Understanding of LLMs, tokens, embeddings
- ✅ Knowledge of ReAct, tool calling, agents
- ✅ Mastery of LangChain components
- ✅ Production patterns for error handling
- ✅ System design principles

**Next**: Review QUICK_REFERENCE.md and INTERVIEW_DEMO_PREP.md, then build your project!

---

**Time to complete this module**: 30 minutes  
**Total learning time (all 12 modules)**: ~8-10 hours  
**You're ready to build!** 🚀
