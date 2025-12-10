# Module 7: LangChain Components Deep Dive

**Study Time**: ~1 hour  
**Prerequisites**: Modules 1-6

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. What LangChain is and why it's useful
2. Core components: LLMs, PromptTemplates, Chains, Agents, Tools
3. How to compose components into applications
4. Memory management in LangChain
5. Best practices for your K8s agent

---

## 🔗 **What is LangChain?**

**LangChain** is a framework for building applications with LLMs. It provides:
- **Abstractions**: Common patterns wrapped in reusable components
- **Chains**: Connect multiple LLM calls and logic
- **Agents**: Autonomous systems that use tools
- **Memory**: Persist conversation context
- **Integrations**: Works with OpenAI, Anthropic, Ollama, etc.

### **Why Use LangChain?**

#### **Without LangChain** (Raw API calls)
```python
# You write everything manually
import openai

def diagnose_pod(pod_name):
    # Call 1: Check status
    status_prompt = f"Check status of pod {pod_name}"
    status = openai.chat.completions.create(...)
    
    # Call 2: Analyze result
    analysis_prompt = f"Analyze this status: {status}"
    analysis = openai.chat.completions.create(...)
    
    # Call 3: Suggest fix
    fix_prompt = f"Based on {analysis}, suggest fix"
    fix = openai.chat.completions.create(...)
    
    # You handle memory, errors, retries manually
    return fix
```

**Problems**:
- ❌ Repetitive code
- ❌ Manual memory management
- ❌ No tool calling framework
- ❌ Hard to maintain

#### **With LangChain**
```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory

# Framework handles complexity
llm = ChatOpenAI(temperature=0.0)
memory = ConversationBufferWindowMemory(k=10)
agent = create_react_agent(llm, tools, prompt_template)
agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory)

# One line to execute
result = agent_executor.invoke({"input": "Why is pod nginx-abc crashing?"})
```

**Benefits**:
- ✅ Less boilerplate code
- ✅ Built-in memory management
- ✅ Tool calling framework
- ✅ Easy to extend

---

## 🧱 **Core Components**

### **1. LLMs and Chat Models**

**LLMs**: Basic text completion models (GPT-3, older models)
```python
from langchain.llms import OpenAI

llm = OpenAI(temperature=0.7)
result = llm.invoke("What is Kubernetes?")
# Returns: "Kubernetes is a container orchestration platform..."
```

**Chat Models** (Modern, recommended): Designed for conversations
```python
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

chat = ChatOpenAI(model="gpt-4", temperature=0.0)

messages = [
    SystemMessage(content="You are a K8s expert"),
    HumanMessage(content="What is a pod?")
]

result = chat.invoke(messages)
# Returns: Message object with .content
```

**Key Difference**:
- **LLMs**: Simple text in, text out
- **Chat Models**: Message objects, roles (system/user/assistant), better for conversations

**For your agent**: Use **ChatOpenAI** (chat model)

### **2. Prompt Templates**

Reusable prompt structures with variables.

#### **Basic Template**
```python
from langchain.prompts import PromptTemplate

template = PromptTemplate(
    input_variables=["pod_name", "error"],
    template="""
    Diagnose this Kubernetes issue:
    
    Pod: {pod_name}
    Error: {error}
    
    Provide step-by-step diagnosis:
    """
)

# Use the template
prompt = template.format(pod_name="nginx-abc", error="CrashLoopBackOff")
result = llm.invoke(prompt)
```

#### **Chat Prompt Template** (Better for conversations)
```python
from langchain.prompts import ChatPromptTemplate

chat_template = ChatPromptTemplate.from_messages([
    ("system", "You are a Kubernetes troubleshooting expert."),
    ("human", "Pod {pod_name} is in {status} state. Help me diagnose."),
    ("ai", "I'll help diagnose this issue. Let me check the pod first."),
    ("human", "{follow_up}")
])

# Use it
messages = chat_template.format_messages(
    pod_name="nginx-abc",
    status="CrashLoopBackOff",
    follow_up="What should I check next?"
)

result = chat.invoke(messages)
```

#### **For ReAct Agents**
```python
react_prompt = """
You are a Kubernetes troubleshooting assistant with access to diagnostic tools.

Available tools:
{tools}

Tool Names: {tool_names}

When troubleshooting:
1. Think step-by-step
2. Use tools to gather real data
3. Provide actionable recommendations

Use this format:

Question: the user's question
Thought: think about what to do
Action: the tool to use (must be one of [{tool_names}])
Action Input: the input to the tool
Observation: the result of the action
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Final Answer: the complete diagnosis and fix

Question: {input}
Thought: {agent_scratchpad}
"""

prompt = PromptTemplate.from_template(react_prompt)
```

### **3. Tools**

Functions the agent can call.

#### **Basic Tool**
```python
from langchain.tools import tool

@tool
def get_pod_status(pod_name: str, namespace: str = "default") -> str:
    """Get the status of a Kubernetes pod.
    
    Use this tool when you need to check if a pod is Running, Pending, 
    CrashLoopBackOff, or in any other state. This should be your FIRST 
    step when diagnosing pod issues.
    
    Args:
        pod_name: Name of the pod (required)
        namespace: Kubernetes namespace (default: default)
    
    Returns:
        String with pod status and conditions
    """
    import subprocess
    
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name, "-n", namespace, "-o", "wide"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            return f"Error: Pod {pod_name} not found in namespace {namespace}"
            
        return result.stdout
    except Exception as e:
        return f"Error checking pod status: {str(e)}"
```

**Key parts**:
- `@tool` decorator makes it a LangChain tool
- **Docstring** is critical - agent reads this to decide when to use
- **Type hints** help agent understand parameters
- **Error handling** prevents crashes

#### **Structured Tool (Advanced)**
```python
from langchain.tools import StructuredTool
from pydantic import BaseModel, Field

class PodStatusInput(BaseModel):
    pod_name: str = Field(description="Name of the pod to check")
    namespace: str = Field(default="default", description="Kubernetes namespace")

def get_pod_status_func(pod_name: str, namespace: str = "default") -> str:
    # Implementation here
    pass

pod_status_tool = StructuredTool(
    name="GetPodStatus",
    func=get_pod_status_func,
    description="Get status of a Kubernetes pod. Use first when diagnosing issues.",
    args_schema=PodStatusInput
)
```

**Benefits of StructuredTool**:
- ✅ Better input validation
- ✅ Clear parameter descriptions
- ✅ Type safety

### **4. Agents**

Agents decide which tools to call and when.

#### **Create ReAct Agent**
```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

# 1. Define LLM
llm = ChatOpenAI(model="gpt-4", temperature=0.0)

# 2. Define tools
tools = [get_pod_status, get_pod_logs, describe_pod]

# 3. Create prompt
prompt = PromptTemplate.from_template(react_prompt_template)

# 4. Create agent
agent = create_react_agent(
    llm=llm,
    tools=tools,
    prompt=prompt
)

# 5. Create executor (runs the agent)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=5,
    early_stopping_method="generate",
    handle_parsing_errors=True  # Gracefully handle LLM output errors
)
```

#### **Using the Agent**
```python
# Simple query
result = agent_executor.invoke({
    "input": "Why is pod nginx-abc123 crashing?"
})

print(result["output"])
```

#### **With Memory**
```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=10,
    memory_key="chat_history",
    return_messages=True
)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,  # Add memory
    verbose=True
)

# First query
result1 = agent_executor.invoke({
    "input": "Check status of pod nginx-abc"
})

# Follow-up (agent remembers we're talking about nginx-abc)
result2 = agent_executor.invoke({
    "input": "What are the logs?"
})
```

### **5. Memory**

Stores conversation history so the agent remembers context.

#### **ConversationBufferMemory** (Simple)
```python
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory()

# Manually add to memory
memory.save_context(
    {"input": "Hello"}, 
    {"output": "Hi! How can I help?"}
)

# Load memory
print(memory.load_memory_variables({}))
# Output: {"history": "Human: Hello\nAI: Hi! How can I help?"}
```

#### **ConversationBufferWindowMemory** (Recommended)
```python
from langchain.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=10,  # Keep last 10 exchanges
    memory_key="chat_history",
    return_messages=True  # Return as Message objects
)

# Use with agent
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory
)
```

#### **ConversationSummaryMemory** (Advanced)
```python
from langchain.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(temperature=0.0)

memory = ConversationSummaryMemory(
    llm=llm,  # Uses LLM to summarize
    memory_key="chat_history"
)

# Automatically summarizes long conversations
```

**Comparison**:

| Memory Type | Pros | Cons | Use Case |
|-------------|------|------|----------|
| BufferMemory | Simple, exact history | Can overflow tokens | Demos, short sessions |
| BufferWindowMemory ⭐ | Predictable, fixed size | Loses old context | Your K8s agent |
| SummaryMemory | Token efficient | Extra LLM calls, costs | Long sessions |
| SummaryBufferMemory | Best of both | Complex | Production at scale |

### **6. Chains** (Legacy, but useful to know)

Connect multiple components in sequence.

```python
from langchain.chains import LLMChain

# Simple chain
chain = LLMChain(llm=llm, prompt=prompt_template)
result = chain.invoke({"pod_name": "nginx-abc", "error": "CrashLoopBackOff"})
```

**Note**: Modern LangChain uses LCEL (LangChain Expression Language) instead:

```python
# Modern approach with LCEL
chain = prompt_template | llm | output_parser
result = chain.invoke({"pod_name": "nginx-abc"})
```

---

## 🏗️ **Building Your K8s Agent**

### **Complete Example**

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from langchain.tools import tool
import subprocess

# 1. Define Tools
@tool
def get_pod_status(pod_name: str, namespace: str = "default") -> str:
    """Get status of a Kubernetes pod. Use FIRST when diagnosing issues."""
    result = subprocess.run(
        ["kubectl", "get", "pod", pod_name, "-n", namespace],
        capture_output=True, text=True, timeout=5
    )
    return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"

@tool
def get_pod_logs(pod_name: str, namespace: str = "default", tail: int = 50) -> str:
    """Get pod logs. Use when pod is crashing to see error messages."""
    result = subprocess.run(
        ["kubectl", "logs", pod_name, "-n", namespace, f"--tail={tail}"],
        capture_output=True, text=True, timeout=10
    )
    return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"

@tool
def describe_pod(pod_name: str, namespace: str = "default") -> str:
    """Get detailed pod info and events. Use when status and logs aren't enough."""
    result = subprocess.run(
        ["kubectl", "describe", "pod", pod_name, "-n", namespace],
        capture_output=True, text=True, timeout=10
    )
    return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"

tools = [get_pod_status, get_pod_logs, describe_pod]

# 2. Define Prompt
react_prompt = """
You are a Kubernetes troubleshooting expert with access to diagnostic tools.

Available tools:
{tools}

Use this format:

Question: the user's question
Thought: think about what to do next
Action: the tool to use (one of [{tool_names}])
Action Input: the input for the tool
Observation: the result from the tool
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Final Answer: provide complete diagnosis and recommended fixes

Guidelines:
- Use GetPodStatus FIRST to check pod state
- If CrashLoopBackOff, use GetPodLogs to see errors
- If Pending or ImagePullBackOff, use DescribePod for events
- Always provide actionable recommendations

Question: {input}
Thought: {agent_scratchpad}
"""

prompt = PromptTemplate.from_template(react_prompt)

# 3. Create LLM
llm = ChatOpenAI(model="gpt-4", temperature=0.0)

# 4. Create Agent
agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)

# 5. Create Memory
memory = ConversationBufferWindowMemory(
    k=10,
    memory_key="chat_history",
    return_messages=True
)

# 6. Create Agent Executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    verbose=True,
    max_iterations=5,
    early_stopping_method="generate",
    handle_parsing_errors=True
)

# 7. Use It!
if __name__ == "__main__":
    # First query
    result = agent_executor.invoke({
        "input": "Check if pod nginx-deployment-abc123 is running"
    })
    print(result["output"])
    
    # Follow-up query (agent remembers context)
    result = agent_executor.invoke({
        "input": "What are the logs?"
    })
    print(result["output"])
```

---

## 🎨 **Advanced Patterns**

### **Pattern 1: Custom Output Parser**

Parse agent output into structured format:

```python
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

class DiagnosisOutput(BaseModel):
    pod_name: str = Field(description="Name of the pod")
    status: str = Field(description="Current pod status")
    root_cause: str = Field(description="Root cause of the issue")
    fixes: list[str] = Field(description="List of recommended fixes")

parser = PydanticOutputParser(pydantic_object=DiagnosisOutput)

# Add to prompt
format_instructions = parser.get_format_instructions()
prompt_with_format = f"{react_prompt}\n\n{format_instructions}"
```

### **Pattern 2: Fallback LLM**

Use cheaper model, fallback to better one if needed:

```python
from langchain.chat_models import ChatOpenAI
from langchain.llms import Ollama

# Primary: Free local model
primary_llm = Ollama(model="llama3")

# Fallback: Paid but better
fallback_llm = ChatOpenAI(model="gpt-4", temperature=0.0)

# Create agent with fallback
llm_with_fallback = primary_llm.with_fallbacks([fallback_llm])

agent = create_react_agent(
    llm=llm_with_fallback,
    tools=tools,
    prompt=prompt
)
```

### **Pattern 3: Streaming Responses**

Stream agent output in real-time:

```python
for chunk in agent_executor.stream({"input": "Why is pod crashing?"}):
    if "output" in chunk:
        print(chunk["output"], end="", flush=True)
```

### **Pattern 4: Async Execution**

Run agent asynchronously:

```python
import asyncio

async def diagnose_async(pod_name: str):
    result = await agent_executor.ainvoke({
        "input": f"Diagnose pod {pod_name}"
    })
    return result["output"]

# Use it
result = asyncio.run(diagnose_async("nginx-abc"))
```

---

## 🚨 **Common Pitfalls**

### **Pitfall 1: Not Handling Tool Errors**

❌ **Bad**:
```python
@tool
def get_pod_status(pod_name: str) -> str:
    """Get pod status."""
    result = subprocess.run(["kubectl", "get", "pod", pod_name])
    return result.stdout  # Might crash if pod doesn't exist!
```

✅ **Good**:
```python
@tool
def get_pod_status(pod_name: str) -> str:
    """Get pod status."""
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            return f"Error: {result.stderr}"
            
        return result.stdout
    except subprocess.TimeoutExpired:
        return "Error: Command timed out"
    except Exception as e:
        return f"Error: {str(e)}"
```

### **Pitfall 2: Vague Tool Descriptions**

❌ **Bad**:
```python
@tool
def check_pod(pod_name: str) -> str:
    """Checks pod."""  # Too vague!
```

✅ **Good**:
```python
@tool
def get_pod_status(pod_name: str) -> str:
    """Get the current status of a Kubernetes pod.
    
    Use this tool when you need to check if a pod is:
    - Running (healthy)
    - Pending (waiting to start)
    - CrashLoopBackOff (repeatedly crashing)
    - ImagePullBackOff (can't pull container image)
    - Error or Unknown state
    
    This should be your FIRST tool when diagnosing any pod issue.
    Based on the status, decide which tool to use next:
    - CrashLoopBackOff → Use GetPodLogs to see crash reason
    - Pending → Use DescribePod to see why it can't start
    - ImagePullBackOff → Use DescribePod to see image details
    """
```

### **Pitfall 3: Not Setting max_iterations**

❌ **Bad**:
```python
agent_executor = AgentExecutor(agent=agent, tools=tools)
# No max_iterations = potential infinite loop!
```

✅ **Good**:
```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5,
    early_stopping_method="generate"
)
```

### **Pitfall 4: Using High Temperature**

❌ **Bad**:
```python
llm = ChatOpenAI(temperature=1.0)  # Too random for tool calling!
```

✅ **Good**:
```python
llm = ChatOpenAI(temperature=0.0)  # Deterministic, consistent
```

---

## 🎓 **Self-Check Questions**

### **Question 1**: What are the 5 core components you need to create a LangChain agent?

<details>
<summary>Show Answer</summary>

1. **LLM**: The language model (ChatOpenAI, Ollama, etc.)
2. **Tools**: Functions the agent can call
3. **Prompt**: Template that defines agent behavior (ReAct format)
4. **Agent**: Created with `create_react_agent(llm, tools, prompt)`
5. **AgentExecutor**: Runs the agent with configuration (max_iterations, memory, etc.)

Optional but recommended:
- **Memory**: To maintain conversation context

</details>

### **Question 2**: What's the difference between ConversationBufferMemory and ConversationBufferWindowMemory?

<details>
<summary>Show Answer</summary>

**ConversationBufferMemory**:
- Stores ALL conversation history
- Can overflow token limits in long conversations
- Best for: Short sessions, demos

**ConversationBufferWindowMemory**:
- Stores only the last `k` exchanges
- Fixed memory size, predictable token usage
- Loses old context but prevents overflow
- Best for: Your K8s agent, multi-turn debugging

Example:
```python
# Buffer: Stores everything
memory = ConversationBufferMemory()

# BufferWindow: Only keeps last 10 exchanges
memory = ConversationBufferWindowMemory(k=10)
```

</details>

### **Question 3**: Why is the tool's docstring so important?

<details>
<summary>Show Answer</summary>

The **docstring is the tool description** that the agent reads to decide when to use the tool.

**Without good docstring**:
- Agent doesn't know when to call the tool
- Might call wrong tools
- Gets confused with similar tools

**With good docstring**:
- Agent knows exactly when to use it
- Understands what inputs are needed
- Knows what output to expect

**Best practices for docstrings**:
1. Start with what the tool does (one sentence)
2. Explain WHEN to use it ("Use this when...")
3. List valid input parameters
4. Describe the output format
5. Give examples if complex
6. Suggest next steps ("After this, use...")

</details>

### **Question 4**: Write the code to create a basic K8s agent with 3 tools

<details>
<summary>Show Answer</summary>

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.tools import tool
import subprocess

# 1. Define tools
@tool
def get_pod_status(pod_name: str) -> str:
    """Get pod status. Use FIRST."""
    result = subprocess.run(
        ["kubectl", "get", "pod", pod_name],
        capture_output=True, text=True
    )
    return result.stdout

@tool
def get_pod_logs(pod_name: str) -> str:
    """Get pod logs. Use when pod is crashing."""
    result = subprocess.run(
        ["kubectl", "logs", pod_name, "--tail=50"],
        capture_output=True, text=True
    )
    return result.stdout

@tool
def describe_pod(pod_name: str) -> str:
    """Get detailed pod info. Use for events and config."""
    result = subprocess.run(
        ["kubectl", "describe", "pod", pod_name],
        capture_output=True, text=True
    )
    return result.stdout

tools = [get_pod_status, get_pod_logs, describe_pod]

# 2. Define prompt
react_prompt = """
Answer the following question using these tools: {tools}

Use this format:
Question: {input}
Thought: [your reasoning]
Action: [tool name]
Action Input: [tool input]
Observation: [tool output]
... (repeat as needed)
Final Answer: [complete answer]

Question: {input}
{agent_scratchpad}
"""

# 3. Create agent
llm = ChatOpenAI(model="gpt-4", temperature=0.0)
prompt = PromptTemplate.from_template(react_prompt)
agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)

# 4. Create executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5,
    verbose=True
)

# 5. Use it
result = agent_executor.invoke({
    "input": "Why is pod nginx-abc crashing?"
})
print(result["output"])
```

</details>

### **Question 5**: What's the purpose of handle_parsing_errors=True in AgentExecutor?

<details>
<summary>Show Answer</summary>

**handle_parsing_errors=True** makes the agent more robust by handling cases where the LLM generates malformed output.

**Without it**:
```python
# LLM outputs invalid format:
"Action: GetPodStatus nginx-abc"  # Missing proper JSON format
# Result: Agent crashes with parsing error
```

**With it**:
```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    handle_parsing_errors=True  # ✅ Graceful handling
)

# LLM outputs invalid format → Agent catches it and asks LLM to retry
# "Please format your response correctly using Action: ... and Action Input: ..."
```

**Always use this in production** to prevent crashes from occasional LLM formatting mistakes.

</details>

---

## 🚀 **Key Takeaways**

1. **LangChain provides abstractions**: Less boilerplate, more functionality
2. **Core components**: LLM, Tools, Prompt, Agent, AgentExecutor, Memory
3. **Tools need excellent docstrings**: Agent uses them to decide when to call
4. **Use ChatOpenAI with temperature=0.0**: Deterministic tool calling
5. **BufferWindowMemory is best**: For your K8s agent (k=10)
6. **Set max_iterations**: Prevent infinite loops (5-10 typical)
7. **Handle errors gracefully**: Try/except in tools, handle_parsing_errors=True
8. **Test incrementally**: Build tools → test individually → combine into agent

---

## 🔗 **Next Module**

Move on to **Module 8: Memory Types & Context Management** for deeper understanding of conversation memory!

---

**Time to complete this module**: 1 hour  
**Hands-on practice**: 30 minutes  
**Total**: ~1.5 hours
