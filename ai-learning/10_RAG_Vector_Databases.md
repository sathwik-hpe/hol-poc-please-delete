# Module 10: RAG Pattern & Vector Databases

**Study Time**: ~45 minutes  
**Prerequisites**: Module 2 (Tokens & Embeddings)

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. What RAG (Retrieval-Augmented Generation) is and why it's powerful
2. When to use RAG vs other patterns
3. How vector databases enable semantic search
4. Complete RAG architecture
5. Why RAG might NOT be needed for your K8s agent v1

---

## 🔍 **What is RAG?**

**RAG = Retrieval-Augmented Generation**

A pattern where you:
1. **Retrieve** relevant documents from a knowledge base
2. **Augment** the LLM prompt with those documents
3. **Generate** an answer based on retrieved context

### **The Problem RAG Solves**

**LLMs have limitations**:
- ❌ Training data cutoff (can't know latest info)
- ❌ No access to private/internal docs
- ❌ Hallucinate facts they don't know
- ❌ Limited context window (can't fit all docs)

**Example**:
```python
user: "What's our company's policy on Kubernetes resource limits?"
llm: "I don't have access to your company's internal policies." ❌
```

**With RAG**:
```python
user: "What's our company's policy on Kubernetes resource limits?"

# System retrieves relevant docs from company knowledge base
retrieved_docs = [
    "Engineering Policy Doc: All production pods must have memory limits...",
    "Best Practices: CPU limits should be 2x requests..."
]

# LLM generates answer using retrieved context
llm: "According to your Engineering Policy Doc, all production pods must have 
memory limits set to prevent OOM issues. CPU limits should be 2x requests..." ✅
```

---

## 🏗️ **RAG Architecture**

```
User Query: "How do I fix OOMKilled pods?"
        ↓
    [1. Embed Query]
        ↓
    Query Embedding: [0.234, -0.512, 0.891, ...]
        ↓
    [2. Search Vector DB]
        ↓
    Retrieved Docs:
    - "OOMKilled means pod exceeded memory limit..."
    - "To fix: increase memory limit in deployment..."
    - "Common causes: memory leaks, undersized limits..."
        ↓
    [3. Augment Prompt]
        ↓
    Prompt = "Based on these docs: [retrieved docs]
              Answer: How do I fix OOMKilled pods?"
        ↓
    [4. Generate Answer]
        ↓
    LLM: "OOMKilled occurs when your pod exceeds its memory limit.
          Based on our docs, you should:
          1. Increase memory limit in deployment
          2. Check for memory leaks
          ..."
```

---

## 🧩 **Components of RAG**

### **1. Document Store**

Where you keep your knowledge base:
- Company runbooks
- K8s troubleshooting guides
- Internal documentation
- Support tickets (historical)
- Configuration examples

**Storage options**:
- Files (PDF, Markdown, HTML)
- Databases (PostgreSQL, MongoDB)
- Cloud storage (S3, Google Drive)

### **2. Embeddings**

Convert text into vectors for semantic search.

```python
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings()

# Convert text to vector
doc_text = "Pods with OOMKilled status need increased memory limits"
doc_vector = embeddings.embed_query(doc_text)

print(doc_vector[:5])  # [0.234, -0.512, 0.891, -0.123, 0.456, ...]
print(len(doc_vector))  # 1536 dimensions
```

**Key concept**: Similar texts → similar vectors

```python
# These will have similar vectors:
"Pod is out of memory" → [0.23, -0.51, 0.89, ...]
"Container exceeded memory limit" → [0.25, -0.49, 0.87, ...]

# These will have different vectors:
"Pod is out of memory" → [0.23, -0.51, 0.89, ...]
"Image pull failed" → [-0.61, 0.82, -0.34, ...]
```

### **3. Vector Database**

Stores embeddings and enables fast similarity search.

**Popular options**:
- **Chroma** (local, open-source) ⭐ Best for demos
- **Pinecone** (managed, scalable)
- **Weaviate** (open-source, production-ready)
- **Qdrant** (high-performance)
- **FAISS** (Facebook AI, local)

### **4. Retriever**

Finds relevant documents for a query.

```python
from langchain.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# Create vector store
vectorstore = Chroma(
    embedding_function=OpenAIEmbeddings(),
    persist_directory="./chroma_db"
)

# Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3}  # Return top 3 most relevant docs
)

# Search
query = "Pod is OOMKilled"
relevant_docs = retriever.get_relevant_documents(query)

for doc in relevant_docs:
    print(doc.page_content)
```

### **5. Generator**

LLM that generates the final answer.

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4", temperature=0.0)
```

---

## 🔨 **Building a RAG System**

### **Step 1: Load Documents**

```python
from langchain.document_loaders import DirectoryLoader, TextLoader

# Load all markdown files from a directory
loader = DirectoryLoader(
    "./runbooks",
    glob="**/*.md",
    loader_cls=TextLoader
)

documents = loader.load()
print(f"Loaded {len(documents)} documents")
```

### **Step 2: Split Documents**

Break large documents into chunks (LLMs have token limits).

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,  # 1000 characters per chunk
    chunk_overlap=200,  # 200 character overlap between chunks
    length_function=len
)

chunks = text_splitter.split_documents(documents)
print(f"Split into {len(chunks)} chunks")
```

**Why overlap?**: Prevents cutting in the middle of important context.

### **Step 3: Create Embeddings & Vector Store**

```python
from langchain.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

# Create embeddings
embeddings = OpenAIEmbeddings()

# Create vector store
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

print("Vector store created!")
```

### **Step 4: Create Retriever**

```python
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}  # Return top 5 chunks
)
```

### **Step 5: Create RAG Chain**

```python
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4", temperature=0.0)

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",  # "stuff" all docs into prompt
    retriever=retriever,
    return_source_documents=True  # Show which docs were used
)
```

### **Step 6: Use It!**

```python
query = "How do I fix a pod that's OOMKilled?"

result = qa_chain.invoke({"query": query})

print("Answer:")
print(result["result"])

print("\nSource Documents:")
for i, doc in enumerate(result["source_documents"], 1):
    print(f"\n{i}. {doc.page_content[:200]}...")
```

---

## 🔧 **Complete RAG Example**

```python
from langchain.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA

# 1. Load documents
loader = DirectoryLoader(
    "./k8s_runbooks",
    glob="**/*.md",
    loader_cls=TextLoader
)
documents = loader.load()

# 2. Split into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
chunks = text_splitter.split_documents(documents)

# 3. Create vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# 4. Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# 5. Create RAG chain
llm = ChatOpenAI(model="gpt-4", temperature=0.0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever,
    return_source_documents=True
)

# 6. Query
result = qa_chain.invoke({
    "query": "Pod is stuck in ImagePullBackOff. How do I fix it?"
})

print(result["result"])
```

---

## 🆚 **RAG vs ReAct Agents**

### **RAG (Retrieval-Augmented Generation)**

**Best for**:
- ✅ Large knowledge bases (100+ documents)
- ✅ Static information (docs, policies, guides)
- ✅ Questions that need context from docs
- ✅ Citing sources

**Not good for**:
- ❌ Real-time data (cluster state)
- ❌ Actions (can't run kubectl)
- ❌ Multi-step reasoning with tools

**Example**:
```
User: "What's our company policy on resource limits?"
RAG: [Retrieves policy doc] "According to the policy, all pods must have limits..."
```

### **ReAct Agents**

**Best for**:
- ✅ Real-time data (kubectl commands)
- ✅ Actions (restart pod, check logs)
- ✅ Multi-step troubleshooting
- ✅ Tool calling

**Not good for**:
- ❌ Large knowledge bases (can't fit in context)
- ❌ Document-heavy questions

**Example**:
```
User: "Why is pod nginx-abc crashing?"
Agent: [Calls GetPodStatus] [Calls GetPodLogs] "Pod is crashing because..."
```

### **RAG + Agents (Best of Both)**

Combine them for powerful system:

```python
# RAG tool for documentation
@tool
def search_runbooks(query: str) -> str:
    """Search K8s troubleshooting runbooks.
    
    Use this when you need information from documentation,
    policies, or historical troubleshooting guides.
    """
    result = qa_chain.invoke({"query": query})
    return result["result"]

# Agent with RAG + kubectl tools
tools = [
    get_pod_status,
    get_pod_logs,
    describe_pod,
    search_runbooks  # ⭐ RAG as a tool!
]

agent = create_react_agent(llm, tools, prompt)
```

**Example flow**:
```
User: "Pod is OOMKilled. What should I do?"

Agent Thought: "I should check runbooks for OOMKilled guidance"
Agent Action: search_runbooks("OOMKilled pod fix")
Observation: "Runbook says to check memory limits and usage..."

Agent Thought: "Now let me check this pod's actual memory limit"
Agent Action: CheckResources(pod_name="nginx-abc")
Observation: "Memory limit: 128Mi, usage at crash: 145Mi"

Agent Final Answer: "Based on runbook and current pod state, 
increase memory limit from 128Mi to 256Mi"
```

---

## 🎯 **For Your K8s Agent**

### **Version 1 (Demo): Skip RAG** ⭐

**Why**:
- ✅ ReAct with kubectl tools is sufficient for live troubleshooting
- ✅ Simpler architecture (faster to build)
- ✅ No need for document ingestion pipeline
- ✅ Can always add RAG later

**Use ReAct agent with tools**:
- GetPodStatus
- GetPodLogs
- DescribePod
- CheckResources
- AnalyzeErrors

### **Version 2 (Production): Add RAG**

**When to add**:
- ✅ Have large runbook library (50+ docs)
- ✅ Historical troubleshooting data
- ✅ Company-specific policies
- ✅ Want to cite sources

**Architecture**:
```
User Query
    ↓
ReAct Agent
    ├─ Kubectl Tools (get real cluster data)
    ├─ RAG Tool (search runbooks)
    └─ Analysis Tools
    ↓
Comprehensive Answer (live data + documented knowledge)
```

---

## 📊 **RAG Best Practices**

### **1. Chunk Size Matters**

```python
# Too small: Loses context
text_splitter = RecursiveCharacterTextSplitter(chunk_size=100)  ❌

# Too large: Exceeds token limits
text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000)  ❌

# Just right: 500-1500 characters
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)  ✅
```

### **2. Use Metadata**

```python
from langchain.schema import Document

# Add metadata to documents
doc = Document(
    page_content="OOMKilled means pod exceeded memory limit...",
    metadata={
        "source": "k8s-troubleshooting-guide.md",
        "section": "Memory Issues",
        "category": "OOM",
        "last_updated": "2025-01-01"
    }
)

# Filter by metadata
retriever = vectorstore.as_retriever(
    search_kwargs={
        "k": 5,
        "filter": {"category": "OOM"}  # Only search OOM docs
    }
)
```

### **3. Rerank Results**

Not all retrieved docs are equally relevant:

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

# Base retriever
base_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# Compressor (reranks using LLM)
compressor = LLMChainExtractor.from_llm(llm)

# Compression retriever
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=base_retriever
)

# Returns only most relevant chunks
docs = compression_retriever.get_relevant_documents(query)
```

### **4. Monitor Retrieval Quality**

```python
def evaluate_retrieval(query: str, expected_doc_ids: list):
    """Check if retriever finds expected documents"""
    retrieved = retriever.get_relevant_documents(query)
    retrieved_ids = [doc.metadata["id"] for doc in retrieved]
    
    # Calculate recall
    found = len(set(expected_doc_ids) & set(retrieved_ids))
    recall = found / len(expected_doc_ids)
    
    print(f"Recall: {recall:.2%}")
    return recall

# Test
evaluate_retrieval(
    query="OOMKilled pod",
    expected_doc_ids=["doc_memory_001", "doc_oom_guide_002"]
)
```

---

## 🎓 **Self-Check Questions**

### **Question 1**: What problem does RAG solve?

<details>
<summary>Show Answer</summary>

RAG solves the problem of **LLMs not having access to specific/updated knowledge**:

1. **Training data cutoff**: LLMs don't know anything after their training date
2. **No private data**: Can't access your company's internal docs
3. **Hallucinations**: LLMs make up facts they don't know
4. **Limited context**: Can't fit all docs in prompt

**RAG solution**: Retrieve relevant docs from knowledge base → Augment prompt → Generate answer based on actual docs

**Example**:
- Without RAG: "I don't know your company's K8s policy"
- With RAG: [Retrieves policy doc] "According to your policy..."

</details>

### **Question 2**: What are the 5 components of a RAG system?

<details>
<summary>Show Answer</summary>

1. **Document Store**: Where knowledge base is kept (files, DB, cloud)
2. **Embeddings**: Convert text to vectors for semantic search
3. **Vector Database**: Store embeddings, enable fast similarity search (Chroma, Pinecone)
4. **Retriever**: Find relevant documents for a query
5. **Generator**: LLM that generates final answer using retrieved docs

**Flow**:
```
Query → Embed → Search Vector DB → Retrieve Docs → Generate Answer
```

</details>

### **Question 3**: When should you use RAG vs ReAct agents?

<details>
<summary>Show Answer</summary>

**Use RAG when**:
- ✅ Large knowledge base (100+ docs)
- ✅ Static information (policies, guides, runbooks)
- ✅ Need to cite sources
- ❌ But can't take actions or get real-time data

**Use ReAct agents when**:
- ✅ Need real-time data (kubectl commands)
- ✅ Need to take actions (restart pod, scale deployment)
- ✅ Multi-step troubleshooting
- ❌ But don't have large document collection

**Use BOTH when**:
- ✅ Need real-time troubleshooting + documented knowledge
- ✅ Make RAG a tool that agent can call

**Your K8s agent v1**: ReAct only (sufficient for live troubleshooting)  
**Your K8s agent v2**: ReAct + RAG tool (adds runbook knowledge)

</details>

### **Question 4**: Why is chunk overlap important in document splitting?

<details>
<summary>Show Answer</summary>

**Without overlap**:
```
Chunk 1: "...pods with memory limits. OOM"
Chunk 2: "Killed pods need increased limits..."
```
→ Splits "OOMKilled" across chunks, loses context!

**With overlap (200 chars)**:
```
Chunk 1: "...pods with memory limits. OOMKilled pods need increased..."
Chunk 2: "...OOMKilled pods need increased limits..."
```
→ Both chunks have full context!

**Best practice**: chunk_overlap = 20% of chunk_size
```python
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200  # 20% overlap
)
```

</details>

### **Question 5**: How would you add RAG as a tool in your K8s agent?

<details>
<summary>Show Answer</summary>

```python
from langchain.tools import tool
from langchain.chains import RetrievalQA
from langchain.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# 1. Create RAG chain
vectorstore = Chroma(
    embedding_function=OpenAIEmbeddings(),
    persist_directory="./runbooks_db"
)

qa_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4", temperature=0.0),
    retriever=vectorstore.as_retriever(search_kwargs={"k": 3})
)

# 2. Wrap RAG as a tool
@tool
def search_runbooks(query: str) -> str:
    """Search Kubernetes troubleshooting runbooks and documentation.
    
    Use this tool when you need information about:
    - Company policies and best practices
    - Historical troubleshooting procedures
    - Common error patterns and solutions
    - Configuration examples
    
    Do NOT use for real-time cluster data - use kubectl tools instead.
    
    Args:
        query: What to search for in runbooks
        
    Returns:
        Relevant information from documentation
    """
    result = qa_chain.invoke({"query": query})
    return result["result"]

# 3. Add to agent tools
tools = [
    get_pod_status,      # Real-time data
    get_pod_logs,        # Real-time data
    describe_pod,        # Real-time data
    search_runbooks      # ⭐ RAG tool for documentation
]

# 4. Create agent
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools)

# 5. Agent can now use both!
result = agent_executor.invoke({
    "input": "Pod is OOMKilled. What does our runbook say?"
})
```

**Agent flow**:
1. Calls `search_runbooks("OOMKilled")` → Gets documented solution
2. Calls `check_resources(pod_name)` → Gets actual pod limits
3. Combines both → Gives answer based on runbook + real data

</details>

---

## 🚀 **Key Takeaways**

1. **RAG = Retrieval + Augmentation + Generation**: Gives LLMs access to knowledge bases
2. **Vector databases enable semantic search**: Similar text → similar vectors
3. **RAG is for static knowledge**: Docs, policies, runbooks
4. **ReAct agents are for real-time data**: kubectl, APIs, actions
5. **Combine RAG + Agents**: Make RAG a tool the agent can call
6. **For your K8s agent v1**: Skip RAG (ReAct is sufficient)
7. **For production v2**: Add RAG for runbook knowledge

---

## 🔗 **Next Module**

Move on to **Module 11: Error Handling & Production Patterns** to learn how to build robust production systems!

---

**Time to complete this module**: 45 minutes  
**Hands-on practice**: 30 minutes  
**Total**: ~1 hour 15 minutes
