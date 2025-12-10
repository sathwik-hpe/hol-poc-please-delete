# Module 4: Chain-of-Thought vs ReAct Pattern

**Time:** 45 minutes  
**Goal:** Understand different reasoning patterns and why ReAct is perfect for your K8s agent

---

## 🧠 **Reasoning Patterns in AI**

### **The Evolution**

```
2018: Direct Prompting
"What's 2+2?" → "4"
Problem: No reasoning, just pattern matching

2022: Chain-of-Thought (CoT)
"What's 2+2? Let's think step by step"
→ "2+2 means adding 2 and 2. That equals 4."
Better: Shows reasoning!

2023: ReAct (Reasoning + Acting)
"What's 2+2? You have a calculator tool."
→ "I should use the calculator. Action: calculate(2+2). Result: 4."
Best: Can use tools to verify!
```

---

## 🔗 **Chain-of-Thought (CoT)**

### **What is CoT?**

```
Chain-of-Thought = Making LLM show its reasoning steps

Without CoT:
User: "Is the pod healthy?"
LLM: "No"

With CoT:
User: "Is the pod healthy? Think step by step."
LLM: "Let me analyze:
1. Check pod status → CrashLoopBackOff
2. This means container is crashing
3. Crashing = not healthy
Therefore: No, the pod is not healthy."

Better because: You can see the reasoning, catch errors
```

### **CoT Patterns**

#### **Pattern 1: Zero-Shot CoT**
```
User: "Why is nginx failing? Let's think step by step."

LLM:
"Step 1: Check if pod is running
Step 2: Look at pod status
Step 3: Check for errors in logs
Step 4: Identify root cause

Without looking at actual data, common causes could be:
- Port conflicts
- Image issues
- Resource limits"

Problem: LLM is GUESSING! No real data!
```

#### **Pattern 2: Few-Shot CoT**
```
User: "Here are examples of good reasoning:

Example 1:
Problem: API pod failing
Reasoning: Check status → CrashLoopBackOff → Check logs → Port 3000 in use → Conclusion: Port conflict

Example 2:
Problem: DB pod failing  
Reasoning: Check status → OOMKilled → Check memory limit → 512Mi → Conclusion: Need more memory

Now analyze: nginx pod failing"

LLM: "Let me follow the same pattern:
Check status → CrashLoopBackOff
Check logs → Error: listen tcp :80: bind: address already in use
Conclusion: Port 80 conflict"

Better! LLM learned the reasoning pattern!
```

---

## ⚛️ **ReAct Pattern (What You're Using!)**

### **What is ReAct?**

```
ReAct = Reasoning + Acting
Combines thinking with actions (tool calling)

Pattern:
Thought → Action → Observation → Thought → Action → ...

Real example:
Thought: "I need to check pod status"
Action: GetPodStatus(namespace="default", pod_name="nginx")
Observation: {"status": "CrashLoopBackOff", "restarts": 15}
Thought: "It's crashing, I should check logs"
Action: GetPodLogs(namespace="default", pod_name="nginx")
Observation: "Error: listen tcp :80: bind: address already in use"
Thought: "Port conflict! I now know the issue"
Final Answer: "nginx is crashing due to port 80 conflict"
```

### **Why ReAct is Better than CoT**

| Aspect | Chain-of-Thought | ReAct |
|--------|------------------|-------|
| **Can it verify facts?** | ❌ No, just reasoning | ✅ Yes, calls tools! |
| **Can it interact with systems?** | ❌ No | ✅ Yes (kubectl, APIs) |
| **Can it get real data?** | ❌ No, uses training data | ✅ Yes, live data |
| **Accuracy** | Medium (might hallucinate) | High (facts from tools) |
| **Use case** | Explaining concepts | Diagnosing real issues |

**For your K8s agent:** ReAct is the ONLY choice! You need real cluster data.

---

## 🔄 **ReAct Loop in Detail**

### **The Full Cycle**

```python
# This is what happens inside the agent

while not finished and iterations < max_iterations:
    # 1. REASONING PHASE
    prompt = f"""
    Question: {user_question}
    
    Tools available:
    - GetPodStatus: Check if pod is running
    - GetPodLogs: Read container logs
    - DescribePod: Get detailed pod info
    
    Previous steps:
    {scratchpad}
    
    What should you do next?
    Format: Thought: ... Action: ... Action Input: ...
    """
    
    response = llm.generate(prompt)
    # "Thought: I need pod status. Action: GetPodStatus. Action Input: nginx"
    
    # 2. PARSE RESPONSE
    thought = extract_thought(response)
    action = extract_action(response)  # "GetPodStatus"
    action_input = extract_input(response)  # "nginx"
    
    # 3. EXECUTION PHASE
    if action == "GetPodStatus":
        observation = get_pod_status_tool(action_input)
    elif action == "GetPodLogs":
        observation = get_pod_logs_tool(action_input)
    # ... other tools
    
    # 4. UPDATE SCRATCHPAD (memory)
    scratchpad += f"\nThought: {thought}"
    scratchpad += f"\nAction: {action}"
    scratchpad += f"\nAction Input: {action_input}"
    scratchpad += f"\nObservation: {observation}"
    
    # 5. CHECK IF DONE
    if "Final Answer:" in response:
        finished = True
        return extract_final_answer(response)
    
    iterations += 1

# Loop continues until agent says "Final Answer" or max iterations
```

---

## 🎯 **ReAct Prompt Template**

### **The System Prompt**

```
You are a Kubernetes troubleshooting expert.

Answer the user's question as best you can. You have access to the following tools:

GetPodStatus: Check if a pod is running, pending, or failed. Input: pod_name
GetPodLogs: Get logs from a pod's container. Input: pod_name
DescribePod: Get detailed information about a pod including events. Input: pod_name
SearchErrors: Search for common error patterns. Input: error_text

Use the following format:

Thought: What do I need to find out?
Action: tool_name
Action Input: input_to_tool
Observation: result from tool
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Final Answer: comprehensive answer to the original question

Begin! Remember to always think before acting.

Question: {user_question}
{agent_scratchpad}
```

### **Example Execution**

```
User: "Why is my nginx pod in production namespace failing?"

Agent:
Thought: I should check the pod status first to see what state it's in
Action: GetPodStatus
Action Input: nginx, production
Observation: Pod nginx in namespace production is in CrashLoopBackOff with 15 restarts

Thought: The pod is crashing repeatedly. I need to check the logs to see why
Action: GetPodLogs
Action Input: nginx, production
Observation: 
2024-12-08 10:30:15 nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
2024-12-08 10:30:15 nginx: [emerg] still could not bind()

Thought: Port 80 is already in use. Let me check what else is using that port
Action: DescribePod
Action Input: nginx, production
Observation:
Events:
- Warning BackOff: Back-off restarting failed container
- Normal Started: Started container nginx
- Warning Failed: Error: failed to create containerd task

Thought: I now have enough information. The nginx pod is crashing because port 80 is already bound by another process
Final Answer: Your nginx pod is failing because it cannot bind to port 80 - another process is already using that port. This is why you see "Address already in use" errors and the pod is in CrashLoopBackOff. Solutions: 1) Stop the conflicting service using port 80, 2) Configure nginx to use a different port, or 3) Use a service/ingress instead of hostPort.
```

---

## 🔧 **Building a ReAct Agent (LangChain)**

### **Step 1: Define Tools**

```python
from langchain.agents import Tool

def get_pod_status(pod_name: str) -> str:
    """Get status of a Kubernetes pod"""
    result = subprocess.run(
        ["kubectl", "get", "pod", pod_name, "-o", "json"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return f"Error: {result.stderr}"
    
    pod_data = json.loads(result.stdout)
    status = pod_data["status"]["phase"]
    return f"Pod {pod_name} status: {status}"

def get_pod_logs(pod_name: str) -> str:
    """Get logs from a pod"""
    result = subprocess.run(
        ["kubectl", "logs", pod_name, "--tail=50"],
        capture_output=True, text=True
    )
    return result.stdout or result.stderr

# Create tools
tools = [
    Tool(
        name="GetPodStatus",
        func=get_pod_status,
        description="Get the current status of a Kubernetes pod. Input should be the pod name."
    ),
    Tool(
        name="GetPodLogs",
        func=get_pod_logs,
        description="Get logs from a pod to see errors. Input should be the pod name."
    )
]
```

### **Step 2: Create Agent**

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate

# Initialize LLM
llm = Ollama(model="llama3", temperature=0.0)

# ReAct prompt template
react_prompt = PromptTemplate.from_template("""
Answer the following question. You have access to these tools:

{tools}

Use this format:
Thought: reasoning about what to do
Action: tool name
Action Input: input to the tool
Observation: result from tool
... (repeat as needed)
Thought: I now know the answer
Final Answer: the final answer

Question: {input}
{agent_scratchpad}
""")

# Create agent
agent = create_react_agent(
    llm=llm,
    tools=tools,
    prompt=react_prompt
)

# Wrap in executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,  # Shows reasoning steps!
    max_iterations=5,  # Prevent infinite loops
    handle_parsing_errors=True  # Graceful error handling
)

# Use it!
result = agent_executor.invoke({
    "input": "Why is nginx pod failing?"
})
print(result["output"])
```

---

## ⚙️ **Important ReAct Configurations**

### **1. Max Iterations**
```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5  # Stop after 5 tool calls
)

# Why needed:
# Prevent infinite loops if agent gets stuck
# "Check pod → Check logs → Check pod → Check logs → ..."

# Good value: 5-10 for most tasks
# Too low (1-2): Agent can't gather enough info
# Too high (20+): Expensive, might loop
```

### **2. Temperature**
```python
llm = Ollama(model="llama3", temperature=0.0)

# For ReAct agents: Use LOW temperature (0.0 - 0.3)
# Why: Need consistent, deterministic tool selection
# High temperature → Agent might randomly pick wrong tools
```

### **3. Error Handling**
```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    handle_parsing_errors=True,  # If agent outputs wrong format
    return_intermediate_steps=True  # Get reasoning steps
)

# handle_parsing_errors: If agent's output doesn't match format
# return_intermediate_steps: Access full thought process
```

---

## 📊 **CoT vs ReAct: When to Use What**

| Use Case | Best Pattern | Why |
|----------|--------------|-----|
| **K8s Troubleshooting** | ✅ ReAct | Need real cluster data |
| **Code Debugging** | ✅ ReAct | Need to run code, check outputs |
| **Math Problems** | ✅ ReAct | Give calculator tool |
| **Explaining Concepts** | CoT | Just needs reasoning, no tools |
| **Writing Documentation** | CoT | Pure text generation |
| **Answering Trivia** | Neither | Direct prompting is fine |

---

## 📝 **Self-Check Questions**

1. **What's the key difference between CoT and ReAct?**
   <details>
   <summary>Answer</summary>
   CoT only reasons with training data. ReAct can call tools to get real data and interact with systems.
   </details>

2. **Draw the ReAct loop from memory**
   <details>
   <summary>Answer</summary>
   Thought → Action → Observation → Thought → Action → Observation → ... → Final Answer
   </details>

3. **Why use temperature=0.0 for ReAct agents?**
   <details>
   <summary>Answer</summary>
   Need deterministic, consistent tool selection. High temperature causes random tool choices.
   </details>

4. **What happens if you don't set max_iterations?**
   <details>
   <summary>Answer</summary>
   Agent might loop forever: "Check pod → Check logs → Check pod → ...". Wastes tokens and money.
   </details>

5. **When would you use CoT instead of ReAct?**
   <details>
   <summary>Answer</summary>
   When no external tools needed - just explaining, reasoning, or generating text.
   </details>

---

## 🎓 **Key Takeaways**

✅ ReAct = Reasoning + Acting (thinking + tool use)  
✅ ReAct is essential for interacting with real systems  
✅ Loop: Thought → Action → Observation (repeat)  
✅ Use max_iterations to prevent infinite loops  
✅ Use low temperature for consistent tool selection  
✅ CoT for reasoning only, ReAct when tools needed  

---

## 🚀 **Next Module**

Ready to understand function calling in depth?

**→ Continue to `05_Tool_Calling_Function_Calling.md`**
