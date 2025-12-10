# Module 11: Error Handling & Production Patterns

**Study Time**: ~45 minutes  
**Prerequisites**: Modules 1-10

---

## 🎯 **Learning Objectives**

By the end of this module, you'll understand:
1. Common failure modes in AI systems
2. Error handling patterns for LLMs and agents
3. Retry logic and circuit breakers
4. Logging and observability
5. Production-ready code patterns
6. How to make your K8s agent robust

---

## ⚠️ **Common Failure Modes**

### **1. API Errors**

**Problem**: OpenAI/API rate limits, timeouts, network issues

```python
# ❌ No error handling
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Help"}]
)
# Crashes if API is down!
```

**Solution**: Try-except with retries

```python
import time
from openai import OpenAI, APIError, RateLimitError

client = OpenAI()

def call_llm_with_retry(messages, max_retries=3):
    """Call LLM with exponential backoff retry"""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                timeout=30  # 30 second timeout
            )
            return response.choices[0].message.content
            
        except RateLimitError:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                return "Error: API rate limit exceeded. Try again later."
                
        except APIError as e:
            if attempt < max_retries - 1:
                print(f"API error: {e}. Retrying...")
                time.sleep(1)
            else:
                return f"Error: API unavailable. {str(e)}"
                
        except Exception as e:
            return f"Unexpected error: {str(e)}"
    
    return "Error: Max retries exceeded"

# Use it
result = call_llm_with_retry([
    {"role": "user", "content": "Why is pod crashing?"}
])
```

### **2. Tool Execution Errors**

**Problem**: kubectl command fails, pod doesn't exist, timeout

```python
# ❌ No error handling
@tool
def get_pod_status(pod_name: str) -> str:
    """Get pod status"""
    result = subprocess.run(["kubectl", "get", "pod", pod_name])
    return result.stdout  # Crashes if pod doesn't exist!
```

**Solution**: Comprehensive error handling

```python
import subprocess
from langchain.tools import tool

@tool
def get_pod_status(pod_name: str, namespace: str = "default") -> str:
    """Get status of a Kubernetes pod.
    
    Args:
        pod_name: Name of the pod
        namespace: K8s namespace (default: default)
    
    Returns:
        Pod status or error message
    """
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name, "-n", namespace, "-o", "wide"],
            capture_output=True,
            text=True,
            timeout=10  # 10 second timeout
        )
        
        if result.returncode != 0:
            # Command failed
            if "not found" in result.stderr.lower():
                return f"Pod '{pod_name}' not found in namespace '{namespace}'"
            else:
                return f"Error: {result.stderr.strip()}"
        
        # Success
        return result.stdout.strip()
        
    except subprocess.TimeoutExpired:
        return f"Error: kubectl command timed out after 10 seconds"
        
    except FileNotFoundError:
        return "Error: kubectl not found. Is it installed?"
        
    except Exception as e:
        return f"Unexpected error: {str(e)}"

# All errors return string messages, agent can handle gracefully
```

### **3. Parsing Errors**

**Problem**: Agent output doesn't match expected format

```python
# ❌ Agent might return malformed output
agent_executor = AgentExecutor(agent=agent, tools=tools)
# Crashes if LLM returns invalid format!
```

**Solution**: handle_parsing_errors

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    handle_parsing_errors=True,  # ✅ Catch parsing errors
    handle_parsing_errors_message="Invalid format. Please use:\nThought: ...\nAction: ...\nAction Input: ..."
)
```

### **4. Infinite Loops**

**Problem**: Agent repeats same action forever

```python
# ❌ No iteration limit
agent_executor = AgentExecutor(agent=agent, tools=tools)
# Might loop forever!
```

**Solution**: max_iterations

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=5,  # ✅ Stop after 5 iterations
    early_stopping_method="generate"  # ✅ Generate best answer when limit hit
)
```

### **5. Token Overflow**

**Problem**: Conversation history exceeds context window

```python
# ❌ Unbounded memory
memory = ConversationBufferMemory()
# Grows forever, eventually crashes!
```

**Solution**: Window memory

```python
memory = ConversationBufferWindowMemory(
    k=10,  # ✅ Only keep last 10 exchanges
    memory_key="chat_history"
)
```

---

## 🔄 **Retry Patterns**

### **Pattern 1: Simple Retry**

```python
def retry_on_failure(func, max_attempts=3):
    """Simple retry wrapper"""
    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            if attempt < max_attempts - 1:
                print(f"Attempt {attempt + 1} failed: {e}. Retrying...")
                continue
            else:
                print(f"All {max_attempts} attempts failed")
                raise
```

### **Pattern 2: Exponential Backoff**

```python
import time

def exponential_backoff_retry(func, max_attempts=5, base_delay=1):
    """Retry with exponential backoff: 1s, 2s, 4s, 8s, 16s"""
    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            if attempt < max_attempts - 1:
                delay = base_delay * (2 ** attempt)
                print(f"Attempt {attempt + 1} failed. Waiting {delay}s...")
                time.sleep(delay)
            else:
                raise

# Use it
result = exponential_backoff_retry(
    lambda: agent_executor.invoke({"input": "Diagnose pod"})
)
```

### **Pattern 3: Retry with Different Strategy**

```python
def retry_with_fallback(primary_func, fallback_func, max_attempts=3):
    """Try primary, fallback to secondary on failure"""
    for attempt in range(max_attempts):
        try:
            return primary_func()
        except Exception as e:
            print(f"Primary failed: {e}")
            if attempt < max_attempts - 1:
                continue
            else:
                print("Falling back to secondary strategy...")
                return fallback_func()

# Example: Try GPT-4, fallback to GPT-3.5
result = retry_with_fallback(
    primary_func=lambda: call_gpt4(query),
    fallback_func=lambda: call_gpt35(query)
)
```

---

## 🛡️ **Circuit Breaker Pattern**

Prevent cascading failures by "opening the circuit" when errors exceed threshold.

```python
from datetime import datetime, timedelta

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout  # seconds
        self.failures = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        
    def call(self, func):
        """Execute function with circuit breaker protection"""
        
        # Check if circuit is open
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
                print("Circuit breaker HALF_OPEN, attempting call...")
            else:
                raise Exception("Circuit breaker is OPEN. Service unavailable.")
        
        # Try to call function
        try:
            result = func()
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        """Reset circuit on success"""
        self.failures = 0
        self.state = "CLOSED"
        print("Circuit breaker CLOSED")
    
    def _on_failure(self):
        """Record failure"""
        self.failures += 1
        self.last_failure_time = datetime.now()
        
        if self.failures >= self.failure_threshold:
            self.state = "OPEN"
            print(f"Circuit breaker OPEN after {self.failures} failures")
    
    def _should_attempt_reset(self):
        """Check if timeout has passed"""
        if self.last_failure_time is None:
            return True
        return datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout)

# Use it
breaker = CircuitBreaker(failure_threshold=3, timeout=30)

try:
    result = breaker.call(lambda: agent_executor.invoke({"input": query}))
except Exception as e:
    print(f"Request failed: {e}")
```

---

## 📊 **Logging & Observability**

### **Pattern 1: Structured Logging**

```python
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

def log_agent_call(query, result, duration, error=None):
    """Log agent invocation with structured data"""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "query": query,
        "success": error is None,
        "duration_ms": duration * 1000,
        "error": str(error) if error else None,
        "result_length": len(result) if result else 0
    }
    logger.info(json.dumps(log_entry))

# Use it
import time

query = "Why is pod crashing?"
start_time = time.time()

try:
    result = agent_executor.invoke({"input": query})
    duration = time.time() - start_time
    log_agent_call(query, result["output"], duration)
except Exception as e:
    duration = time.time() - start_time
    log_agent_call(query, None, duration, error=e)
    raise
```

### **Pattern 2: Agent Step Logging**

```python
def log_agent_steps(agent_executor, query):
    """Log each step of agent reasoning"""
    result = agent_executor.invoke(
        {"input": query},
        return_intermediate_steps=True
    )
    
    logger.info(f"Query: {query}")
    
    for i, (action, observation) in enumerate(result["intermediate_steps"], 1):
        logger.info(f"Step {i}:")
        logger.info(f"  Tool: {action.tool}")
        logger.info(f"  Input: {action.tool_input}")
        logger.info(f"  Output: {observation[:200]}...")  # First 200 chars
    
    logger.info(f"Final Answer: {result['output']}")
    
    return result

# Use it
result = log_agent_steps(agent_executor, "Diagnose pod nginx-abc")
```

### **Pattern 3: Metrics Tracking**

```python
from collections import defaultdict
from datetime import datetime

class AgentMetrics:
    def __init__(self):
        self.call_count = 0
        self.success_count = 0
        self.error_count = 0
        self.total_duration = 0
        self.tool_usage = defaultdict(int)
        
    def record_call(self, success, duration, tools_used):
        """Record metrics for an agent call"""
        self.call_count += 1
        
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
        
        self.total_duration += duration
        
        for tool in tools_used:
            self.tool_usage[tool] += 1
    
    def get_stats(self):
        """Get current metrics"""
        return {
            "total_calls": self.call_count,
            "success_rate": self.success_count / self.call_count if self.call_count > 0 else 0,
            "avg_duration_ms": (self.total_duration / self.call_count * 1000) if self.call_count > 0 else 0,
            "most_used_tools": sorted(self.tool_usage.items(), key=lambda x: x[1], reverse=True)[:5]
        }

# Use it
metrics = AgentMetrics()

start = time.time()
try:
    result = agent_executor.invoke({"input": query}, return_intermediate_steps=True)
    duration = time.time() - start
    tools_used = [step[0].tool for step in result["intermediate_steps"]]
    metrics.record_call(success=True, duration=duration, tools_used=tools_used)
except Exception:
    duration = time.time() - start
    metrics.record_call(success=False, duration=duration, tools_used=[])

# Print stats
print(json.dumps(metrics.get_stats(), indent=2))
```

---

## 🏗️ **Production-Ready Agent**

Complete example with all error handling patterns:

```python
import logging
import time
import subprocess
from typing import Optional
from langchain.agents import create_react_agent, AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.tools import tool
from openai import RateLimitError, APIError

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define tools with error handling
@tool
def get_pod_status(pod_name: str, namespace: str = "default") -> str:
    """Get status of a Kubernetes pod with comprehensive error handling."""
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name, "-n", namespace, "-o", "wide"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            if "not found" in result.stderr.lower():
                return f"Pod '{pod_name}' not found in namespace '{namespace}'"
            return f"Error: {result.stderr.strip()}"
        
        return result.stdout.strip()
        
    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after 10 seconds"
    except FileNotFoundError:
        return "Error: kubectl not installed"
    except Exception as e:
        logger.error(f"get_pod_status error: {e}")
        return f"Unexpected error: {str(e)}"

tools = [get_pod_status]  # Add more tools...

# Production-ready agent class
class ProductionK8sAgent:
    def __init__(
        self,
        model: str = "gpt-4",
        max_retries: int = 3,
        max_iterations: int = 5
    ):
        self.max_retries = max_retries
        self.call_count = 0
        self.error_count = 0
        
        # Create LLM with retry
        self.llm = ChatOpenAI(
            model=model,
            temperature=0.0,
            request_timeout=30
        )
        
        # Create memory
        self.memory = ConversationBufferWindowMemory(
            k=10,
            memory_key="chat_history",
            return_messages=True
        )
        
        # Create agent
        agent = create_react_agent(self.llm, tools, prompt_template)
        
        # Create executor with error handling
        self.agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            memory=self.memory,
            max_iterations=max_iterations,
            early_stopping_method="generate",
            handle_parsing_errors=True,
            verbose=True
        )
    
    def diagnose(self, query: str) -> dict:
        """Diagnose with full error handling and retry logic"""
        self.call_count += 1
        start_time = time.time()
        
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{self.max_retries}: {query}")
                
                result = self.agent_executor.invoke(
                    {"input": query},
                    return_intermediate_steps=True
                )
                
                duration = time.time() - start_time
                
                # Log success
                logger.info(f"Success in {duration:.2f}s")
                
                return {
                    "success": True,
                    "output": result["output"],
                    "duration": duration,
                    "attempts": attempt + 1,
                    "steps": len(result.get("intermediate_steps", []))
                }
                
            except RateLimitError as e:
                logger.warning(f"Rate limited on attempt {attempt + 1}")
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt
                    time.sleep(wait_time)
                else:
                    self.error_count += 1
                    return {
                        "success": False,
                        "error": "API rate limit exceeded",
                        "duration": time.time() - start_time
                    }
                    
            except APIError as e:
                logger.error(f"API error on attempt {attempt + 1}: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(1)
                else:
                    self.error_count += 1
                    return {
                        "success": False,
                        "error": f"API unavailable: {str(e)}",
                        "duration": time.time() - start_time
                    }
                    
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                self.error_count += 1
                return {
                    "success": False,
                    "error": str(e),
                    "duration": time.time() - start_time
                }
        
        # Should never reach here
        return {
            "success": False,
            "error": "Max retries exceeded",
            "duration": time.time() - start_time
        }
    
    def get_stats(self):
        """Get agent statistics"""
        return {
            "total_calls": self.call_count,
            "errors": self.error_count,
            "success_rate": (self.call_count - self.error_count) / self.call_count 
                           if self.call_count > 0 else 0
        }

# Use it
agent = ProductionK8sAgent(model="gpt-4", max_retries=3, max_iterations=5)

# Diagnose
result = agent.diagnose("Why is pod nginx-abc crashing?")

if result["success"]:
    print(f"✅ Diagnosis: {result['output']}")
    print(f"⏱️  Duration: {result['duration']:.2f}s")
else:
    print(f"❌ Error: {result['error']}")

# Check stats
print(agent.get_stats())
```

---

## 🎓 **Self-Check Questions**

### **Question 1**: What are the 5 common failure modes in AI agents?

<details>
<summary>Show Answer</summary>

1. **API Errors**: Rate limits, timeouts, network issues
2. **Tool Execution Errors**: kubectl fails, pod doesn't exist
3. **Parsing Errors**: Agent output doesn't match expected format
4. **Infinite Loops**: Agent repeats same action forever
5. **Token Overflow**: Conversation history exceeds context window

**Solutions**:
1. Retry with exponential backoff
2. Try-except in all tools, return error strings
3. handle_parsing_errors=True
4. max_iterations=5
5. ConversationBufferWindowMemory(k=10)

</details>

### **Question 2**: What is exponential backoff and when should you use it?

<details>
<summary>Show Answer</summary>

**Exponential backoff** is a retry strategy where wait time increases exponentially: 1s, 2s, 4s, 8s, 16s...

**Formula**: `wait_time = base_delay * (2 ** attempt)`

**When to use**:
- ✅ API rate limits (give server time to recover)
- ✅ Network timeouts (transient issues)
- ✅ Database connection errors

**Why it works**:
- Reduces load on failing service
- Gives service time to recover
- Prevents thundering herd problem

```python
for attempt in range(max_retries):
    try:
        return func()
    except Exception:
        wait = 2 ** attempt  # 1s, 2s, 4s, 8s
        time.sleep(wait)
```

</details>

### **Question 3**: What's the purpose of a circuit breaker?

<details>
<summary>Show Answer</summary>

**Circuit breaker** prevents cascading failures by "opening" when error rate exceeds threshold.

**States**:
1. **CLOSED**: Normal operation, requests pass through
2. **OPEN**: Too many failures, all requests fail immediately (don't even try)
3. **HALF_OPEN**: After timeout, try one request to test if service recovered

**Purpose**:
- Prevent wasting resources on failing service
- Give failing service time to recover
- Fail fast instead of hanging
- Protect dependent services

**Example**:
```python
# After 5 failures, circuit opens
# All requests fail immediately for 60 seconds
# After 60s, try one request
# If success → circuit closes
# If failure → circuit stays open another 60s
```

</details>

### **Question 4**: How do you make kubectl tools robust against errors?

<details>
<summary>Show Answer</summary>

```python
@tool
def get_pod_status(pod_name: str, namespace: str = "default") -> str:
    """Get pod status with comprehensive error handling"""
    try:
        result = subprocess.run(
            ["kubectl", "get", "pod", pod_name, "-n", namespace],
            capture_output=True,  # ✅ Capture stderr
            text=True,            # ✅ Decode as text
            timeout=10            # ✅ Prevent hanging
        )
        
        if result.returncode != 0:
            # ✅ Check specific errors
            if "not found" in result.stderr.lower():
                return f"Pod not found: {pod_name}"
            return f"Error: {result.stderr}"
        
        return result.stdout
        
    except subprocess.TimeoutExpired:
        # ✅ Handle timeout
        return "Error: Command timed out"
        
    except FileNotFoundError:
        # ✅ Handle missing kubectl
        return "Error: kubectl not installed"
        
    except Exception as e:
        # ✅ Catch-all for unexpected errors
        return f"Unexpected error: {str(e)}"
```

**Key points**:
- Always use timeout
- Capture stderr
- Check return code
- Handle specific errors (not found, timeout, missing binary)
- Return error strings (not raise exceptions)
- Agent can handle error messages gracefully

</details>

### **Question 5**: What should you log for production observability?

<details>
<summary>Show Answer</summary>

**Essential logs**:

1. **Request/Response**:
   - Query
   - Result
   - Duration
   - Success/failure

2. **Agent Steps**:
   - Tools called
   - Tool inputs
   - Tool outputs
   - Reasoning (thoughts)

3. **Errors**:
   - Error type
   - Error message
   - Stack trace
   - Retry attempts

4. **Metrics**:
   - Total calls
   - Success rate
   - Average duration
   - Tool usage frequency
   - Error rate by type

**Example**:
```python
log_entry = {
    "timestamp": "2025-12-09T10:30:00Z",
    "query": "Why is pod crashing?",
    "success": True,
    "duration_ms": 2340,
    "tools_used": ["GetPodStatus", "GetPodLogs"],
    "iterations": 2,
    "result_length": 450
}
```

**Why**:
- Debug issues
- Monitor performance
- Identify patterns
- Optimize tool usage
- Track success rates

</details>

---

## 🚀 **Key Takeaways**

1. **Always handle errors**: API, tools, parsing, loops, tokens
2. **Use retries with exponential backoff**: For transient failures
3. **Implement circuit breakers**: For cascading failures
4. **Log everything**: Queries, results, steps, errors, metrics
5. **Set timeouts**: On API calls and subprocess commands
6. **Return error strings from tools**: Don't raise exceptions
7. **Use max_iterations**: Prevent infinite loops
8. **Monitor metrics**: Success rate, duration, tool usage

---

## 🔗 **Next Module**

Move on to **Module 12: ML System Design & Best Practices** for high-level architecture patterns!

---

**Time to complete this module**: 45 minutes  
**Hands-on practice**: 30 minutes  
**Total**: ~1 hour 15 minutes
