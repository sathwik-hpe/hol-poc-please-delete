# Hands-On Exercises: Build Your Skills

**Total Time**: ~2-3 hours  
**Prerequisites**: Complete Modules 1-12

---

## 🎯 **Overview**

These exercises will help you:
1. Practice what you learned
2. Build muscle memory for coding patterns
3. Gain confidence before the project
4. Identify knowledge gaps

**Approach**: Try each exercise yourself first, then check the solution.

---

## 🏋️ **Exercise 1: Call an LLM (30 minutes)**

### **Objective**
Learn to make basic LLM API calls with different parameters.

### **Task**
Create a Python script that:
1. Calls OpenAI API (or Ollama locally)
2. Tests different temperatures (0.0, 0.5, 1.0)
3. Compares outputs

### **Starter Code**
```python
from langchain_openai import ChatOpenAI

def test_llm_temperatures():
    """Test LLM with different temperatures"""
    query = "List 3 common Kubernetes pod issues"
    
    for temp in [0.0, 0.5, 1.0]:
        print(f"\n{'='*50}")
        print(f"Temperature: {temp}")
        print(f"{'='*50}")
        
        # TODO: Create LLM with this temperature
        # TODO: Call LLM with query
        # TODO: Print response
        
if __name__ == "__main__":
    test_llm_temperatures()
```

### **Your Solution**
```python
# Write your code here


```

<details>
<summary>Show Solution</summary>

```python
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage

def test_llm_temperatures():
    """Test LLM with different temperatures"""
    query = "List 3 common Kubernetes pod issues"
    
    for temp in [0.0, 0.5, 1.0]:
        print(f"\n{'='*50}")
        print(f"Temperature: {temp}")
        print(f"{'='*50}")
        
        # Create LLM with temperature
        llm = ChatOpenAI(
            model="gpt-4",
            temperature=temp
        )
        
        # Call LLM
        response = llm.invoke([HumanMessage(content=query)])
        
        # Print response
        print(response.content)
        print()

if __name__ == "__main__":
    test_llm_temperatures()
```

**Expected Output**:
- Temperature 0.0: Same output every run
- Temperature 0.5: Slight variations
- Temperature 1.0: More creative, varied outputs

</details>

### **Bonus Challenge**
Modify to use a local Ollama model instead of OpenAI.

---

## 🔧 **Exercise 2: Create a Tool (45 minutes)**

### **Objective**
Build a kubectl tool with proper error handling.

### **Task**
Create a `check_pod_resources` tool that:
1. Runs `kubectl top pod <pod_name>`
2. Handles errors (pod not found, kubectl missing, timeout)
3. Returns CPU and memory usage as a string

### **Starter Code**
```python
from langchain.tools import tool
import subprocess

@tool
def check_pod_resources(pod_name: str, namespace: str = "default") -> str:
    """Check CPU and memory usage of a pod.
    
    Use this when you need to see if a pod is consuming too many resources
    or hitting resource limits.
    
    Args:
        pod_name: Name of the pod to check
        namespace: Kubernetes namespace (default: default)
    
    Returns:
        String with CPU and memory usage, or error message
    """
    # TODO: Run kubectl top pod command
    # TODO: Handle errors (not found, timeout, kubectl missing)
    # TODO: Return formatted output
    pass

# Test it
if __name__ == "__main__":
    # Test with a pod that exists
    result = check_pod_resources("nginx-abc")
    print(result)
    
    # Test with pod that doesn't exist
    result = check_pod_resources("nonexistent-pod")
    print(result)
```

### **Your Solution**
```python
# Write your code here


```

<details>
<summary>Show Solution</summary>

```python
from langchain.tools import tool
import subprocess

@tool
def check_pod_resources(pod_name: str, namespace: str = "default") -> str:
    """Check CPU and memory usage of a pod.
    
    Use this when you need to see if a pod is consuming too many resources
    or hitting resource limits.
    
    Args:
        pod_name: Name of the pod to check
        namespace: Kubernetes namespace (default: default)
    
    Returns:
        String with CPU and memory usage, or error message
    """
    try:
        # Run kubectl top pod command
        result = subprocess.run(
            ["kubectl", "top", "pod", pod_name, "-n", namespace],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        # Check if command succeeded
        if result.returncode != 0:
            if "not found" in result.stderr.lower():
                return f"Error: Pod '{pod_name}' not found in namespace '{namespace}'"
            elif "metrics not available" in result.stderr.lower():
                return f"Error: Metrics not available. Is metrics-server installed?"
            else:
                return f"Error: {result.stderr.strip()}"
        
        # Parse output
        # Format: NAME        CPU(cores)   MEMORY(bytes)
        lines = result.stdout.strip().split('\n')
        if len(lines) < 2:
            return "Error: Unexpected output format"
        
        # Return the data line
        return f"Pod resource usage:\n{lines[1]}"
        
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 10 seconds"
    
    except FileNotFoundError:
        return "Error: kubectl command not found. Is it installed?"
    
    except Exception as e:
        return f"Unexpected error: {str(e)}"

# Test it
if __name__ == "__main__":
    print("Test 1: Existing pod")
    result = check_pod_resources("coredns-5d78c9869d-abcde", "kube-system")
    print(result)
    print()
    
    print("Test 2: Non-existent pod")
    result = check_pod_resources("nonexistent-pod")
    print(result)
```

</details>

### **Bonus Challenge**
Modify to also show resource limits from `kubectl describe pod`.

---

## 🤖 **Exercise 3: Build a Simple Agent (1 hour)**

### **Objective**
Create a working ReAct agent with 3 tools.

### **Task**
Build an agent that can:
1. Get pod status
2. Get pod logs (last 20 lines)
3. Describe a pod
4. Use memory to maintain context

### **Starter Code**
```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from langchain.tools import tool
import subprocess

# TODO: Define 3 tools (get_pod_status, get_pod_logs, describe_pod)

# TODO: Create ReAct prompt template

# TODO: Create agent

# TODO: Create agent executor with memory

# Test conversation
if __name__ == "__main__":
    # Query 1
    result = agent_executor.invoke({"input": "Check status of pod nginx-abc"})
    print(result["output"])
    
    # Query 2 (agent should remember nginx-abc from context)
    result = agent_executor.invoke({"input": "What are the logs?"})
    print(result["output"])
```

### **Your Solution**
```python
# Write your code here


```

<details>
<summary>Show Solution</summary>

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from langchain.tools import tool
import subprocess

# Define tools
@tool
def get_pod_status(pod_name: str, namespace: str = "default") -> str:
    """Get status of a Kubernetes pod. Use this FIRST when diagnosing issues."""
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name, "-n", namespace],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_pod_logs(pod_name: str, namespace: str = "default", tail: int = 20) -> str:
    """Get pod logs. Use when pod is crashing to see error messages."""
    try:
        result = subprocess.run(
            ["kubectl", "logs", pod_name, "-n", namespace, f"--tail={tail}"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def describe_pod(pod_name: str, namespace: str = "default") -> str:
    """Get detailed pod info and events. Use when status and logs aren't enough."""
    try:
        result = subprocess.run(
            ["kubectl", "describe", "pod", pod_name, "-n", namespace],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
    except Exception as e:
        return f"Error: {str(e)}"

tools = [get_pod_status, get_pod_logs, describe_pod]

# Create prompt
react_prompt = """
Answer the user's question using these tools: {tools}

Tool names: {tool_names}

Use this format:

Question: the user's question
Thought: think about what to do
Action: the tool to use (one of [{tool_names}])
Action Input: the input to the tool
Observation: the result from the tool
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Final Answer: the complete answer

Question: {input}
{agent_scratchpad}
"""

prompt = PromptTemplate.from_template(react_prompt)

# Create LLM
llm = ChatOpenAI(model="gpt-4", temperature=0.0)

# Create agent
agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)

# Create memory
memory = ConversationBufferWindowMemory(
    k=5,
    memory_key="chat_history",
    return_messages=True
)

# Create agent executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    max_iterations=5,
    verbose=True,
    handle_parsing_errors=True
)

# Test conversation
if __name__ == "__main__":
    print("\n" + "="*50)
    print("Query 1: Check pod status")
    print("="*50)
    result = agent_executor.invoke({"input": "Check status of pod coredns-abc in kube-system"})
    print(f"\nResult: {result['output']}")
    
    print("\n" + "="*50)
    print("Query 2: Get logs (agent should remember the pod)")
    print("="*50)
    result = agent_executor.invoke({"input": "What are the logs?"})
    print(f"\nResult: {result['output']}")
```

</details>

### **Bonus Challenge**
Add a 4th tool that checks resource usage and have the agent use it appropriately.

---

## 💾 **Exercise 4: Implement Memory (30 minutes)**

### **Objective**
Understand different memory types by implementing them.

### **Task**
Compare BufferMemory vs BufferWindowMemory:
1. Create both memory types
2. Add 10 message exchanges
3. Check what each remembers

### **Starter Code**
```python
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory

def test_memory_types():
    """Compare different memory types"""
    
    # TODO: Create BufferMemory
    buffer_memory = None
    
    # TODO: Create BufferWindowMemory with k=3
    window_memory = None
    
    # Add 5 exchanges to both
    exchanges = [
        ("Check pod nginx-abc", "Pod is Running"),
        ("Check pod redis-xyz", "Pod is CrashLoopBackOff"),
        ("What are redis logs?", "Error: Connection refused"),
        ("Check pod mongo-123", "Pod is Pending"),
        ("What's mongo status?", "Waiting for PVC")
    ]
    
    # TODO: Add all exchanges to both memories
    
    # TODO: Print what each memory remembers
    
if __name__ == "__main__":
    test_memory_types()
```

### **Your Solution**
```python
# Write your code here


```

<details>
<summary>Show Solution</summary>

```python
from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory

def test_memory_types():
    """Compare different memory types"""
    
    # Create BufferMemory (stores all)
    buffer_memory = ConversationBufferMemory()
    
    # Create BufferWindowMemory (stores last k=3)
    window_memory = ConversationBufferWindowMemory(k=3)
    
    # Add 5 exchanges to both
    exchanges = [
        ("Check pod nginx-abc", "Pod is Running"),
        ("Check pod redis-xyz", "Pod is CrashLoopBackOff"),
        ("What are redis logs?", "Error: Connection refused"),
        ("Check pod mongo-123", "Pod is Pending"),
        ("What's mongo status?", "Waiting for PVC")
    ]
    
    print("Adding 5 exchanges to both memories...\n")
    for user_input, ai_output in exchanges:
        buffer_memory.save_context(
            {"input": user_input},
            {"output": ai_output}
        )
        window_memory.save_context(
            {"input": user_input},
            {"output": ai_output}
        )
    
    # Check what each remembers
    print("="*60)
    print("BufferMemory (stores ALL):")
    print("="*60)
    buffer_vars = buffer_memory.load_memory_variables({})
    print(buffer_vars["history"])
    print()
    
    print("="*60)
    print("BufferWindowMemory with k=3 (stores last 3 exchanges):")
    print("="*60)
    window_vars = window_memory.load_memory_variables({})
    print(window_vars["history"])
    print()
    
    # Count messages
    buffer_lines = buffer_vars["history"].count("\n")
    window_lines = window_vars["history"].count("\n")
    
    print(f"BufferMemory: {buffer_lines} lines (all 5 exchanges)")
    print(f"WindowMemory: {window_lines} lines (last 3 exchanges)")
    print()
    print("Notice: WindowMemory dropped the first 2 exchanges (nginx and redis status)")

if __name__ == "__main__":
    test_memory_types()
```

**Expected Output**:
```
BufferMemory stores all 5 exchanges:
- Check pod nginx-abc → Pod is Running
- Check pod redis-xyz → Pod is CrashLoopBackOff
- What are redis logs? → Error: Connection refused
- Check pod mongo-123 → Pod is Pending
- What's mongo status? → Waiting for PVC

WindowMemory (k=3) stores only last 3:
- What are redis logs? → Error: Connection refused
- Check pod mongo-123 → Pod is Pending
- What's mongo status? → Waiting for PVC
(First 2 exchanges dropped)
```

</details>

---

## 🧬 **Exercise 5: Practice Debugging (45 minutes)**

### **Objective**
Learn to debug agent issues using verbose mode and logs.

### **Task**
An agent is stuck in a loop. Fix it!

### **Broken Code**
```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.tools import tool

@tool
def get_info(query: str) -> str:
    """Get information"""  # ⚠️ Vague description!
    return f"Info about {query}"

@tool
def check_status(query: str) -> str:
    """Check status"""  # ⚠️ Vague description!
    return f"Status of {query}"

tools = [get_info, check_status]

prompt = PromptTemplate.from_template("""
Answer: {input}

{agent_scratchpad}
""")  # ⚠️ Missing format instructions!

llm = ChatOpenAI(temperature=1.0)  # ⚠️ High temperature!

agent = create_react_agent(llm, tools, prompt)

# ⚠️ No max_iterations!
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# This will likely loop or fail
result = agent_executor.invoke({"input": "Check pod status"})
```

### **Your Task**
1. Identify all problems
2. Fix each one
3. Test that it works

### **Your Solution**
```python
# Write your fixed code here


```

<details>
<summary>Show Solution</summary>

**Problems identified**:
1. ❌ Vague tool descriptions → Agent doesn't know when to use them
2. ❌ Missing ReAct format in prompt → Agent doesn't know how to structure output
3. ❌ High temperature (1.0) → Random tool selection
4. ❌ No max_iterations → Can loop forever
5. ❌ No error handling → Will crash on parsing errors

**Fixed code**:

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.tools import tool

# ✅ Clear, specific tool descriptions
@tool
def get_pod_info(pod_name: str) -> str:
    """Get general information about a pod.
    
    Use this when you need to see pod configuration, labels, or metadata.
    NOT for status (use check_pod_status instead).
    
    Args:
        pod_name: Name of the pod
    """
    return f"Info: Pod {pod_name} has labels app=nginx, replicas=3"

@tool
def check_pod_status(pod_name: str) -> str:
    """Check the current status of a pod.
    
    Use this when you need to see if pod is Running, Pending, CrashLoopBackOff, etc.
    This should be your FIRST step when diagnosing pod issues.
    
    Args:
        pod_name: Name of the pod
    """
    return f"Status: Pod {pod_name} is Running"

tools = [get_pod_info, check_pod_status]

# ✅ Complete ReAct prompt template
prompt = PromptTemplate.from_template("""
Answer the user's question using these tools: {tools}

Tool names: {tool_names}

Use this format:

Question: the user's question
Thought: think about what to do
Action: the tool to use (one of [{tool_names}])
Action Input: the input to the tool
Observation: the result from the tool
... (repeat as needed)
Thought: I now know the final answer
Final Answer: the answer

Question: {input}
{agent_scratchpad}
""")

# ✅ Low temperature for deterministic behavior
llm = ChatOpenAI(model="gpt-4", temperature=0.0)

agent = create_react_agent(llm, tools, prompt)

# ✅ Max iterations and error handling
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5,  # ✅ Prevent infinite loops
    early_stopping_method="generate",  # ✅ Graceful exit
    handle_parsing_errors=True,  # ✅ Handle format errors
    verbose=True
)

# Now works correctly
result = agent_executor.invoke({"input": "Check status of pod nginx-abc"})
print(f"\nResult: {result['output']}")
```

</details>

---

## 🎯 **Exercise 6: End-to-End System (1 hour)**

### **Objective**
Build a complete minimal system combining everything learned.

### **Task**
Create a FastAPI service with:
1. An endpoint `/diagnose` that takes a pod name
2. An agent with 3 tools
3. Memory for conversation
4. Error handling
5. Basic logging

### **Starter Code**
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# TODO: Define request/response models
class DiagnoseRequest(BaseModel):
    pass  # Fill this in

class DiagnoseResponse(BaseModel):
    pass  # Fill this in

# TODO: Create agent with tools

# TODO: Create endpoint
@app.post("/diagnose")
async def diagnose(request: DiagnoseRequest):
    pass  # Implement this

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### **Your Solution**
```python
# Write your code here


```

<details>
<summary>Show Solution</summary>

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from langchain.tools import tool
import subprocess
import logging
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="K8s Diagnostic Agent")

# Request/Response models
class DiagnoseRequest(BaseModel):
    pod_name: str
    namespace: str = "default"
    session_id: str = "default"

class DiagnoseResponse(BaseModel):
    success: bool
    diagnosis: str
    duration_ms: float
    error: str = None

# Define tools
@tool
def get_pod_status(pod_name: str, namespace: str = "default") -> str:
    """Get pod status. Use FIRST when diagnosing."""
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name, "-n", namespace],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_pod_logs(pod_name: str, namespace: str = "default") -> str:
    """Get pod logs when pod is crashing."""
    try:
        result = subprocess.run(
            ["kubectl", "logs", pod_name, "-n", namespace, "--tail=20"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def describe_pod(pod_name: str, namespace: str = "default") -> str:
    """Get detailed pod info when status/logs aren't enough."""
    try:
        result = subprocess.run(
            ["kubectl", "describe", "pod", pod_name, "-n", namespace],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
    except Exception as e:
        return f"Error: {str(e)}"

tools = [get_pod_status, get_pod_logs, describe_pod]

# Create prompt
react_prompt = """
You are a Kubernetes troubleshooting expert.

Tools: {tools}
Tool names: {tool_names}

Format:
Question: {input}
Thought: [reasoning]
Action: [tool name]
Action Input: [tool input]
Observation: [result]
... (repeat)
Final Answer: [diagnosis with recommended fixes]

Question: {input}
{agent_scratchpad}
"""

prompt = PromptTemplate.from_template(react_prompt)

# Create LLM
llm = ChatOpenAI(model="gpt-4", temperature=0.0)

# Create agent
agent = create_react_agent(llm, tools, prompt)

# Global memory (in production, use Redis with session IDs)
memory = ConversationBufferWindowMemory(
    k=10,
    memory_key="chat_history",
    return_messages=True
)

# Create agent executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    max_iterations=5,
    early_stopping_method="generate",
    handle_parsing_errors=True,
    verbose=True
)

@app.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(request: DiagnoseRequest):
    """Diagnose a Kubernetes pod"""
    start_time = time.time()
    
    logger.info(f"Diagnosing pod: {request.pod_name} in namespace: {request.namespace}")
    
    try:
        # Build query
        query = f"Diagnose pod {request.pod_name} in namespace {request.namespace}"
        
        # Call agent
        result = agent_executor.invoke({"input": query})
        
        duration = (time.time() - start_time) * 1000
        
        logger.info(f"Diagnosis completed in {duration:.0f}ms")
        
        return DiagnoseResponse(
            success=True,
            diagnosis=result["output"],
            duration_ms=duration
        )
        
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"Error during diagnosis: {e}")
        
        return DiagnoseResponse(
            success=False,
            diagnosis="",
            duration_ms=duration,
            error=str(e)
        )

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Test it**:
```bash
# Terminal 1: Start server
python app.py

# Terminal 2: Test endpoint
curl -X POST "http://localhost:8000/diagnose" \
  -H "Content-Type: application/json" \
  -d '{"pod_name": "nginx-abc", "namespace": "default"}'
```

</details>

---

## 🎓 **Self-Assessment**

After completing these exercises, you should be able to:

✅ Make basic LLM API calls  
✅ Understand temperature effects  
✅ Create tools with error handling  
✅ Build a working ReAct agent  
✅ Implement and compare memory types  
✅ Debug agent issues  
✅ Build a complete FastAPI service

**If you struggled with any**:
- Review the relevant module
- Try the exercise again
- Check the solution and understand each line

---

## 🚀 **Next Steps**

You're now ready to:
1. ✅ Build your K8s troubleshooting agent project
2. ✅ Demo it to Hoang and the team
3. ✅ Explain every technical decision confidently

**Before starting the project**:
- Review QUICK_REFERENCE.md
- Read INTERVIEW_DEMO_PREP.md
- Practice explaining concepts out loud

---

## 💡 **Tips for Success**

1. **Type, don't copy-paste**: Muscle memory matters
2. **Experiment**: Change parameters, see what happens
3. **Break things**: Best way to learn is fixing errors
4. **Take notes**: Write down your "aha!" moments
5. **Practice explaining**: Teach concepts to rubber duck

---

**Congratulations on completing the hands-on exercises! You're ready to build! 🎉**

**Total learning time**: ~10-12 hours (modules + exercises)  
**Project time**: ~8-12 hours (Level 1-3 implementation)  
**Total**: ~20-24 hours to master AI agent development!
