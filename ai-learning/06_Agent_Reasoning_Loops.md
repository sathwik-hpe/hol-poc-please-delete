# Module 6: Agent Reasoning Loops

**Study Time**: ~45 minutes  
**Prerequisites**: Module 4 (CoT vs ReAct), Module 5 (Tool Calling)

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. How agents make decisions in a loop
2. The anatomy of a reasoning iteration
3. How to control and debug agent loops
4. Common loop problems and solutions
5. Best practices for production agents

---

## 🔄 **What is a Reasoning Loop?**

An **agent reasoning loop** is the iterative process where an agent:
1. **Observes** the current state
2. **Thinks** about what to do next
3. **Acts** by calling a tool or giving a final answer
4. **Observes** the result
5. **Repeats** until the task is complete

Think of it like a doctor diagnosing a patient:
- Doctor examines patient (observation)
- Doctor thinks "could be infection" (reasoning)
- Doctor orders blood test (action/tool call)
- Doctor sees elevated white blood cells (observation)
- Doctor thinks "confirms infection" (reasoning)
- Doctor prescribes antibiotics (final answer)

---

## 🧠 **ReAct Loop: Step-by-Step**

### **The Pattern**

```
Thought → Action → Observation → Thought → Action → Observation → Final Answer
```

### **Detailed Example: K8s Troubleshooting**

**User Query**: "Why is pod nginx-abc123 crashing?"

#### **Iteration 1**
```
Thought: "I need to check the pod's current status first"
Action: GetPodStatus(pod_name="nginx-abc123", namespace="default")
Observation: "Pod nginx-abc123 is in CrashLoopBackOff state. 
             Last restart: 2 minutes ago. Restart count: 15"
```

#### **Iteration 2**
```
Thought: "CrashLoopBackOff means the container is repeatedly crashing. 
         I should check the logs to see why"
Action: GetPodLogs(pod_name="nginx-abc123", namespace="default", tail=50)
Observation: "Error: Configuration file /etc/nginx/nginx.conf not found
              nginx: [emerg] cannot load configuration file"
```

#### **Iteration 3**
```
Thought: "The pod is crashing because the nginx config file is missing. 
         Let me check the pod's configuration to see how this file should be mounted"
Action: DescribePod(pod_name="nginx-abc123", namespace="default")
Observation: "Pod mounts ConfigMap 'nginx-config' at /etc/nginx/
              ConfigMap Status: Not Found
              Event: MountVolume.SetUp failed for volume 'nginx-config': 
              configmap 'nginx-config' not found"
```

#### **Final Answer**
```
Thought: "I have enough information to provide a complete diagnosis"
Final Answer: "Pod nginx-abc123 is crashing because it's trying to mount a 
ConfigMap named 'nginx-config' that doesn't exist. 

Root Cause: Missing ConfigMap

Fix:
1. Check if ConfigMap was deleted: kubectl get configmap nginx-config
2. Recreate the ConfigMap with the correct nginx configuration
3. Or update the Deployment to use an existing ConfigMap name

The pod will start successfully once the ConfigMap exists."
```

**Total Iterations**: 3  
**Tools Called**: 3  
**Result**: Complete diagnosis with actionable fix

---

## ⚙️ **Anatomy of an Iteration**

Each iteration has 3 components:

### **1. Thought (Reasoning)**

The agent's internal reasoning about what to do next.

```python
# Example thoughts:
"I need to check the pod status first"
"CrashLoopBackOff suggests repeated failures, should check logs"
"The logs show a config error, need to verify the ConfigMap"
"I have enough information to answer now"
```

**What makes a good thought**:
- ✅ Refers to previous observations
- ✅ Explains why taking the next action
- ✅ Shows logical progression
- ❌ Doesn't repeat the same thought
- ❌ Doesn't contradict previous reasoning

### **2. Action (Tool Call)**

The tool the agent decides to call, with parameters.

```python
# Good action:
Action: GetPodLogs(pod_name="nginx-abc123", namespace="default", tail=50)

# Bad action (wrong parameters):
Action: GetPodLogs(pod_name="wrong-name", namespace="default")

# Bad action (wrong tool for the situation):
Action: CheckResources(pod_name="nginx-abc123")  # Doesn't help with config error
```

### **3. Observation (Tool Result)**

The output returned by the tool.

```python
# Tool returns this:
Observation: "Error: Configuration file /etc/nginx/nginx.conf not found"

# Agent reads this and uses it in next Thought
```

---

## 🎮 **Controlling the Loop**

### **max_iterations: Prevent Infinite Loops**

```python
from langchain.agents import AgentExecutor

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5,  # Stop after 5 iterations max
    verbose=True
)
```

**Why this matters**:

❌ **Without max_iterations**:
```
Iteration 1: Check pod status
Iteration 2: Check pod logs
Iteration 3: Check pod status (repeating!)
Iteration 4: Check pod logs (repeating!)
Iteration 5: Check pod status (stuck in loop!)
... [infinite loop]
```

✅ **With max_iterations=5**:
```
Iteration 1: Check pod status
Iteration 2: Check pod logs
Iteration 3: Describe pod
Iteration 4: Analyze error
Iteration 5: Give final answer (forced to stop)
```

**Best Practice**: Set `max_iterations=5-10` based on task complexity.

### **early_stopping_method: Graceful Exits**

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5,
    early_stopping_method="generate"  # or "force"
)
```

**Options**:

1. **"generate"** (recommended): Agent generates best answer it can when max_iterations is reached
   ```
   "Based on the logs I checked, the pod is crashing due to a config error. 
   I would need to check the ConfigMap to provide a complete diagnosis."
   ```

2. **"force"**: Agent is forced to return what it has immediately
   ```
   "Agent stopped at max_iterations"  [Not helpful!]
   ```

**Use "generate"** for better user experience.

### **return_intermediate_steps: Debugging**

```python
result = agent_executor.invoke(
    {"input": "Why is pod crashing?"},
    return_intermediate_steps=True  # Get full loop details
)

# Access the reasoning loop:
for step in result["intermediate_steps"]:
    action = step[0]  # (tool_name, tool_input)
    observation = step[1]  # tool output
    print(f"Action: {action}")
    print(f"Observation: {observation}")
```

**When to use**:
- ✅ Debugging agent behavior
- ✅ Understanding why agent made certain choices
- ✅ Logging for analytics
- ❌ Production (adds overhead)

---

## 🐛 **Common Loop Problems**

### **Problem 1: Infinite Loops**

**Symptom**: Agent keeps calling the same tool repeatedly.

```
Iteration 1: GetPodStatus → "CrashLoopBackOff"
Iteration 2: GetPodStatus → "CrashLoopBackOff"
Iteration 3: GetPodStatus → "CrashLoopBackOff"
...
```

**Causes**:
1. Tool descriptions don't guide agent to next step
2. Temperature too high (random tool selection)
3. No memory (agent forgets what it did)
4. Tool returns ambiguous output

**Solutions**:
```python
# 1. Better tool descriptions
@tool
def get_pod_status(pod_name: str) -> str:
    """Get pod status.
    
    Use this FIRST to check if pod is Running, Pending, or CrashLoopBackOff.
    If CrashLoopBackOff, use GetPodLogs next to see why it's crashing.
    """
    # ... implementation
    
# 2. Lower temperature
llm = ChatOpenAI(temperature=0.0)  # Deterministic

# 3. Add memory
memory = ConversationBufferWindowMemory(k=10)

# 4. Set max_iterations
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5  # Force stop
)
```

### **Problem 2: Wrong Tool Selection**

**Symptom**: Agent calls tools that don't help.

```
User: "Pod is out of memory"
Agent calls: GetPodStatus  [Okay]
Agent calls: GetPodLogs    [Okay]
Agent calls: AnalyzeErrors [Doesn't help for OOM]
Agent calls: GetPodStatus  [Repeating, doesn't help]
```

**Causes**:
1. Vague tool descriptions
2. Too many similar tools
3. High temperature

**Solutions**:
```python
# 1. Specific descriptions with use cases
@tool
def check_resources(pod_name: str, namespace: str = "default") -> str:
    """Check pod CPU and memory limits/usage.
    
    Use this when:
    - Pod shows OOMKilled error
    - Investigating resource limit issues
    - Pod is stuck in Pending state due to resource constraints
    
    NOT for: Network errors, image pull issues, config problems
    """
    # ... implementation

# 2. Reduce number of tools (5-7 max)

# 3. Use temperature=0.0
```

### **Problem 3: Premature Exit**

**Symptom**: Agent gives up too early without gathering enough info.

```
User: "Pod nginx-abc is failing"
Agent: "I need more information to help. Please provide pod logs."
[But agent has GetPodLogs tool it could have used!]
```

**Causes**:
1. System prompt doesn't encourage tool use
2. max_iterations too low
3. Agent trained to defer to humans

**Solutions**:
```python
system_prompt = """
You are a K8s troubleshooting assistant with diagnostic tools.

IMPORTANT: Always use your tools to gather information before asking the user.
- If you need logs, call GetPodLogs
- If you need status, call GetPodStatus
- If you need details, call DescribePod

Only ask the user for information that your tools cannot provide 
(like business context or expected behavior).
"""

# Set reasonable max_iterations
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=10  # Allow enough iterations to investigate
)
```

### **Problem 4: Over-Investigation**

**Symptom**: Agent keeps gathering data even after it has the answer.

```
User: "Is pod nginx-abc running?"
Agent calls: GetPodStatus → "Running"
Agent calls: GetPodLogs → [unnecessary]
Agent calls: DescribePod → [unnecessary]
Agent calls: CheckResources → [unnecessary]
Final Answer: "Yes, it's running"
```

**Causes**:
1. System prompt encourages over-thoroughness
2. Agent doesn't know when it has enough info
3. Temperature creates randomness

**Solutions**:
```python
system_prompt = """
You are a K8s troubleshooting assistant.

Guidelines:
- Use tools efficiently - only call what you need
- If the answer is clear from one tool, provide it immediately
- For simple status checks, GetPodStatus is usually sufficient
- For crashes/errors, check status → logs → describe (in that order)
- Stop once you have enough information to answer confidently
"""

# Use temperature=0.0 for deterministic behavior
llm = ChatOpenAI(temperature=0.0)
```

---

## 📊 **Loop Patterns: Good vs Bad**

### **Pattern 1: Linear Investigation (Good)**

```
User: "Pod is crashing"
↓
Iteration 1: GetPodStatus → "CrashLoopBackOff"
↓
Iteration 2: GetPodLogs → "OOMKilled error"
↓
Iteration 3: CheckResources → "Memory limit: 128Mi"
↓
Final Answer: "Pod exceeds 128Mi limit, increase to 256Mi"
```

**Why good**: Each step builds on the previous, logical progression, efficient.

### **Pattern 2: Circular Investigation (Bad)**

```
User: "Pod is crashing"
↓
Iteration 1: GetPodStatus → "CrashLoopBackOff"
↓
Iteration 2: GetPodLogs → "Error message"
↓
Iteration 3: GetPodStatus → "CrashLoopBackOff" [Repeating!]
↓
Iteration 4: GetPodLogs → "Error message" [Repeating!]
↓
Max iterations reached, no answer
```

**Why bad**: Repeating same tools, not progressing, wastes iterations.

### **Pattern 3: Shotgun Investigation (Bad)**

```
User: "Pod is crashing"
↓
Iteration 1: CheckResources [Wrong first step]
↓
Iteration 2: AnalyzeErrors [No errors to analyze yet]
↓
Iteration 3: GetPodStatus [Should have been first!]
↓
Iteration 4: DescribePod [Okay but order is wrong]
↓
Iteration 5: GetPodLogs [Should have been second!]
```

**Why bad**: Random tool order, inefficient, confusing logic.

---

## 🎯 **Best Practices for Production**

### **1. Design Logical Tool Order**

Guide the agent with tool descriptions:

```python
@tool
def get_pod_status(pod_name: str) -> str:
    """Step 1: Check pod status (Running, Pending, CrashLoopBackOff).
    
    Use this FIRST for any pod issue. Based on the status:
    - CrashLoopBackOff → Use GetPodLogs next
    - Pending → Use DescribePod next to see events
    - ImagePullBackOff → Use DescribePod next
    """
    
@tool
def get_pod_logs(pod_name: str) -> str:
    """Step 2: Get pod logs after confirming pod is crashing.
    
    Use this when GetPodStatus shows CrashLoopBackOff or Error state.
    Look for error messages in the logs.
    """

@tool
def describe_pod(pod_name: str) -> str:
    """Step 3: Get detailed pod info when status and logs aren't enough.
    
    Use this when:
    - You need to see pod events
    - Investigating Pending state
    - Checking volume mounts or ConfigMap issues
    """
```

### **2. Monitor Loop Health**

Track metrics:

```python
class LoopMonitor:
    def __init__(self):
        self.iteration_count = 0
        self.tools_called = []
        self.repeated_tools = 0
        
    def track_iteration(self, action, observation):
        self.iteration_count += 1
        
        # Detect repeated tools
        if action in self.tools_called:
            self.repeated_tools += 1
            
        self.tools_called.append(action)
        
        # Alert if agent is stuck
        if self.repeated_tools > 2:
            print("⚠️ Warning: Agent repeating tools, may be stuck")
            
    def get_stats(self):
        return {
            "total_iterations": self.iteration_count,
            "unique_tools": len(set(self.tools_called)),
            "repeated_calls": self.repeated_tools
        }
```

### **3. Implement Circuit Breakers**

Stop agent if it's clearly stuck:

```python
class SmartAgentExecutor:
    def __init__(self, agent_executor, max_repeats=2):
        self.agent_executor = agent_executor
        self.max_repeats = max_repeats
        self.tool_history = []
        
    def invoke(self, input_dict):
        # Custom invoke that tracks tool calls
        for step in self.agent_executor.iter(input_dict):
            action = step.get("action")
            
            # Check for repeated tools
            if self.tool_history.count(action) >= self.max_repeats:
                return {
                    "output": "Agent detected repeating pattern. Stopping to prevent infinite loop.",
                    "status": "circuit_breaker_triggered"
                }
                
            self.tool_history.append(action)
            
        return step
```

### **4. Test Different Scenarios**

Create test cases:

```python
test_cases = [
    {
        "query": "Is pod nginx-abc running?",
        "expected_tools": ["GetPodStatus"],
        "max_expected_iterations": 1
    },
    {
        "query": "Pod nginx-abc is crashing, why?",
        "expected_tools": ["GetPodStatus", "GetPodLogs", "DescribePod"],
        "max_expected_iterations": 3
    },
    {
        "query": "Pod is OOMKilled",
        "expected_tools": ["GetPodStatus", "GetPodLogs", "CheckResources"],
        "max_expected_iterations": 3
    }
]

# Run tests
for test in test_cases:
    result = agent_executor.invoke({"input": test["query"]})
    iterations = len(result["intermediate_steps"])
    
    assert iterations <= test["max_expected_iterations"], \
        f"Too many iterations: {iterations} > {test['max_expected_iterations']}"
```

---

## 🔬 **Debugging Agent Loops**

### **Enable Verbose Mode**

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True  # See all thoughts and actions
)
```

**Output**:
```
> Entering new AgentExecutor chain...

Thought: I need to check the pod status first
Action: GetPodStatus
Action Input: {"pod_name": "nginx-abc123", "namespace": "default"}
Observation: Pod nginx-abc123 is in CrashLoopBackOff state

Thought: Now I should check the logs to see why it's crashing
Action: GetPodLogs
Action Input: {"pod_name": "nginx-abc123", "namespace": "default", "tail": 50}
Observation: Error: Configuration file not found

Thought: I have enough information to answer
Final Answer: Pod is crashing because the nginx config file is missing...

> Finished chain.
```

### **Analyze Intermediate Steps**

```python
result = agent_executor.invoke(
    {"input": "Why is pod crashing?"},
    return_intermediate_steps=True
)

# Check what the agent did
steps = result["intermediate_steps"]
print(f"Total iterations: {len(steps)}")

for i, (action, observation) in enumerate(steps, 1):
    print(f"\n--- Iteration {i} ---")
    print(f"Tool: {action.tool}")
    print(f"Input: {action.tool_input}")
    print(f"Output: {observation[:100]}...")  # First 100 chars
```

### **Log to File for Analysis**

```python
import logging

logging.basicConfig(
    filename='agent_loops.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(message)s'
)

class LoggingAgentExecutor:
    def __init__(self, agent_executor):
        self.agent_executor = agent_executor
        
    def invoke(self, input_dict):
        logging.info(f"Query: {input_dict['input']}")
        
        result = self.agent_executor.invoke(
            input_dict,
            return_intermediate_steps=True
        )
        
        # Log each iteration
        for i, (action, observation) in enumerate(result["intermediate_steps"], 1):
            logging.info(f"Iteration {i}: {action.tool} -> {observation[:200]}")
            
        logging.info(f"Final Answer: {result['output']}")
        
        return result
```

---

## 🎓 **Self-Check Questions**

### **Question 1**: What are the 3 components of each iteration in a ReAct loop?

<details>
<summary>Show Answer</summary>

1. **Thought**: The agent's reasoning about what to do next
2. **Action**: The tool call the agent decides to make (with parameters)
3. **Observation**: The result returned by the tool

Example:
```
Thought: "I need to check pod status"
Action: GetPodStatus(pod_name="nginx-abc")
Observation: "Pod is CrashLoopBackOff"
```

</details>

### **Question 2**: Why should you set max_iterations for production agents?

<details>
<summary>Show Answer</summary>

**To prevent infinite loops.**

Without max_iterations, an agent might:
- Get stuck calling the same tool repeatedly
- Loop endlessly if it can't find a solution
- Waste compute resources and cost money
- Provide poor user experience (long wait times)

**Best practice**: Set max_iterations=5-10 based on task complexity, and use `early_stopping_method="generate"` to get the best partial answer if max is reached.

</details>

### **Question 3**: What causes an agent to get stuck in an infinite loop?

<details>
<summary>Show Answer</summary>

**Common causes**:
1. **Vague tool descriptions**: Agent doesn't know what tool to call next
2. **High temperature**: Random tool selection causes repeated calls
3. **No memory**: Agent forgets what it already did
4. **Ambiguous tool outputs**: Agent can't decide what to do with the result
5. **Conflicting tool descriptions**: Multiple tools seem equally valid

**Solutions**:
- Use temperature=0.0 for deterministic behavior
- Write clear tool descriptions with "Use this when..." guidance
- Add memory to track conversation history
- Include sequential hints ("Use GetPodStatus FIRST, then GetPodLogs")
- Set max_iterations as safety net

</details>

### **Question 4**: Design a good reasoning loop for this query: "Pod is OOMKilled"

<details>
<summary>Show Answer</summary>

```
User Query: "Pod cart-service-xyz is OOMKilled"

Iteration 1:
Thought: "OOMKilled means out of memory. Let me confirm the pod status."
Action: GetPodStatus(pod_name="cart-service-xyz", namespace="default")
Observation: "Pod is in CrashLoopBackOff. Last exit code: 137 (OOMKilled)"

Iteration 2:
Thought: "Exit code 137 confirms OOMKilled. I should check resource limits."
Action: CheckResources(pod_name="cart-service-xyz", namespace="default")
Observation: "Memory limit: 128Mi, Memory usage at crash: 145Mi"

Iteration 3:
Thought: "Pod is using 145Mi but limit is only 128Mi. I have enough info."
Final Answer: "Pod cart-service-xyz is being killed because it exceeds its 
128Mi memory limit (using 145Mi).

Fixes:
1. Increase memory limit to 256Mi in the deployment spec
2. Investigate if there's a memory leak causing high usage
3. Add horizontal pod autoscaling if traffic is increasing"
```

**Why this is good**:
- ✅ Linear progression (status → resources → conclusion)
- ✅ Each step builds on previous observation
- ✅ Only 2 tool calls needed (efficient)
- ✅ Clear reasoning at each step
- ✅ Actionable final answer

</details>

### **Question 5**: What's the difference between early_stopping_method "generate" vs "force"?

<details>
<summary>Show Answer</summary>

When max_iterations is reached:

**"generate"** (recommended):
- Agent generates the best answer it can based on what it learned so far
- Example: "Based on the logs I checked, the pod is crashing due to a missing config file. I would need to check the ConfigMap to provide a complete solution."
- Better user experience

**"force"**:
- Agent immediately returns with minimal output
- Example: "Agent stopped at max_iterations"
- Poor user experience, not helpful

**Always use "generate"** for production systems.

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5,
    early_stopping_method="generate"  # ✅ Use this
)
```

</details>

---

## 🚀 **Key Takeaways**

1. **ReAct loop**: Thought → Action → Observation → repeat
2. **Set max_iterations**: Prevent infinite loops (5-10 is typical)
3. **Use temperature=0.0**: Ensures deterministic tool selection
4. **Guide with descriptions**: Tell agent which tools to use when
5. **Monitor loop health**: Track repeated tools, circular patterns
6. **Test different scenarios**: Ensure agent handles various queries efficiently
7. **Enable verbose mode**: Debug by seeing agent's reasoning
8. **Use "generate" stopping**: Better user experience when max_iterations reached

---

## 🔗 **Next Module**

Move on to **Module 7: LangChain Components** to understand the framework that powers these agents!

---

**Time to complete this module**: 45 minutes  
**Hands-on practice**: 20 minutes  
**Total**: ~1 hour
