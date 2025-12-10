# Module 9: Output Parsers & Structured Outputs

**Study Time**: ~30 minutes  
**Prerequisites**: Module 7 (LangChain Components)

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. Why structured outputs matter
2. Different output parser types
3. How to enforce JSON/structured responses
4. Error handling for malformed outputs
5. Best practices for production systems

---

## 📤 **Why Structured Outputs?**

### **Problem: Unpredictable Text**

LLMs return free-form text by default:

```python
user: "Diagnose pod nginx-abc"
agent: "Well, the pod nginx-abc seems to be experiencing some issues. 
        It's in CrashLoopBackOff state, which means... [long paragraph]"
```

**Issues**:
- ❌ Hard to parse programmatically
- ❌ Inconsistent format
- ❌ Can't easily extract specific fields
- ❌ Difficult to display in UI (tables, cards, etc.)

### **Solution: Structured Outputs**

```python
user: "Diagnose pod nginx-abc"
agent: {
  "pod_name": "nginx-abc",
  "status": "CrashLoopBackOff",
  "root_cause": "Missing ConfigMap 'nginx-config'",
  "severity": "high",
  "recommended_fixes": [
    "Create ConfigMap 'nginx-config' with nginx.conf",
    "Or update Deployment to reference existing ConfigMap"
  ]
}
```

**Benefits**:
- ✅ Easy to parse (JSON)
- ✅ Consistent structure
- ✅ Can extract specific fields
- ✅ Easy to display in UI
- ✅ Type-safe (if using Pydantic)

---

## 🔧 **Output Parser Types**

### **1. StrOutputParser (Default)**

Returns plain string.

```python
from langchain_core.output_parsers import StrOutputParser

parser = StrOutputParser()

# LLM output: "The pod is crashing"
result = parser.parse("The pod is crashing")
print(result)  # "The pod is crashing"
```

**Use when**: You want free-form text (explanations, summaries).

### **2. JSONOutputParser**

Parses JSON from LLM output.

```python
from langchain.output_parsers import ResponseSchema, StructuredOutputParser

# Define expected fields
response_schemas = [
    ResponseSchema(name="pod_name", description="Name of the pod"),
    ResponseSchema(name="status", description="Current pod status"),
    ResponseSchema(name="root_cause", description="Why pod is failing")
]

parser = StructuredOutputParser.from_response_schemas(response_schemas)

# Get format instructions
format_instructions = parser.get_format_instructions()
print(format_instructions)
```

**Output** (format instructions for LLM):
```
The output should be a markdown code snippet formatted in the following schema:

```json
{
    "pod_name": string  // Name of the pod
    "status": string  // Current pod status
    "root_cause": string  // Why pod is failing
}
```
```

**Usage**:
```python
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

# Create prompt with format instructions
prompt = PromptTemplate(
    template="Diagnose this pod: {pod_name}\n\n{format_instructions}",
    input_variables=["pod_name"],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

# Create chain
llm = ChatOpenAI(temperature=0.0)
chain = prompt | llm | parser

# Invoke
result = chain.invoke({"pod_name": "nginx-abc"})
print(result)
# Output: {"pod_name": "nginx-abc", "status": "CrashLoopBackOff", "root_cause": "..."}
```

### **3. PydanticOutputParser** ⭐

Type-safe structured outputs using Pydantic models.

```python
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import List

# Define output schema
class PodDiagnosis(BaseModel):
    pod_name: str = Field(description="Name of the pod")
    namespace: str = Field(description="Kubernetes namespace")
    status: str = Field(description="Pod status (Running, CrashLoopBackOff, etc.)")
    root_cause: str = Field(description="Root cause of the issue")
    severity: str = Field(description="Severity: low, medium, high, critical")
    recommended_fixes: List[str] = Field(description="List of recommended fixes")

# Create parser
parser = PydanticOutputParser(pydantic_object=PodDiagnosis)

# Get format instructions
format_instructions = parser.get_format_instructions()
```

**Format instructions output**:
```
The output should be formatted as a JSON instance that conforms to the JSON schema below.

{
  "properties": {
    "pod_name": {"type": "string", "description": "Name of the pod"},
    "namespace": {"type": "string", "description": "Kubernetes namespace"},
    "status": {"type": "string", "description": "Pod status"},
    "root_cause": {"type": "string", "description": "Root cause"},
    "severity": {"type": "string", "description": "Severity: low, medium, high, critical"},
    "recommended_fixes": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["pod_name", "namespace", "status", "root_cause", "severity", "recommended_fixes"]
}
```

**Usage**:
```python
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

prompt = PromptTemplate(
    template="""
    You are a Kubernetes troubleshooting expert.
    Diagnose this pod: {pod_name}
    
    {format_instructions}
    """,
    input_variables=["pod_name"],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

llm = ChatOpenAI(model="gpt-4", temperature=0.0)
chain = prompt | llm | parser

# Invoke
result: PodDiagnosis = chain.invoke({"pod_name": "nginx-abc"})

# Type-safe access
print(result.pod_name)  # "nginx-abc"
print(result.status)  # "CrashLoopBackOff"
print(result.severity)  # "high"
print(result.recommended_fixes[0])  # First fix
```

**Benefits**:
- ✅ Type safety (IDE autocomplete, type checking)
- ✅ Validation (Pydantic validates types)
- ✅ Clear schema definition
- ✅ Easy to extend

### **4. OutputFixingParser**

Automatically fixes malformed outputs.

```python
from langchain.output_parsers import OutputFixingParser
from langchain_openai import ChatOpenAI

# Original parser
base_parser = PydanticOutputParser(pydantic_object=PodDiagnosis)

# Wrap with fixing parser
fixing_parser = OutputFixingParser.from_llm(
    parser=base_parser,
    llm=ChatOpenAI(model="gpt-4", temperature=0.0)
)

# If LLM returns malformed JSON, fixing parser uses another LLM call to fix it
malformed_output = '{"pod_name": "nginx-abc", "status": "CrashLoopBackOff"'  # Missing closing }

try:
    result = base_parser.parse(malformed_output)
except Exception as e:
    print(f"Base parser failed: {e}")
    
    # Fixing parser tries to fix it
    result = fixing_parser.parse(malformed_output)
    print(f"Fixed! {result}")
```

**Trade-off**:
- ✅ More robust (handles malformed outputs)
- ❌ Extra LLM call (costs money, adds latency)

---

## 🎨 **Complete Example: Structured K8s Diagnosis**

```python
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from typing import List, Literal

# 1. Define output schema
class PodDiagnosis(BaseModel):
    pod_name: str = Field(description="Name of the pod being diagnosed")
    namespace: str = Field(default="default", description="Kubernetes namespace")
    current_status: Literal["Running", "Pending", "CrashLoopBackOff", "Error", "Unknown"] = \
        Field(description="Current pod status")
    root_cause: str = Field(description="Root cause of the issue")
    severity: Literal["low", "medium", "high", "critical"] = \
        Field(description="Issue severity")
    affected_components: List[str] = Field(
        description="List of affected components (containers, volumes, etc.)"
    )
    recommended_fixes: List[str] = Field(
        description="Ordered list of recommended fixes, most likely first"
    )
    kubectl_commands: List[str] = Field(
        description="Kubectl commands to apply fixes"
    )

# 2. Create parser
parser = PydanticOutputParser(pydantic_object=PodDiagnosis)

# 3. Create prompt
prompt = PromptTemplate(
    template="""
    You are a Kubernetes expert. Diagnose the following pod issue:
    
    Pod Name: {pod_name}
    Namespace: {namespace}
    Status: {status}
    Logs: {logs}
    Events: {events}
    
    Provide a complete diagnosis.
    
    {format_instructions}
    """,
    input_variables=["pod_name", "namespace", "status", "logs", "events"],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

# 4. Create chain
llm = ChatOpenAI(model="gpt-4", temperature=0.0)
diagnosis_chain = prompt | llm | parser

# 5. Use it
result: PodDiagnosis = diagnosis_chain.invoke({
    "pod_name": "nginx-abc123",
    "namespace": "production",
    "status": "CrashLoopBackOff",
    "logs": "Error: Config file /etc/nginx/nginx.conf not found",
    "events": "MountVolume.SetUp failed: configmap 'nginx-config' not found"
})

# 6. Access structured data
print(f"Pod: {result.pod_name}")
print(f"Status: {result.current_status}")
print(f"Severity: {result.severity}")
print(f"Root Cause: {result.root_cause}")
print("\nRecommended Fixes:")
for i, fix in enumerate(result.recommended_fixes, 1):
    print(f"  {i}. {fix}")
print("\nCommands:")
for cmd in enumerate(result.kubectl_commands):
    print(f"  $ {cmd}")
```

**Example Output**:
```
Pod: nginx-abc123
Status: CrashLoopBackOff
Severity: high
Root Cause: Pod is trying to mount ConfigMap 'nginx-config' which doesn't exist

Recommended Fixes:
  1. Create the missing ConfigMap 'nginx-config' with required nginx configuration
  2. Update Deployment to reference an existing ConfigMap
  3. Verify ConfigMap name matches what's specified in pod spec

Commands:
  $ kubectl create configmap nginx-config --from-file=nginx.conf
  $ kubectl get configmap -n production
  $ kubectl describe deployment nginx -n production
```

---

## 🔧 **Using with Agents**

### **Challenge**

Agents use ReAct pattern (Thought → Action → Observation), which conflicts with structured output.

### **Solution: Separate Final Answer Parsing**

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

class DiagnosisResult(BaseModel):
    root_cause: str = Field(description="Root cause")
    fixes: List[str] = Field(description="Recommended fixes")

# Create agent as usual
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools)

# Get agent output
agent_output = agent_executor.invoke({"input": "Diagnose pod nginx-abc"})

# Parse final answer into structured format
parser = PydanticOutputParser(pydantic_object=DiagnosisResult)

parse_prompt = f"""
Extract structured information from this diagnosis:

{agent_output['output']}

{parser.get_format_instructions()}
"""

structured_result = (llm | parser).invoke(parse_prompt)
print(structured_result.root_cause)
print(structured_result.fixes)
```

**Pattern**: Let agent work naturally, then structure the final output.

---

## ⚠️ **Handling Parsing Errors**

### **Problem**

LLM might not follow format perfectly:

```python
# Expected:
{"pod_name": "nginx-abc", "status": "Running"}

# Actual LLM output:
"The pod nginx-abc is Running"  # Not JSON!
```

### **Solution 1: OutputFixingParser**

```python
from langchain.output_parsers import OutputFixingParser

base_parser = PydanticOutputParser(pydantic_object=PodDiagnosis)
fixing_parser = OutputFixingParser.from_llm(
    parser=base_parser,
    llm=ChatOpenAI(model="gpt-4")
)

# Automatically fixes malformed output
result = fixing_parser.parse(malformed_output)
```

### **Solution 2: RetryOutputParser**

```python
from langchain.output_parsers import RetryWithErrorOutputParser

base_parser = PydanticOutputParser(pydantic_object=PodDiagnosis)

# If parsing fails, retry with error message
retry_parser = RetryWithErrorOutputParser.from_llm(
    parser=base_parser,
    llm=ChatOpenAI(model="gpt-4")
)

# Parse with original prompt
try:
    result = base_parser.parse(llm_output)
except Exception as e:
    # Retry with error context
    result = retry_parser.parse_with_prompt(llm_output, original_prompt)
```

### **Solution 3: Try-Except with Fallback**

```python
def safe_parse(output: str, parser: PydanticOutputParser):
    try:
        return parser.parse(output)
    except Exception as e:
        print(f"Parsing failed: {e}")
        # Return default structure
        return PodDiagnosis(
            pod_name="unknown",
            namespace="default",
            current_status="Unknown",
            root_cause="Failed to parse diagnosis",
            severity="low",
            affected_components=[],
            recommended_fixes=["Manual investigation required"],
            kubectl_commands=[]
        )

result = safe_parse(llm_output, parser)
```

---

## 🎯 **Best Practices**

### **1. Keep Schemas Simple**

❌ **Bad** (too complex):
```python
class OverlyComplexDiagnosis(BaseModel):
    pod: PodInfo
    containers: List[ContainerInfo]
    volumes: List[VolumeInfo]
    network: NetworkInfo
    resource_usage: ResourceMetrics
    historical_data: List[HistoricalEvent]
    # ... 20 more fields
```

✅ **Good** (focused):
```python
class SimpleDiagnosis(BaseModel):
    pod_name: str
    status: str
    root_cause: str
    fixes: List[str]
```

**Why**: Simpler schemas have higher LLM compliance rates.

### **2. Use Descriptive Field Names**

❌ **Bad**:
```python
class Diagnosis(BaseModel):
    n: str  # What is 'n'?
    s: str  # What is 's'?
    f: List[str]  # What is 'f'?
```

✅ **Good**:
```python
class Diagnosis(BaseModel):
    pod_name: str = Field(description="Name of the pod")
    status: str = Field(description="Current status")
    fixes: List[str] = Field(description="Recommended fixes")
```

### **3. Provide Examples in Descriptions**

```python
class Diagnosis(BaseModel):
    severity: str = Field(
        description="Severity level. Must be one of: low, medium, high, critical. "
                    "Example: 'high' for CrashLoopBackOff, 'low' for minor resource issues."
    )
```

### **4. Use Enums for Limited Choices**

```python
from enum import Enum

class PodStatus(str, Enum):
    RUNNING = "Running"
    PENDING = "Pending"
    CRASH_LOOP = "CrashLoopBackOff"
    ERROR = "Error"

class Diagnosis(BaseModel):
    status: PodStatus  # LLM must use one of these
```

### **5. Set Defaults**

```python
class Diagnosis(BaseModel):
    pod_name: str
    namespace: str = Field(default="default")  # Default value
    severity: str = Field(default="medium")
```

---

## 🎓 **Self-Check Questions**

### **Question 1**: Why use structured outputs instead of free-form text?

<details>
<summary>Show Answer</summary>

**Structured outputs provide**:
1. **Parseable data**: Easy to extract specific fields
2. **Consistency**: Same format every time
3. **Type safety**: With Pydantic, compile-time checking
4. **UI integration**: Easy to display in tables, cards, dashboards
5. **Downstream processing**: Can feed into other systems

**Example**:
```python
# Free-form: Hard to parse
"The pod nginx-abc is crashing because config is missing. Fix: create ConfigMap."

# Structured: Easy to use
{
  "pod_name": "nginx-abc",
  "root_cause": "Missing ConfigMap",
  "fixes": ["Create ConfigMap nginx-config"]
}
```

</details>

### **Question 2**: What's the difference between JSONOutputParser and PydanticOutputParser?

<details>
<summary>Show Answer</summary>

**JSONOutputParser**:
- Returns dict (untyped)
- Basic validation (is it valid JSON?)
- Lightweight

**PydanticOutputParser**:
- Returns Pydantic model (typed)
- Full validation (types, required fields, constraints)
- IDE autocomplete and type checking
- More robust

**Example**:
```python
# JSONOutputParser
result = {"pod_name": "nginx-abc"}  # Just a dict
print(result["pod_name"])  # No autocomplete

# PydanticOutputParser
result: PodDiagnosis = ...  # Typed model
print(result.pod_name)  # IDE autocomplete! ✅
print(result.status)    # Type checking! ✅
```

**For production**: Use PydanticOutputParser for type safety.

</details>

### **Question 3**: When would you use OutputFixingParser?

<details>
<summary>Show Answer</summary>

**Use OutputFixingParser when**:
- LLM occasionally returns malformed JSON
- You need high reliability (can't have parsing failures)
- Willing to accept extra LLM call for fixing

**How it works**:
```python
fixing_parser = OutputFixingParser.from_llm(
    parser=base_parser,
    llm=ChatOpenAI(model="gpt-4")
)

# If LLM returns: '{"pod_name": "nginx-abc", "status": "Running"'  (missing })
# OutputFixingParser makes another LLM call to fix it
result = fixing_parser.parse(malformed_output)  # Fixed!
```

**Trade-off**:
- ✅ More robust
- ❌ Extra cost (additional LLM call)
- ❌ Extra latency

**Alternative**: Use try-except with sensible defaults.

</details>

### **Question 4**: How do you use structured outputs with ReAct agents?

<details>
<summary>Show Answer</summary>

**Problem**: ReAct agents output "Thought → Action → Observation" format, not structured JSON.

**Solution**: Parse final answer separately.

```python
# 1. Let agent work naturally
agent_executor = AgentExecutor(agent=agent, tools=tools)
result = agent_executor.invoke({"input": "Diagnose pod nginx-abc"})

# 2. Parse the final answer into structured format
parse_prompt = f"""
Extract structured info from this diagnosis:

{result['output']}

{parser.get_format_instructions()}
"""

# 3. Get structured output
structured = (llm | parser).invoke(parse_prompt)

# 4. Use typed result
print(structured.pod_name)
print(structured.fixes)
```

**Pattern**: Agent does reasoning → Extract structure from final answer.

</details>

### **Question 5**: Write a Pydantic model for K8s pod diagnosis with 5 fields

<details>
<summary>Show Answer</summary>

```python
from pydantic import BaseModel, Field
from typing import List, Literal

class PodDiagnosis(BaseModel):
    """Structured diagnosis of a Kubernetes pod issue"""
    
    pod_name: str = Field(
        description="Name of the pod being diagnosed"
    )
    
    status: Literal["Running", "Pending", "CrashLoopBackOff", "Error"] = Field(
        description="Current pod status"
    )
    
    root_cause: str = Field(
        description="Root cause of the issue (one sentence)"
    )
    
    severity: Literal["low", "medium", "high", "critical"] = Field(
        description="Issue severity"
    )
    
    fixes: List[str] = Field(
        description="Ordered list of recommended fixes (2-5 items)"
    )

# Usage
parser = PydanticOutputParser(pydantic_object=PodDiagnosis)
```

**Key features**:
- ✅ Clear field descriptions
- ✅ Type hints (str, List, Literal)
- ✅ Enums for limited choices (Literal)
- ✅ Descriptive names
- ✅ Docstring for the class

</details>

---

## 🚀 **Key Takeaways**

1. **Structured outputs enable programmatic use**: JSON > free text
2. **PydanticOutputParser is best**: Type-safe, validated, IDE support
3. **Simple schemas have higher compliance**: Don't overcomplicate
4. **Use fixing parsers for robustness**: But understand the cost
5. **Descriptive field names and examples help**: LLM follows better
6. **Agents + structured outputs**: Let agent reason, then parse final answer
7. **Always handle parsing errors**: try-except or OutputFixingParser

---

## 🔗 **Next Module**

Move on to **Module 10: RAG Pattern & Vector Databases** to learn about retrieval-augmented generation!

---

**Time to complete this module**: 30 minutes  
**Hands-on practice**: 15 minutes  
**Total**: ~45 minutes
