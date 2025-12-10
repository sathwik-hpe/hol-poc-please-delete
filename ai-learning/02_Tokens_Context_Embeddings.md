# Module 2: Tokens, Context Windows, and Embeddings

**Time:** 45 minutes  
**Goal:** Deep dive into tokens, understand context management, and learn about embeddings

---

## 🎫 **Tokens: The Currency of LLMs**

### **What Exactly is a Token?**

```
Token = Smallest unit an LLM processes

NOT always a word!

Examples:
"Hello" → 1 token
"Hello world" → 2 tokens  ["Hello", " world"]
"don't" → 2 tokens  ["don", "'t"]
"Kubernetes" → 1 token  ["Kubernetes"]
"kubectl" → 2 tokens  ["k", "ubectl"]
"GPT-4" → 2 tokens  ["G", "PT-4"]
"<|endoftext|>" → 1 special token

Why weird splits?
- Tokenizer trained on common patterns
- Common words = 1 token
- Rare words = multiple tokens
- Keeps vocabulary manageable (~50K tokens)
```

### **Counting Tokens**

```python
# Using tiktoken (OpenAI's tokenizer)
import tiktoken

encoder = tiktoken.encoding_for_model("gpt-4")

text = "Why is my Kubernetes pod failing?"
tokens = encoder.encode(text)
print(f"Tokens: {tokens}")
print(f"Count: {len(tokens)}")

# Output:
# Tokens: [10445, 374, 856, 39195, 7661, 22109, 30]
# Count: 7 tokens

# Rule of thumb:
# 1 token ≈ 0.75 words (English)
# 100 tokens ≈ 75 words
# 1000 tokens ≈ 750 words or 3-4 paragraphs
```

---

## 🪟 **Context Windows: The Memory Limit**

### **What is a Context Window?**

```
Context Window = Maximum number of tokens LLM can process at once

Includes:
1. System prompt
2. Conversation history
3. Your current question
4. LLM's response (being generated)

Example with 8K token limit:

System prompt: 200 tokens
User message 1: 50 tokens
Assistant reply 1: 100 tokens
User message 2: 50 tokens
Assistant reply 2: 100 tokens
... (conversation continues)
Current question: 100 tokens
---
Total so far: 600 tokens
Remaining: 7,400 tokens for response + future messages
```

### **Model Context Limits**

| Model | Context Window | Typical Use |
|-------|----------------|-------------|
| **GPT-4** | 8K tokens | Standard API calls |
| **GPT-4-32K** | 32K tokens | Long documents |
| **GPT-4-Turbo** | 128K tokens | Very long context |
| **Claude 3** | 200K tokens | Entire codebases |
| **Llama 3 7B** | 8K tokens | Your project (free) |
| **Llama 3 70B** | 8K tokens | Better quality, same limit |

**8K tokens example:**
- ~6,000 words
- ~25 pages of text
- ~300 lines of code
- 20-30 back-and-forth messages

---

## ⚠️ **What Happens When You Hit the Limit?**

### **Problem: Context Overflow**

```
Scenario: Debugging session with your K8s agent

Message 1: "Check nginx pod" (50 tokens)
Reply 1: "Pod is CrashLoopBackOff..." (100 tokens)
Message 2: "Get logs" (10 tokens)
Reply 2: "Error: port 80 in use..." (500 tokens - long logs)
Message 3: "Check other pods" (15 tokens)
Reply 3: "Found 5 pods..." (200 tokens)
... 15 more exchanges ...
Message 20: "What was the original issue?" 

Problem: Message 1-5 exceeded 8K limit!
Result: LLM forgot the original nginx problem!
```

### **Solutions:**

#### **Solution 1: Sliding Window Memory**
```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=10  # Keep only last 10 messages
)

# Automatically drops old messages
# Pros: Simple, predictable
# Cons: Loses important context
```

#### **Solution 2: Summarization**
```python
from langchain.memory import ConversationSummaryMemory

memory = ConversationSummaryMemory(
    llm=llm  # Uses LLM to summarize!
)

# Old messages get condensed:
# Before: "Check nginx → CrashLoopBackOff → Port 80 in use"
# After (summary): "Diagnosed nginx port conflict"

# Pros: Preserves key info
# Cons: Extra LLM calls (cost)
```

#### **Solution 3: Chunk and Process**
```python
# For large inputs (logs, code files)

def process_large_logs(logs):
    # Split into chunks
    chunks = split_into_chunks(logs, chunk_size=2000)
    
    summaries = []
    for chunk in chunks:
        summary = llm.summarize(chunk)
        summaries.append(summary)
    
    # Final analysis on summaries only
    return llm.analyze(summaries)

# 100K token logs → 10 x 2K chunks → 10 x 100 token summaries
# = 1000 tokens to analyze (fits in context!)
```

---

## 🔢 **Embeddings: Numeric Representations of Text**

### **What are Embeddings?**

```
Embedding = A vector (list of numbers) that represents text

Example:
"Kubernetes pod" → [0.2, -0.5, 0.8, ..., 0.1]  (1536 numbers)
"K8s container" → [0.3, -0.4, 0.7, ..., 0.2]  (similar!)
"Pizza recipe" → [-0.9, 0.1, -0.2, ..., 0.5]  (very different!)

Why useful:
- Similar meanings = similar vectors
- Can compute similarity mathematically
- Enables semantic search
```

### **How Embeddings Work**

```
Text → Embedding Model → Vector

Models:
- OpenAI: text-embedding-ada-002 (1536 dimensions)
- Sentence Transformers: all-MiniLM-L6-v2 (384 dimensions)
- Cohere: embed-english-v3.0 (1024 dimensions)

Process:
1. Text: "nginx pod failing"
2. Model converts to: [0.5, -0.2, ...]  # 1536 numbers
3. Store in vector database
4. Later search: "container crash" → find similar vectors
```

### **Practical Example**

```python
from openai import OpenAI

client = OpenAI()

# Create embeddings
text1 = "Kubernetes pod is crashing"
text2 = "Container keeps failing"
text3 = "How to bake cookies"

emb1 = client.embeddings.create(input=text1, model="text-embedding-ada-002")
emb2 = client.embeddings.create(input=text2, model="text-embedding-ada-002")
emb3 = client.embeddings.create(input=text3, model="text-embedding-ada-002")

# Compute similarity (cosine similarity)
similarity_1_2 = cosine_similarity(emb1, emb2)  # ~0.85 (very similar!)
similarity_1_3 = cosine_similarity(emb1, emb3)  # ~0.12 (not similar)

# Use case: Find similar past incidents
# User: "My pod won't start"
# Search embeddings → Find "pod startup failure" from last week
# Retrieve that solution
```

---

## 🎯 **When to Use Embeddings in Your Project**

### **Use Case 1: Semantic Search in Documentation**

```
Problem: You have 1000 pages of K8s docs
User asks: "How do I fix ImagePullBackOff?"

Without embeddings:
- Keyword search for "ImagePullBackOff"
- Might miss docs that say "image pull failure" or "cannot pull container image"

With embeddings:
1. Convert all docs to embeddings (one-time setup)
2. Store in vector database (Chroma, Pinecone)
3. User query → embedding
4. Find most similar doc embeddings
5. Return relevant docs even with different wording!
```

### **Use Case 2: Finding Similar Past Incidents**

```
Problem: Same issues happen repeatedly

Solution:
1. Store all resolved incidents with embeddings
   - Incident 1: "nginx CrashLoopBackOff due to port conflict"
   - Incident 2: "API service OOMKilled, increased memory"
   
2. New incident: "nginx keeps restarting"
   → Find similar embedding → Suggest "Check port conflicts"

This is how chatbots "remember" past conversations semantically!
```

### **Use Case 3: Code Search**

```
User: "Find code that handles pod failures"

Traditional search: grep for "pod" and "failure"
→ Misses code with different variable names

Embedding search:
- Finds semantically similar code
- "container crash handler"
- "k8s restart logic"
- "pod error management"

All related code, even with different keywords!
```

---

## 🏗️ **Vector Databases**

### **What are They?**

```
Vector Database = Database optimized for storing and searching embeddings

Popular options:
- Chroma (free, local, great for learning)
- Pinecone (managed, scalable)
- Weaviate (open-source, production-ready)
- Milvus (high performance)

Why special database?
- Regular DB: Search exact matches (SQL WHERE clause)
- Vector DB: Search similar vectors (nearest neighbor)
```

### **Example with Chroma**

```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings

# 1. Create vector store
vectorstore = Chroma(
    collection_name="k8s_incidents",
    embedding_function=OpenAIEmbeddings()
)

# 2. Add documents
incidents = [
    "nginx pod failing due to port 80 conflict",
    "postgres OOMKilled, need more memory",
    "api service ImagePullBackOff, wrong image tag"
]

vectorstore.add_texts(incidents)

# 3. Search semantically
query = "container memory issue"
results = vectorstore.similarity_search(query, k=2)

# Returns:
# 1. "postgres OOMKilled..." (most similar!)
# 2. "api service ImagePullBackOff..." (less similar)
```

---

## 📊 **Token & Context Management Strategies**

### **Strategy 1: Prompt Compression**

```
Bad prompt (verbose):
"You are a helpful assistant that helps with Kubernetes. You should 
be polite and professional. You have access to kubectl commands. You 
should analyze pod status carefully. If you're not sure, you should 
ask for more information..." (200 tokens!)

Good prompt (concise):
"K8s troubleshooting expert. Use kubectl tools. Be precise." (15 tokens!)

Saved: 185 tokens for actual content!
```

### **Strategy 2: Smart Truncation**

```python
def truncate_logs(logs, max_tokens=1000):
    """Keep most relevant parts of logs"""
    
    # Get last N lines (most recent)
    recent_logs = logs[-50:]
    
    # Extract error lines
    error_logs = [line for line in logs if "error" in line.lower()]
    
    # Combine
    relevant_logs = error_logs + recent_logs
    
    # Truncate to token limit
    return truncate_to_tokens(relevant_logs, max_tokens)

# 100K token logs → 1K token summary
# Fits in context, keeps important info!
```

### **Strategy 3: Hierarchical Processing**

```
For large codebase analysis:

Level 1: Summarize each file (parallel)
  file1.py → "Authentication logic" (50 tokens)
  file2.py → "Database models" (50 tokens)
  file3.py → "API routes" (50 tokens)

Level 2: Combine summaries (150 tokens total)
  → Ask LLM: "Which file likely has the bug?"
  → "file3.py (API routes)"

Level 3: Deep dive only that file
  → Read full file, analyze in detail

Instead of: All files (10K tokens) → Overflow!
We do: Summaries (150 tokens) → Focus (500 tokens) = Fits!
```

---

## 📝 **Self-Check Questions**

1. **How many tokens is "Kubernetes pod is failing"?**
   <details>
   <summary>Answer</summary>
   Approximately 6-7 tokens. "Kubernetes"=1, "pod"=1, "is"=1, "failing"=1, plus spaces. Use tiktoken to count exactly.
   </details>

2. **What happens when you exceed context window?**
   <details>
   <summary>Answer</summary>
   Older messages get truncated/forgotten. LLM cannot see the full conversation history. Need memory management strategies.
   </details>

3. **When would you use embeddings vs direct LLM calls?**
   <details>
   <summary>Answer</summary>
   Embeddings: Semantic search in large document sets, finding similar items. LLM: Generation, reasoning, specific questions.
   </details>

4. **Why use a vector database instead of regular database?**
   <details>
   <summary>Answer</summary>
   Vector DBs are optimized for similarity search (nearest neighbors). Regular DBs only do exact matches. Need special algorithms (HNSW, IVF) for fast vector search.
   </details>

5. **How would you handle 100K token logs in 8K context window?**
   <details>
   <summary>Answer</summary>
   Chunk into smaller pieces, summarize each chunk, analyze summaries. Or extract only error lines and recent logs. Or use embeddings to find relevant sections.
   </details>

---

## 🎓 **Key Takeaways**

✅ Tokens are the atomic unit - 1 token ≈ 0.75 words  
✅ Context windows are hard limits - plan for overflow  
✅ Embeddings convert text to vectors for similarity search  
✅ Vector databases enable semantic search at scale  
✅ Always count tokens before sending to LLM  
✅ Use compression, truncation, chunking for large inputs  

---

## 🚀 **Next Steps**

Can you explain:
- Why token limits matter for conversation agents?
- How embeddings enable semantic search?
- When to use vector databases?

**→ Ready for `03_Prompting_Temperature.md`**
