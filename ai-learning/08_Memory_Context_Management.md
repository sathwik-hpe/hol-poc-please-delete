# Module 8: Memory Types & Context Management

**Study Time**: ~45 minutes  
**Prerequisites**: Module 7 (LangChain Components)

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. Why memory is critical for conversational agents
2. Different memory types and when to use each
3. How to manage token limits with memory
4. Best practices for production memory management
5. How to choose the right memory for your K8s agent

---

## 🧠 **Why Memory Matters**

### **Without Memory**

```python
agent = AgentExecutor(agent=agent, tools=tools)  # No memory

# Conversation 1
user: "Check pod nginx-abc status"
agent: [calls GetPodStatus] "Pod is CrashLoopBackOff"

# Conversation 2
user: "What are the logs?"
agent: "What pod? Please specify pod name."  ❌
```

**Problem**: Agent has amnesia - doesn't remember we're talking about `nginx-abc`.

### **With Memory**

```python
memory = ConversationBufferWindowMemory(k=10)
agent = AgentExecutor(agent=agent, tools=tools, memory=memory)

# Conversation 1
user: "Check pod nginx-abc status"
agent: [calls GetPodStatus] "Pod is CrashLoopBackOff"

# Conversation 2
user: "What are the logs?"
agent: [calls GetPodLogs for nginx-abc] "Error: Config file not found" ✅
```

**Benefit**: Agent remembers context from previous messages.

---

## 📚 **Memory Types Overview**

| Memory Type | Storage Strategy | Token Usage | Best For |
|-------------|------------------|-------------|----------|
| **BufferMemory** | All messages | Grows unbounded | Demos, short sessions |
| **BufferWindowMemory** ⭐ | Last N messages | Fixed, predictable | Your K8s agent |
| **SummaryMemory** | Summarized history | Low, but extra LLM calls | Long sessions |
| **SummaryBufferMemory** | Hybrid: recent + summary | Efficient | Production at scale |
| **EntityMemory** | Key facts about entities | Very efficient | Customer service |
| **VectorStoreMemory** | Semantic search | Flexible | Large knowledge bases |

---

## 1️⃣ **ConversationBufferMemory**

### **How It Works**

Stores **all** messages in order.

```python
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory()

# Message 1
memory.save_context(
    {"input": "Check pod nginx-abc"},
    {"output": "Pod is Running"}
)

# Message 2
memory.save_context(
    {"input": "What are the logs?"},
    {"output": "No errors found"}
)

# View history
print(memory.load_memory_variables({}))
```

**Output**:
```
{
  "history": """
  Human: Check pod nginx-abc
  AI: Pod is Running
  Human: What are the logs?
  AI: No errors found
  """
}
```

### **Pros & Cons**

✅ **Pros**:
- Simple to understand
- Complete conversation history
- No information loss

❌ **Cons**:
- **Token overflow**: Long conversations exceed context window
- **Cost**: More tokens = more expensive
- **Performance**: Large history slows down responses

### **When to Use**

- ✅ Short demos (5-10 exchanges)
- ✅ Testing and debugging
- ❌ Production (risk of token overflow)
- ❌ Long troubleshooting sessions

### **Example**

```python
from langchain.agents import AgentExecutor
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True  # Return as Message objects
)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    verbose=True
)

# Use it
result = agent_executor.invoke({"input": "Check pod nginx-abc"})
# Memory stores: "Human: Check pod nginx-abc\nAI: [response]"
```

---

## 2️⃣ **ConversationBufferWindowMemory** ⭐

### **How It Works**

Stores only the **last N exchanges** (sliding window).

```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=3  # Keep only last 3 exchanges
)

# Exchanges 1-3 (all stored)
memory.save_context({"input": "Check pod nginx-abc"}, {"output": "Running"})
memory.save_context({"input": "Check pod redis-xyz"}, {"output": "Crashing"})
memory.save_context({"input": "What are redis logs?"}, {"output": "OOMKilled"})

# Exchange 4 (oldest is dropped)
memory.save_context({"input": "How to fix?"}, {"output": "Increase memory"})

# View memory (only last 3)
print(memory.load_memory_variables({}))
```

**Output**:
```
{
  "history": """
  Human: Check pod redis-xyz
  AI: Crashing
  Human: What are redis logs?
  AI: OOMKilled
  Human: How to fix?
  AI: Increase memory
  """
}
```

**Note**: First exchange ("Check pod nginx-abc") is dropped!

### **Pros & Cons**

✅ **Pros**:
- **Fixed token usage**: Never exceeds context window
- **Predictable**: Always uses exactly N exchanges
- **Simple**: Easy to reason about
- **Cost-effective**: Caps token usage

❌ **Cons**:
- **Loses old context**: Early conversation is forgotten
- **No long-term memory**: Can't remember things from 20 messages ago

### **When to Use**

- ✅ **Your K8s agent** (perfect for debugging sessions)
- ✅ Multi-turn troubleshooting (5-15 exchanges)
- ✅ Production with moderate sessions
- ❌ Very long sessions where early context matters

### **Choosing k (Window Size)**

```python
# Small window (k=5): 5 exchanges = 10 messages
# - User asks 5 questions
# - Agent responds 5 times
# - Total: 10 messages stored

# Medium window (k=10): 10 exchanges = 20 messages
# - Good balance for most use cases
# ⭐ Recommended for your K8s agent

# Large window (k=20): 20 exchanges = 40 messages
# - For complex multi-step debugging
# - Watch out for token limits (especially with long tool outputs)
```

**Best Practice**: Start with `k=10`, adjust based on your use case.

### **Example for K8s Agent**

```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=10,  # Last 10 exchanges (20 messages)
    memory_key="chat_history",
    return_messages=True,
    input_key="input",  # Key for user input in invoke()
    output_key="output"  # Key for agent output
)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    max_iterations=5
)

# Conversation
result1 = agent_executor.invoke({"input": "Check pod nginx-abc"})
# Memory: [User: "Check pod nginx-abc", AI: "Running"]

result2 = agent_executor.invoke({"input": "What are the logs?"})
# Memory: [User: "Check pod nginx-abc", AI: "Running", 
#          User: "What are the logs?", AI: "[logs]"]
# Agent knows we're talking about nginx-abc!
```

---

## 3️⃣ **ConversationSummaryMemory**

### **How It Works**

Uses an LLM to **summarize** old messages, keeping only the summary.

```python
from langchain.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(temperature=0.0)

memory = ConversationSummaryMemory(
    llm=llm,  # LLM creates summaries
    memory_key="chat_history"
)

# Long conversation
memory.save_context(
    {"input": "Check pod nginx-abc status"},
    {"output": "Pod nginx-abc is in CrashLoopBackOff state. Exit code 1."}
)
memory.save_context(
    {"input": "What are the logs?"},
    {"output": "Logs show: Error: Cannot connect to database at db-service:5432"}
)
memory.save_context(
    {"input": "Is the database pod running?"},
    {"output": "Yes, database pod is Running and healthy."}
)

# View memory (summarized)
print(memory.load_memory_variables({}))
```

**Output** (summarized by LLM):
```
{
  "history": "User is troubleshooting pod nginx-abc which is crashing due to 
  inability to connect to database at db-service:5432. Database pod itself 
  is healthy and running."
}
```

### **Pros & Cons**

✅ **Pros**:
- **Token efficient**: Summary is much shorter than full history
- **Retains key info**: Important details preserved
- **No context window overflow**: Can handle very long sessions

❌ **Cons**:
- **Extra LLM calls**: Every save_context calls LLM (costs money, slower)
- **Information loss**: Summary might miss nuances
- **Less predictable**: Summary quality varies

### **When to Use**

- ✅ Very long sessions (50+ exchanges)
- ✅ When token budget is critical
- ❌ Your K8s agent (BufferWindow is simpler and sufficient)
- ❌ When you need exact message history

### **Example**

```python
from langchain.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(temperature=0.0)

memory = ConversationSummaryMemory(
    llm=llm,
    memory_key="chat_history",
    return_messages=True
)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory
)

# Use it (LLM automatically summarizes after each exchange)
result = agent_executor.invoke({"input": "Check pod nginx-abc"})
```

---

## 4️⃣ **ConversationSummaryBufferMemory**

### **How It Works**

Hybrid approach: Keep recent messages verbatim + summarize older ones.

```python
from langchain.memory import ConversationSummaryBufferMemory
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(temperature=0.0)

memory = ConversationSummaryBufferMemory(
    llm=llm,
    max_token_limit=200,  # When history exceeds 200 tokens, summarize oldest
    memory_key="chat_history"
)

# Messages 1-5 (under 200 tokens, kept verbatim)
for i in range(5):
    memory.save_context(
        {"input": f"Question {i}"},
        {"output": f"Answer {i}"}
    )

# Message 6 (exceeds 200 tokens)
# → Oldest messages summarized, recent ones kept verbatim
memory.save_context(
    {"input": "Question 6"},
    {"output": "Answer 6"}
)
```

**Memory contents**:
```
Summary: "User asked questions 1-3 about pod status. Agent confirmed pods are running."
Human: Question 4
AI: Answer 4
Human: Question 5
AI: Answer 5
Human: Question 6
AI: Answer 6
```

### **Pros & Cons**

✅ **Pros**:
- **Best of both worlds**: Recent context verbatim, old context summarized
- **Token efficient**: Doesn't overflow
- **Retains recent details**: Last N messages are exact

❌ **Cons**:
- **Most complex**: Harder to understand and debug
- **Extra LLM calls**: For summarization (costs money)
- **Overkill for simple use cases**

### **When to Use**

- ✅ Production at scale (thousands of users, long sessions)
- ✅ Customer service bots (need full history)
- ❌ Your K8s agent demo (BufferWindow is sufficient)

---

## 🎯 **Choosing Memory for Your K8s Agent**

### **Recommendation: ConversationBufferWindowMemory** ⭐

```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=10,  # Last 10 exchanges (20 messages)
    memory_key="chat_history",
    return_messages=True
)
```

### **Why?**

1. **Debugging sessions are short**: Typical troubleshooting is 5-15 exchanges
2. **Need recent context**: "What are the logs?" requires remembering which pod
3. **Predictable**: Fixed token usage, won't overflow
4. **Simple**: Easy to understand and debug
5. **No extra LLM calls**: Unlike SummaryMemory (no added cost/latency)

### **Interview Answer**

*"I chose ConversationBufferWindowMemory with k=10 for my K8s agent because:*

1. *Debugging sessions typically involve 5-15 exchanges, so a window of 10 is sufficient*
2. *It prevents token overflow while maintaining recent context*
3. *Fixed token usage makes performance predictable*
4. *Simpler than SummaryMemory (no extra LLM calls)*
5. *If I needed to support longer sessions in production, I'd upgrade to SummaryBufferMemory"*

---

## 🔧 **Advanced Memory Patterns**

### **Pattern 1: Separate Memory per Session**

```python
from uuid import uuid4

# Store memories per user session
session_memories = {}

def get_or_create_memory(session_id: str):
    if session_id not in session_memories:
        session_memories[session_id] = ConversationBufferWindowMemory(k=10)
    return session_memories[session_id]

# Use it
session_id = str(uuid4())  # Generate for new user
memory = get_or_create_memory(session_id)

agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory)
```

### **Pattern 2: Custom Memory with Redis**

```python
import redis
import json

class RedisMemory:
    def __init__(self, session_id: str, redis_client):
        self.session_id = session_id
        self.redis = redis_client
        self.memory_key = f"memory:{session_id}"
        
    def save_context(self, inputs, outputs):
        # Load existing history
        history = self.load_memory_variables({}).get("history", [])
        
        # Append new message
        history.append({"human": inputs["input"], "ai": outputs["output"]})
        
        # Keep only last 10
        history = history[-10:]
        
        # Save to Redis
        self.redis.set(self.memory_key, json.dumps(history))
        
    def load_memory_variables(self, inputs):
        # Load from Redis
        data = self.redis.get(self.memory_key)
        if data:
            history = json.loads(data)
            formatted = "\n".join([
                f"Human: {msg['human']}\nAI: {msg['ai']}"
                for msg in history
            ])
            return {"history": formatted}
        return {"history": ""}

# Use it
redis_client = redis.Redis(host='localhost', port=6379)
memory = RedisMemory(session_id="user123", redis_client=redis_client)
```

### **Pattern 3: Memory with Context Reset**

```python
class ResettableMemory:
    def __init__(self, k=10):
        self.memory = ConversationBufferWindowMemory(k=k)
        
    def clear(self):
        """Reset memory when switching topics"""
        self.memory.clear()
        
    def invoke_with_reset_check(self, agent_executor, user_input):
        # Check if user wants to change topic
        if "new pod" in user_input.lower() or "different pod" in user_input.lower():
            print("Detected topic change, clearing memory...")
            self.clear()
            
        return agent_executor.invoke({"input": user_input})

# Use it
memory_manager = ResettableMemory(k=10)
agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory_manager.memory)

# User switches pods
result = memory_manager.invoke_with_reset_check(
    agent_executor,
    "Now check a different pod: redis-xyz"
)
```

---

## 📊 **Token Management**

### **Calculating Memory Token Usage**

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Count tokens in text"""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

# Check memory size
memory_text = memory.load_memory_variables({})["history"]
tokens = count_tokens(memory_text)

print(f"Current memory: {tokens} tokens")

# Warn if approaching limit
if tokens > 6000:  # GPT-4 has 8K context
    print("⚠️ Memory approaching token limit!")
```

### **Managing Token Overflow**

```python
class TokenAwareMemory:
    def __init__(self, max_tokens=2000, model="gpt-4"):
        self.max_tokens = max_tokens
        self.model = model
        self.memory = ConversationBufferMemory()
        
    def save_context(self, inputs, outputs):
        # Save to memory
        self.memory.save_context(inputs, outputs)
        
        # Check token count
        history = self.memory.load_memory_variables({})["history"]
        tokens = count_tokens(history, self.model)
        
        # If exceeds max, trim oldest messages
        if tokens > self.max_tokens:
            print(f"Memory exceeded {self.max_tokens} tokens, trimming...")
            # Switch to window memory or summarize
            self._trim_memory()
            
    def _trim_memory(self):
        # Implementation: Remove oldest messages
        pass
```

---

## 🎓 **Self-Check Questions**

### **Question 1**: What's the key difference between BufferMemory and BufferWindowMemory?

<details>
<summary>Show Answer</summary>

**ConversationBufferMemory**:
- Stores ALL messages
- Token usage grows unbounded
- Can overflow context window in long conversations

**ConversationBufferWindowMemory**:
- Stores only last `k` exchanges (sliding window)
- Fixed token usage (predictable)
- Loses old context but prevents overflow

**Example**:
```python
# BufferMemory: Stores all 100 exchanges (might overflow!)
buffer = ConversationBufferMemory()

# BufferWindowMemory: Stores only last 10 exchanges (safe)
window = ConversationBufferWindowMemory(k=10)
```

**For your K8s agent**: Use BufferWindowMemory with k=10.

</details>

### **Question 2**: When would you use ConversationSummaryMemory?

<details>
<summary>Show Answer</summary>

**Use ConversationSummaryMemory when**:
- ✅ Very long sessions (50+ exchanges)
- ✅ Token budget is critical
- ✅ Need to retain key facts from old messages
- ✅ Willing to accept extra LLM calls for summarization

**Don't use when**:
- ❌ Short sessions (BufferWindow is simpler)
- ❌ Need exact message history
- ❌ Want to minimize LLM calls (each save triggers summarization)

**For your K8s agent**: BufferWindowMemory is sufficient since debugging sessions are typically short (5-15 exchanges).

</details>

### **Question 3**: Why is k=10 a good choice for BufferWindowMemory in a K8s agent?

<details>
<summary>Show Answer</summary>

**k=10 means**:
- Last 10 exchanges
- = 20 total messages (10 user + 10 agent)
- ≈ 2000-3000 tokens (depending on message length)

**Why it's good for K8s troubleshooting**:
1. **Typical debugging flow**: 5-10 exchanges
   - "Check pod status" → "Get logs" → "Describe pod" → "Fix recommendation"
   
2. **Maintains context**: Agent remembers which pod we're discussing

3. **Won't overflow**: Even with long tool outputs, stays under context window

4. **Efficient**: Not storing unnecessary old context

**If sessions were longer**: Use k=20 or upgrade to SummaryBufferMemory.

</details>

### **Question 4**: What happens if you don't use any memory with an agent?

<details>
<summary>Show Answer</summary>

**Without memory**:

```python
agent_executor = AgentExecutor(agent=agent, tools=tools)  # No memory

# Exchange 1
user: "Check pod nginx-abc"
agent: "Pod is Running" ✅

# Exchange 2
user: "What are the logs?"
agent: "Which pod? Please specify." ❌  <-- Forgot nginx-abc!
```

**Problems**:
- Agent has no context from previous messages
- User must repeat information every time
- Poor user experience
- Can't do multi-turn debugging

**Solution**: Always add memory for conversational agents.

```python
memory = ConversationBufferWindowMemory(k=10)
agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory)
```

</details>

### **Question 5**: How would you clear memory when a user wants to troubleshoot a different pod?

<details>
<summary>Show Answer</summary>

**Option 1: Manual clear**
```python
memory.clear()  # Wipes all history

# Now start fresh with new pod
result = agent_executor.invoke({"input": "Check pod redis-xyz"})
```

**Option 2: Detect topic change**
```python
def invoke_with_topic_detection(user_input):
    # Keywords suggesting new topic
    if any(word in user_input.lower() for word in ["new pod", "different pod", "switch to"]):
        print("Detected new topic, clearing memory...")
        memory.clear()
    
    return agent_executor.invoke({"input": user_input})

# Use it
result = invoke_with_topic_detection("Now check a different pod: redis-xyz")
```

**Option 3: Explicit reset command**
```python
if user_input.strip() == "/reset":
    memory.clear()
    return "Memory cleared. Ready for new topic!"

result = agent_executor.invoke({"input": user_input})
```

**Best practice**: Make it explicit - add a "clear history" button or command.

</details>

---

## 🚀 **Key Takeaways**

1. **Memory is essential**: Enables multi-turn conversations
2. **BufferWindowMemory is best**: For your K8s agent (k=10)
3. **Fixed window prevents overflow**: Predictable token usage
4. **SummaryMemory for long sessions**: But adds complexity and cost
5. **Monitor token usage**: Especially with long tool outputs
6. **Clear memory when switching topics**: Better user experience
7. **Use return_messages=True**: For better integration with agents

---

## 🔗 **Next Module**

Move on to **Module 9: Output Parsers & Structured Outputs** to learn how to get consistent, parseable responses!

---

**Time to complete this module**: 45 minutes  
**Hands-on practice**: 20 minutes  
**Total**: ~1 hour
