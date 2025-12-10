# Module 5: Tool Calling & Function Calling

**Time:** 1 hour  
**Goal:** Master how LLMs interact with external systems through tools

---

## 🔧 **What is Tool Calling?**

### **The Problem**
```
LLMs can only generate text. They CANNOT:
❌ Run kubectl commands
❌ Query databases
❌ Call APIs
❌ Read files
❌ Do math accurately

But we NEED them to do these things!
```

### **The Solution: Tool Calling**
```
Tool Calling = Giving LLM the ability to request function executions

Process:
1. LLM decides: "I need to run kubectl get pods"
2. LLM outputs: {"tool": "GetPods", "input": {"namespace": "default"}}
3. YOUR CODE executes the actual kubectl command
4. YOUR CODE returns result to LLM
5. LLM sees result, decides next step

LLM doesn't execute - it just REQUESTS execution!
```

---

## 🏗️ **Anatomy of a Tool**

### **Every Tool Has 3 Parts**

```python
from langchain.tools import Tool

def my_tool_function(input_param: str) -> str:
    """The actual Python function that does the work"""
    result = do_something(input_param)
    return result

tool = Tool(
    name="ToolName",  # 1️⃣ NAME (what LLM calls it)
    
    func=my_tool_function,  # 2️⃣ FUNCTION (what gets executed)
    
    description="""  # 3️⃣ DESCRIPTION (how LLM knows when to use it)
    This tool does X. Use it when you need to Y.
    Input should be Z format.
    """
)
```

### **Example: GetPodStatus Tool**

```python
import subprocess
import json
from langchain.tools import Tool

# The actual function
def get_pod_status(pod_name: str) -> str:
    """Get status of a Kubernetes pod"""
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name, "-o", "json"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            return f"Error: Pod not found or kubectl error: {result.stderr}"
        
        pod_data = json.loads(result.stdout)
        status = pod_data["status"]["phase"]
        restarts = pod_data["status"]["containerStatuses"][0]["restartCount"]
        
        return f"Pod '{pod_name}' is {status} with {restarts} restarts"
        
    except Exception as e:
        return f"Error checking pod status: {str(e)}"

# Wrap as Tool
get_pod_status_tool = Tool(
    name="GetPodStatus",
    
    func=get_pod_status,
    
    description="""
    Get the current status of a Kubernetes pod.
    Use this when you need to check if a pod is Running, Pending, Failed, or CrashLoopBackOff.
    Input: Just the pod name as a string (e.g., 'nginx' or 'api-service')
    Output: Status and restart count
    """
)
```

---

## 🎯 **Writing GOOD Tool Descriptions**

### **Bad vs Good Descriptions**

#### **❌ Bad Description**
```python
Tool(
    name="GetPods",
    func=get_pods,
    description="Gets pods"
)

# Problem: LLM doesn't know:
# - WHEN to use it
# - WHAT input format
# - WHAT it returns
```

#### **✅ Good Description**
```python
Tool(
    name="GetPods",
    func=get_pods,
    description="""
    Get list of all pods in a Kubernetes namespace.
    
    Use this when:
    - User asks to "list pods" or "show all pods"
    - Need to find a pod by name
    - Want overview of cluster state
    
    Input format: namespace name as string (e.g., "default", "production")
    
    Output: JSON list of pods with names, status, and age
    
    Example:
    Input: "default"
    Output: [{"name": "nginx", "status": "Running", "age": "2d"}]
    """
)

# LLM now knows exactly when and how to use this tool!
```

### **Description Template**

```
Use this template for ALL your tools:

"""
[ONE SENTENCE: What this tool does]

Use this when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

Input format: [Exact format expected]

Output: [What it returns]

Example:
Input: [Example input]
Output: [Example output]

Special notes: [Any warnings or gotchas]
"""
```

---

## 🔄 **How Tool Calling Works (Under the Hood)**

### **Step-by-Step Flow**

```
1. User asks: "Is nginx pod running?"

2. Agent receives tools:
   - GetPodStatus(pod_name) → Check pod status
   - GetPodLogs(pod_name) → Get logs
   - DescribePod(pod_name) → Get details

3. Agent generates:
   {
     "thought": "I need to check pod status",
     "action": "GetPodStatus",
     "action_input": "nginx"
   }

4. LangChain parser extracts:
   - Tool name: "GetPodStatus"
   - Input: "nginx"

5. LangChain finds matching tool and executes:
   result = get_pod_status("nginx")

6. Tool returns:
   "Pod 'nginx' is Running with 0 restarts"

7. This is fed back to agent as "Observation"

8. Agent decides next step:
   - Need more info? Call another tool
   - Have enough info? Generate Final Answer
```

### **The Prompt the LLM Sees**

```
You have access to these tools:

GetPodStatus: Get the current status of a Kubernetes pod...
GetPodLogs: Get logs from a pod...

Question: Is nginx pod running?

Thought: I need to check the pod status
Action: GetPodStatus
Action Input: nginx
Observation: Pod 'nginx' is Running with 0 restarts

Thought: I now know the answer
Final Answer: Yes, the nginx pod is running successfully with no restarts.
```

---

## 🏅 **Advanced Tool Patterns**

### **Pattern 1: Structured Tools (Type Safety)**

```python
from langchain.tools import StructuredTool
from pydantic import BaseModel, Field

# Define input schema
class GetPodInput(BaseModel):
    pod_name: str = Field(description="Name of the pod to check")
    namespace: str = Field(
        default="default",
        description="Kubernetes namespace"
    )

def get_pod_status_typed(pod_name: str, namespace: str = "default") -> str:
    """Get pod status with namespace support"""
    result = subprocess.run(
        ["kubectl", "get", "pod", pod_name, "-n", namespace, "-o", "json"],
        capture_output=True, text=True
    )
    # ... processing ...
    return status

# Create structured tool
get_pod_tool = StructuredTool.from_function(
    func=get_pod_status_typed,
    name="GetPodStatus",
    description="Check pod status in a specific namespace",
    args_schema=GetPodInput  # ✅ Type-safe inputs!
)

# Now LLM must provide correct types:
# ✅ {"pod_name": "nginx", "namespace": "prod"}
# ❌ {"pod": "nginx"}  ← Will error, missing required field
```

### **Pattern 2: Tool with Error Handling**

```python
def safe_get_pod_logs(pod_name: str, lines: int = 50) -> str:
    """Get pod logs with comprehensive error handling"""
    
    # Validation
    if not pod_name:
        return "Error: pod_name is required"
    
    if lines < 1 or lines > 1000:
        return "Error: lines must be between 1 and 1000"
    
    try:
        # Execute command with timeout
        result = subprocess.run(
            ["kubectl", "logs", pod_name, f"--tail={lines}"],
            capture_output=True,
            text=True,
            timeout=30  # Don't hang forever
        )
        
        if result.returncode != 0:
            # Parse kubectl errors
            if "NotFound" in result.stderr:
                return f"Error: Pod '{pod_name}' not found"
            elif "Forbidden" in result.stderr:
                return "Error: Permission denied. Check RBAC settings"
            else:
                return f"Error: {result.stderr}"
        
        if not result.stdout:
            return f"Pod '{pod_name}' has no logs (may be starting)"
        
        return result.stdout
        
    except subprocess.TimeoutExpired:
        return f"Error: Timeout getting logs from pod '{pod_name}'"
    except Exception as e:
        return f"Unexpected error: {str(e)}"

# ✅ Robust tool that handles all edge cases!
```

### **Pattern 3: Tool with Caching**

```python
from functools import lru_cache
import time

@lru_cache(maxsize=100)
def cached_get_pods(namespace: str, _cache_key: float) -> str:
    """Get pods with 30-second cache"""
    result = subprocess.run(
        ["kubectl", "get", "pods", "-n", namespace, "-o", "json"],
        capture_output=True, text=True
    )
    return result.stdout

def get_pods_with_cache(namespace: str = "default") -> str:
    """Public function that adds cache key"""
    # Cache key changes every 30 seconds
    cache_key = int(time.time() / 30)
    return cached_get_pods(namespace, cache_key)

# Why cache?
# If agent calls GetPods multiple times in one session,
# don't hammer kubectl - use cached result!
```

---

## 🎨 **Designing Your Tool Set**

### **Your 5 Core Tools**

```python
tools = [
    # 1. Status Check (always needed first)
    Tool(
        name="GetPodStatus",
        func=get_pod_status,
        description="Check if pod is Running/Pending/Failed..."
    ),
    
    # 2. Logs (for error messages)
    Tool(
        name="GetPodLogs",
        func=get_pod_logs,
        description="Get container logs to see errors..."
    ),
    
    # 3. Detailed Info (when status isn't enough)
    Tool(
        name="DescribePod",
        func=describe_pod,
        description="Get full pod details including events..."
    ),
    
    # 4. Pattern Matching (identify known errors)
    Tool(
        name="AnalyzeErrors",
        func=analyze_errors,
        description="Check logs for common error patterns..."
    ),
    
    # 5. Resource Check (for OOMKilled, etc.)
    Tool(
        name="CheckResources",
        func=check_resources,
        description="Check CPU and memory usage..."
    )
]

# Agent uses them in order:
# 1. GetPodStatus → See if failing
# 2. GetPodLogs → Find error message
# 3. AnalyzeErrors → Match to known patterns
# 4. DescribePod → If still unclear, get full details
# 5. CheckResources → If resource-related issue
```

---

## 🚫 **Common Tool Mistakes**

### **Mistake 1: Too Many Tools**

```python
# ❌ Bad: 20 tools for every kubectl command
tools = [
    "GetPods", "GetDeployments", "GetServices", "GetIngress",
    "GetConfigMaps", "GetSecrets", "GetNodes", "GetNamespaces",
    "GetPVCs", "GetPVs", "GetStatefulSets", "GetDaemonSets",
    ... 8 more
]

# Agent gets confused! Which one to use?
# More tools = worse performance!

# ✅ Good: 5-7 focused tools
tools = [
    "GetPodStatus",
    "GetPodLogs", 
    "DescribePod",
    "AnalyzeErrors",
    "CheckResources"
]

# Clear hierarchy, each tool has specific purpose
```

### **Mistake 2: Vague Descriptions**

```python
# ❌ Bad
Tool(
    name="CheckPod",
    description="Checks pod"
)

# LLM doesn't know:
# - What aspect of pod?
# - When to use vs other tools?
# - What input format?

# ✅ Good
Tool(
    name="GetPodStatus",
    description="""
    Get current status (Running/Pending/Failed/CrashLoopBackOff).
    Use this FIRST when investigating pod issues.
    Input: pod_name (string)
    Output: Status and restart count
    """
)
```

### **Mistake 3: No Error Handling**

```python
# ❌ Bad
def get_logs(pod_name):
    result = subprocess.run(["kubectl", "logs", pod_name])
    return result.stdout  # What if it fails?!

# Crashes agent if pod doesn't exist
# No helpful error message

# ✅ Good
def get_logs(pod_name):
    try:
        result = subprocess.run(
            ["kubectl", "logs", pod_name],
            capture_output=True,
            timeout=30
        )
        if result.returncode != 0:
            return f"Error: {result.stderr}"
        return result.stdout or "No logs available"
    except Exception as e:
        return f"Failed to get logs: {e}"

# Agent can handle errors gracefully
```

---

## 📝 **Self-Check Questions**

1. **What are the 3 essential parts of a tool?**
   <details>
   <summary>Answer</summary>
   Name (what LLM calls it), Function (what it executes), Description (when/how to use it)
   </details>

2. **Why is tool description so important?**
   <details>
   <summary>Answer</summary>
   LLM decides which tool to use based ONLY on descriptions. Bad description = wrong tool selection = wrong diagnosis.
   </details>

3. **What happens if a tool doesn't handle errors?**
   <details>
   <summary>Answer</summary>
   Agent crashes or gets stuck. Need try/except, validate inputs, return error messages as strings.
   </details>

4. **Should you create a tool for every kubectl command?**
   <details>
   <summary>Answer</summary>
   No! Too many tools confuse the agent. Focus on 5-7 essential tools that cover common diagnostic workflows.
   </details>

5. **What's the difference between Tool and StructuredTool?**
   <details>
   <summary>Answer</summary>
   StructuredTool adds Pydantic schema for type-safe inputs. Better for complex tools with multiple parameters.
   </details>

---

## 🎓 **Key Takeaways**

✅ Tools let LLMs interact with real systems  
✅ Every tool needs name, function, and clear description  
✅ Good descriptions = better tool selection  
✅ Always handle errors gracefully  
✅ 5-7 focused tools > 20 generic tools  
✅ Use StructuredTool for type safety  

---

## 🚀 **Ready for Hands-On?**

Can you:
- Explain what tool calling is?
- Write a tool description that helps LLM choose correctly?
- Implement error handling in tools?

**→ Continue to `10_Hands_On_Exercises.md` to practice!**
