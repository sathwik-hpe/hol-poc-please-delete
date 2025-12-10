# Module 3: Prompting & Temperature

**Study Time**: ~45 minutes  
**Prerequisites**: Module 1 (LLM Fundamentals)

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. How to write effective prompts that get better results
2. What temperature controls and when to adjust it
3. Other sampling parameters (top_p, top_k, max_tokens)
4. Prompt engineering patterns for different use cases
5. Why prompting matters for your K8s agent

---

## 📝 **What is Prompting?**

**Prompting** is how you communicate with an LLM. It's the art and science of crafting inputs that get the outputs you want.

### **Why It Matters**

The same LLM can give vastly different results based on how you prompt it:

#### **Bad Prompt**
```
User: "Fix my Kubernetes."
LLM: "I need more information. What's wrong with your Kubernetes cluster?"
```

#### **Good Prompt**
```
User: "My pod nginx-deployment-abc123 in namespace production is stuck in 
CrashLoopBackOff state. The logs show 'Error: ECONNREFUSED connecting to 
database at db-service:5432'. How can I troubleshoot this?"

LLM: "The pod can't connect to the database. Let's check:
1. Is the database pod running? Check with: kubectl get pods -l app=database
2. Is the service correctly configured? Check with: kubectl get svc db-service
3. Are the network policies allowing traffic?
..."
```

**Key Difference**: Specificity. Good prompts provide context, constraints, and clear expectations.

---

## 🔥 **Temperature: The Creativity Dial**

### **What is Temperature?**

Temperature controls **randomness** in the LLM's outputs.

- **Range**: 0.0 to 2.0 (typically use 0.0 to 1.0)
- **Low (0.0)**: Deterministic, consistent, factual
- **High (1.0+)**: Creative, varied, unpredictable

### **How It Works (Simplified)**

When predicting the next token, the LLM assigns probabilities:

```
Input: "The capital of France is"

Predictions:
- "Paris" → 95% probability
- "paris" → 3% probability  
- "Lyon" → 1% probability
- "London" → 0.5% probability
- "banana" → 0.01% probability
```

#### **Temperature = 0.0**
Always picks the highest probability token → "Paris"

#### **Temperature = 0.7**
Samples from the distribution, weighted by probabilities → Usually "Paris", sometimes "paris"

#### **Temperature = 1.5**
Flattens probabilities more → Could pick "Lyon" or even "London" sometimes

### **Visual Analogy**

Think of temperature as a slider:

```
0.0 ========|                          1.0
    Robot                          Creative Human
    
- Repeatable                      - Varied
- Factual                         - Imaginative
- Safe                            - Risky
- Boring                          - Interesting
```

---

## 🎚️ **When to Use Different Temperatures**

### **Temperature 0.0 - 0.3: Deterministic**

**Use for**:
- ✅ Code generation (want correct syntax)
- ✅ Data extraction (want accurate parsing)
- ✅ Math/logic problems
- ✅ Tool calling in agents (want consistent tool selection)
- ✅ **Your K8s agent** (want reliable diagnostics)

**Example**:
```python
from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Extract the pod name from: 'Pod nginx-abc123 is failing'"}
    ],
    temperature=0.0  # Want exact extraction
)
# Output: "nginx-abc123" (same every time)
```

### **Temperature 0.4 - 0.7: Balanced**

**Use for**:
- ✅ Chatbots (want varied but reasonable responses)
- ✅ Summaries (want natural language)
- ✅ Explanations (want readability)
- ✅ General Q&A

**Example**:
```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Explain Kubernetes pods to a beginner"}
    ],
    temperature=0.7  # Want natural, engaging explanation
)
```

### **Temperature 0.8 - 1.0: Creative**

**Use for**:
- ✅ Creative writing (stories, marketing copy)
- ✅ Brainstorming (want diverse ideas)
- ✅ Humor generation
- ❌ **NOT for your K8s agent** (too unpredictable)

**Example**:
```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Write a haiku about Kubernetes"}
    ],
    temperature=1.0  # Want creative poetry
)
```

### **Temperature 1.0+: Experimental**

**Use for**:
- ✅ Art projects
- ✅ Exploring unexpected outputs
- ❌ Production systems (too risky)

---

## 🛠️ **Other Sampling Parameters**

### **max_tokens**

Controls the **maximum length** of the response.

```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Explain Kubernetes"}],
    max_tokens=50  # Stop after 50 tokens (~37 words)
)
```

**Use cases**:
- Prevent overly long responses
- Control costs (you pay per token)
- Force concise answers

### **top_p (Nucleus Sampling)**

Alternative to temperature. Samples from the smallest set of tokens whose cumulative probability exceeds `p`.

```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "What is a pod?"}],
    top_p=0.9  # Consider tokens that make up top 90% of probability
)
```

**Comparison**:
- `temperature=0.7` → Adjusts all probabilities
- `top_p=0.9` → Only considers top 90% of tokens, ignores rare ones

**Rule of Thumb**: Use temperature OR top_p, not both.

### **top_k**

Limits sampling to the top `k` most probable tokens.

```python
# Only consider the top 50 most likely tokens
top_k=50
```

**Less common** in modern APIs (OpenAI doesn't expose it). More common with Hugging Face models.

---

## 📚 **Prompt Engineering Patterns**

### **Pattern 1: Zero-Shot Prompting**

Ask the model to do something without examples.

```python
prompt = "Classify this as positive or negative sentiment: 'I love this product!'"
# Output: "Positive"
```

**When to use**: Simple tasks, well-known domains

### **Pattern 2: Few-Shot Prompting**

Provide examples before asking.

```python
prompt = """
Classify sentiment as positive or negative:

Example 1: "Great service!" → Positive
Example 2: "Terrible experience." → Negative
Example 3: "Not what I expected." → Negative

Now classify: "Amazing quality!"
"""
# Output: "Positive"
```

**When to use**: Complex tasks, need specific format, improve accuracy

### **Pattern 3: Chain-of-Thought (CoT)**

Ask the model to think step-by-step.

```python
prompt = """
A pod is crashing. The logs show "OOMKilled". 
Let's diagnose step by step:
1. What does OOMKilled mean?
2. What could cause this?
3. How do we fix it?
"""
```

**Output**:
```
1. OOMKilled means the pod exceeded its memory limit and was killed by the 
   kernel's Out-Of-Memory killer.
2. Causes: Memory leak, underestimated resource limits, traffic spike
3. Fixes: Increase memory limit, find and fix memory leak, add horizontal 
   pod autoscaler
```

**When to use**: Complex reasoning, debugging, multi-step problems

### **Pattern 4: Role Prompting**

Tell the model what role to play.

```python
prompt = """
You are an expert Kubernetes administrator with 10 years of experience.
A junior developer asks: "Why is my pod pending?"

Respond as the expert:
"""
```

**When to use**: Need specific expertise, tone, or perspective

### **Pattern 5: Constrained Output**

Specify the exact format you want.

```python
prompt = """
Extract pod information from this text:
"Pod nginx-abc123 in namespace production is CrashLoopBackOff"

Respond in JSON format:
{
  "pod_name": "...",
  "namespace": "...",
  "status": "..."
}
"""
```

**When to use**: Need structured output for parsing, APIs, downstream systems

---

## 🤖 **Prompting for Your K8s Agent**

### **System Prompt (Define Agent Behavior)**

```python
system_prompt = """
You are a Kubernetes troubleshooting assistant. Your role is to help users 
diagnose and resolve cluster issues.

Guidelines:
- Use the provided tools to gather real cluster data
- Think step-by-step before taking actions
- Always explain your reasoning
- If you don't have enough information, use tools to gather it
- Provide actionable recommendations
- Be concise but thorough

Available tools:
- GetPodStatus: Check if a pod is Running, Pending, CrashLoopBackOff, etc.
- GetPodLogs: Retrieve pod logs for error analysis
- DescribePod: Get detailed pod configuration and events
- AnalyzeErrors: Extract and explain error messages
- CheckResources: Verify CPU/memory limits and usage

Always use tools rather than guessing. If unsure, ask for clarification.
"""
```

**Why this works**:
- ✅ Clear role definition
- ✅ Explicit guidelines
- ✅ Lists available tools
- ✅ Sets expectations (use tools, don't guess)

### **User Query Optimization**

Help users write better queries:

#### **Bad User Query**
```
"Help me with Kubernetes"
```

#### **Good User Query**
```
"Pod nginx-deployment-5678 in namespace production is stuck in CrashLoopBackOff. 
Can you help diagnose why?"
```

**Your agent should handle both**, but better input = better output.

### **Temperature for Agents**

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    temperature=0.0,  # ⭐ Critical for consistent tool calling
    max_iterations=5
)
```

**Why 0.0?**
- ✅ Consistent tool selection (won't randomly pick wrong tool)
- ✅ Reliable reasoning (same input = same output)
- ✅ Easier to debug (reproducible behavior)
- ✅ Safer in production (no surprises)

---

## 🎯 **Practical Examples**

### **Example 1: Bad vs Good Prompting**

#### **Bad**
```python
prompt = "Kubernetes issue"
temperature = 1.5  # Way too high
max_tokens = 10   # Too short
```

**Problems**:
- Too vague (what issue?)
- High temperature makes it unpredictable
- 10 tokens can't give meaningful answer

#### **Good**
```python
prompt = """
You are a K8s expert. Analyze this scenario:

Pod: payment-service-abc123
Namespace: production
Status: CrashLoopBackOff
Recent logs: "Error: Connection timeout to redis-cache:6379"

Step-by-step diagnosis:
"""

temperature = 0.0  # Deterministic
max_tokens = 500   # Enough for thorough answer
```

### **Example 2: Tool Calling with Low Temperature**

```python
from langchain.chat_models import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor

llm = ChatOpenAI(
    model="gpt-4",
    temperature=0.0  # ⭐ Critical for agents
)

agent = create_react_agent(llm, tools, prompt_template)
agent_executor = AgentExecutor(agent=agent, tools=tools)

# This will consistently call the right tools
result = agent_executor.invoke({
    "input": "Why is pod nginx-abc in CrashLoopBackOff?"
})
```

**With temperature=0.0**:
- Run 1: GetPodStatus → GetPodLogs → DescribePod
- Run 2: GetPodStatus → GetPodLogs → DescribePod (same!)

**With temperature=1.0**:
- Run 1: GetPodStatus → GetPodLogs → DescribePod
- Run 2: DescribePod → GetPodStatus → CheckResources (different!)

### **Example 3: Prompt Engineering for Error Analysis**

```python
error_analysis_prompt = """
You are analyzing Kubernetes errors. For each error:
1. Identify the error type
2. Explain the root cause
3. Suggest 2-3 fixes
4. Rank fixes by likelihood of success

Error log:
{log_content}

Analysis:
"""

response = llm.invoke(
    error_analysis_prompt.format(log_content=pod_logs),
    temperature=0.2  # Low but not 0 for slight variation in explanations
)
```

---

## ⚠️ **Common Prompting Mistakes**

### **Mistake 1: Too Vague**

❌ **Bad**: "Fix my app"  
✅ **Good**: "Pod cart-service-xyz is failing with exit code 137 (OOMKilled). Memory limit is 128Mi. How should I fix this?"

### **Mistake 2: Wrong Temperature**

❌ **Bad**: Using temperature=1.0 for tool calling (inconsistent tool selection)  
✅ **Good**: Using temperature=0.0 for agents, 0.7 for explanations

### **Mistake 3: No Context**

❌ **Bad**: "What's wrong?"  
✅ **Good**: "Previous message said pod is Pending. Now checking: kubectl describe pod shows 'Insufficient CPU'. What should I do?"

### **Mistake 4: Ignoring Format**

❌ **Bad**: Expecting JSON but not asking for it  
✅ **Good**: Explicitly stating "Respond in JSON format: {field1: ..., field2: ...}"

### **Mistake 5: Not Testing**

❌ **Bad**: Using same prompt/temperature in production without testing  
✅ **Good**: Testing with multiple examples, adjusting temperature based on results

---

## 🧪 **Hands-On Practice**

### **Exercise 1: Temperature Experiment**

Try this with different temperatures:

```python
from openai import OpenAI
client = OpenAI()

prompt = "List 5 common Kubernetes issues"

for temp in [0.0, 0.5, 1.0]:
    print(f"\n--- Temperature: {temp} ---")
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=temp
    )
    print(response.choices[0].message.content)
```

**Observe**: At 0.0, same output every time. At 1.0, varied outputs.

### **Exercise 2: Prompt Improvement**

Improve this prompt:

❌ **Bad**:
```python
"Help with Kubernetes"
```

✅ **Better**: (You write this!)

<details>
<summary>Show Solution</summary>

```python
"""
I'm troubleshooting a Kubernetes issue:
- Pod name: api-gateway-def456
- Namespace: staging
- Status: ImagePullBackOff
- Error message: "Failed to pull image 'myregistry.io/api:v2.0.1': 
  authentication required"

Please help diagnose:
1. What's causing this?
2. How do I verify the registry credentials?
3. What's the fix?
"""
```

</details>

### **Exercise 3: System Prompt for Agent**

Write a system prompt for your K8s agent. Include:
- Role definition
- Guidelines
- Tool descriptions
- Expected behavior

<details>
<summary>Show Solution</summary>

```python
system_prompt = """
You are an AI-powered Kubernetes troubleshooting assistant with expertise in 
cluster diagnostics and issue resolution.

Your capabilities:
- Analyze pod failures, resource issues, networking problems
- Use kubectl-based tools to gather real cluster data
- Provide step-by-step reasoning for all diagnoses
- Suggest actionable fixes ranked by likelihood of success

Available tools:
1. GetPodStatus(pod_name, namespace): Check pod state (Running, Pending, etc.)
2. GetPodLogs(pod_name, namespace, tail): Retrieve recent logs
3. DescribePod(pod_name, namespace): Get detailed config and events
4. AnalyzeErrors(log_text): Extract and explain errors
5. CheckResources(pod_name, namespace): Verify CPU/memory limits/usage

Guidelines:
- Always use tools to gather data before concluding
- Think step-by-step: observe → hypothesize → verify → conclude
- If stuck, use DescribePod to see events
- Explain your reasoning at each step
- Provide 2-3 potential fixes, ranked by likelihood
- If you need more info, ask specific follow-up questions
- Never guess - if unsure, gather more data with tools

Response format:
1. Current Status: [What you observed]
2. Analysis: [Step-by-step reasoning]
3. Root Cause: [Conclusion]
4. Recommended Fixes: [Actionable steps]
"""
```

</details>

---

## 📊 **Cheat Sheet: Temperature Guide**

| Use Case | Temperature | Why |
|----------|-------------|-----|
| Code generation | 0.0 - 0.2 | Need correct syntax |
| Data extraction | 0.0 - 0.1 | Need accuracy |
| Tool calling (agents) | 0.0 - 0.3 | Need consistency |
| **K8s agent** | **0.0** | **Reliable diagnostics** |
| Explanations | 0.5 - 0.7 | Natural language |
| Chatbots | 0.6 - 0.8 | Varied responses |
| Creative writing | 0.8 - 1.0 | Imagination |
| Brainstorming | 0.7 - 1.0 | Diverse ideas |

---

## 🎓 **Self-Check Questions**

### **Question 1**: What temperature should you use for your K8s troubleshooting agent?

<details>
<summary>Show Answer</summary>

**0.0 or very close to it (0.0-0.2)**

**Why**: You want deterministic, consistent tool calling. If the agent sees the same error twice, it should take the same diagnostic steps. Higher temperature would cause unpredictable behavior (calling different tools, inconsistent reasoning).

</details>

### **Question 2**: When would you use temperature 0.8-1.0?

<details>
<summary>Show Answer</summary>

**Creative tasks**: Writing stories, generating marketing copy, brainstorming ideas, humor generation.

**NOT for**: Code generation, data extraction, troubleshooting, tool calling, production systems.

</details>

### **Question 3**: What's the difference between zero-shot and few-shot prompting?

<details>
<summary>Show Answer</summary>

- **Zero-shot**: Ask the model without providing examples
  - Example: "Classify this sentiment: 'I love it!'"
  
- **Few-shot**: Provide 2-3 examples before asking
  - Example: "Positive: 'Great!' | Negative: 'Terrible.' | Now classify: 'Love it!'"

**When to use few-shot**: Complex tasks, specific formats, need higher accuracy, model struggles with zero-shot.

</details>

### **Question 4**: Write a prompt that would work well with temperature=0.0

<details>
<summary>Show Answer</summary>

```python
"""
Extract the following information from the log entry:
- Timestamp
- Pod name
- Error message

Log entry:
"2025-12-09 14:32:15 [ERROR] Pod nginx-abc123: Connection refused to database"

Respond in JSON format:
{
  "timestamp": "...",
  "pod_name": "...",
  "error_message": "..."
}
"""
```

**Why this works at temp=0.0**: Precise extraction task, structured output, no creativity needed.

</details>

### **Question 5**: Why is it bad to use temperature=1.0 for an agent that calls tools?

<details>
<summary>Show Answer</summary>

**Problems**:
1. **Inconsistent tool selection**: Same error might trigger different tools each time
2. **Unreliable reasoning**: Agent's thought process varies unpredictably
3. **Harder to debug**: Can't reproduce issues
4. **Production risk**: Might call wrong tool, give bad advice
5. **User confusion**: Same question gets different diagnostic approaches

**Example**:
- Run 1 (temp=1.0): GetPodStatus → GetPodLogs → success
- Run 2 (temp=1.0): DescribePod → CheckResources → missed the actual error

With temp=0.0, both runs would take the same path.

</details>

---

## 🚀 **Key Takeaways**

1. **Prompting is critical**: Same model, different prompts = vastly different results
2. **Temperature controls randomness**: 0.0 = deterministic, 1.0 = creative
3. **For agents, use temp=0.0**: Ensures consistent tool calling and reasoning
4. **Provide context**: Better prompts = better outputs
5. **System prompts set behavior**: Define role, guidelines, and expectations
6. **Test different temperatures**: Find what works best for your use case
7. **Use patterns**: Zero-shot, few-shot, CoT, role prompting, constrained output

---

## 🔗 **Next Module**

Move on to **Module 4: Chain-of-Thought vs ReAct** to understand advanced reasoning patterns!

---

**Time to complete this module**: 45 minutes  
**Hands-on practice**: 15-20 minutes  
**Total**: ~1 hour
