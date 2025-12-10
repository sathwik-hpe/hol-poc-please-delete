# Module 02: Go Concurrency 🔀

## Master Goroutines, Channels, and Concurrent Programming

**Duration:** 4-5 hours  
**Prerequisites:** Module 01 - Go Fundamentals  
**Outcome:** Build efficient concurrent programs using Go's built-in concurrency primitives

---

## 📚 Table of Contents

1. [Why Concurrency Matters](#why-concurrency-matters)
2. [Goroutines](#goroutines)
3. [Channels](#channels)
4. [Select Statement](#select-statement)
5. [Buffered Channels](#buffered-channels)
6. [Channel Patterns](#channel-patterns)
7. [Sync Package](#sync-package)
8. [Context Package](#context-package)
9. [Common Concurrency Patterns](#common-concurrency-patterns)
10. [Race Conditions & How to Avoid Them](#race-conditions--how-to-avoid-them)
11. [Best Practices](#best-practices)
12. [Interview Questions](#interview-questions)
13. [Hands-On Exercise](#hands-on-exercise)

---

## Why Concurrency Matters

### Concurrency vs Parallelism

**Concurrency** = Dealing with multiple things at once (structure)  
**Parallelism** = Doing multiple things at once (execution)

```
Concurrency: I can juggle multiple tasks (check email, write code, answer calls)
Parallelism: Multiple people working on different tasks simultaneously
```

### Go's Approach to Concurrency

Go makes concurrency a first-class citizen with:
- **Goroutines** - Lightweight threads (2KB stack vs 1MB OS threads)
- **Channels** - Type-safe communication between goroutines
- **Select** - Multiplex channel operations
- **Simple syntax** - `go` keyword to launch concurrent execution

### Real-World Use Cases

✅ **Web Servers** - Handle thousands of concurrent HTTP requests  
✅ **Data Processing** - Process large datasets in parallel  
✅ **API Aggregation** - Call multiple APIs concurrently  
✅ **Background Jobs** - Run tasks asynchronously  
✅ **Real-time Systems** - Handle multiple event streams  

---

## Goroutines

### Basic Goroutine

A goroutine is a lightweight thread managed by Go runtime:

```go
package main

import (
    "fmt"
    "time"
)

func sayHello() {
    fmt.Println("Hello from goroutine!")
}

func main() {
    // Launch goroutine with 'go' keyword
    go sayHello()
    
    // Without sleep, main would exit before goroutine runs
    time.Sleep(100 * time.Millisecond)
    fmt.Println("Main function")
}

// Output:
// Hello from goroutine!
// Main function
```

### Multiple Goroutines

```go
func printNumbers() {
    for i := 1; i <= 5; i++ {
        fmt.Printf("Number: %d\n", i)
        time.Sleep(100 * time.Millisecond)
    }
}

func printLetters() {
    for i := 'a'; i <= 'e'; i++ {
        fmt.Printf("Letter: %c\n", i)
        time.Sleep(150 * time.Millisecond)
    }
}

func main() {
    go printNumbers()
    go printLetters()
    
    time.Sleep(1 * time.Second)
}

// Output (interleaved, order may vary):
// Number: 1
// Letter: a
// Number: 2
// Letter: b
// Number: 3
// ...
```

### Anonymous Goroutines

```go
func main() {
    // Launch anonymous function as goroutine
    go func() {
        fmt.Println("Anonymous goroutine")
    }()
    
    // With parameters
    name := "Alice"
    go func(n string) {
        fmt.Printf("Hello, %s!\n", n)
    }(name)  // Pass parameter here!
    
    time.Sleep(100 * time.Millisecond)
}
```

### How Many Goroutines Can You Run?

```go
package main

import (
    "fmt"
    "runtime"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    count := 100000
    
    for i := 0; i < count; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            // Each goroutine just exists
        }(i)
    }
    
    fmt.Printf("Launched %d goroutines\n", count)
    fmt.Printf("Number of CPUs: %d\n", runtime.NumCPU())
    fmt.Printf("Number of goroutines: %d\n", runtime.NumGoroutine())
    
    wg.Wait()
}

// Output:
// Launched 100000 goroutines
// Number of CPUs: 8
// Number of goroutines: 100001  (including main)
```

**Note:** You can easily run 100,000+ goroutines! Each goroutine only uses ~2KB of stack initially.

---

## Channels

Channels are typed conduits for communication between goroutines.

### Creating and Using Channels

```go
package main

import "fmt"

func main() {
    // Create channel
    ch := make(chan int)
    
    // Send value in goroutine (must be in goroutine to avoid deadlock)
    go func() {
        ch <- 42  // Send value to channel
    }()
    
    // Receive value
    value := <-ch  // Receive value from channel
    fmt.Println("Received:", value)
}
```

### Channel Operations

```go
// Create channel
ch := make(chan string)

// Send (blocks until receiver is ready)
ch <- "hello"

// Receive (blocks until sender sends)
msg := <-ch

// Receive and ignore value
<-ch

// Check if channel is closed
msg, ok := <-ch
if !ok {
    fmt.Println("Channel closed")
}

// Close channel (only sender should close)
close(ch)
```

### Deadlock Example

```go
func main() {
    ch := make(chan int)
    
    // ❌ This will deadlock!
    ch <- 42  // Waiting for receiver
    value := <-ch  // Never reached
    
    fmt.Println(value)
}

// Output: fatal error: all goroutines are asleep - deadlock!
```

### Proper Channel Usage

```go
func main() {
    ch := make(chan int)
    
    // ✅ Send in separate goroutine
    go func() {
        ch <- 42
    }()
    
    value := <-ch
    fmt.Println(value)  // 42
}
```

---

## Select Statement

`select` lets you wait on multiple channel operations:

### Basic Select

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)
    
    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "from ch1"
    }()
    
    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "from ch2"
    }()
    
    // Select waits for first channel that's ready
    select {
    case msg1 := <-ch1:
        fmt.Println("Received:", msg1)
    case msg2 := <-ch2:
        fmt.Println("Received:", msg2)
    }
}

// Output: Received: from ch1 (ch1 is ready first)
```

### Select with Timeout

```go
func main() {
    ch := make(chan string)
    
    go func() {
        time.Sleep(2 * time.Second)
        ch <- "result"
    }()
    
    select {
    case result := <-ch:
        fmt.Println("Got:", result)
    case <-time.After(1 * time.Second):
        fmt.Println("Timeout!")
    }
}

// Output: Timeout! (times out after 1 second)
```

### Select with Default (Non-blocking)

```go
func main() {
    ch := make(chan int)
    
    select {
    case val := <-ch:
        fmt.Println("Received:", val)
    default:
        fmt.Println("No value ready, doing something else")
    }
}

// Output: No value ready, doing something else
```

### Select in Loop

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)
    
    go func() {
        for i := 0; i < 3; i++ {
            time.Sleep(500 * time.Millisecond)
            ch1 <- fmt.Sprintf("ch1: %d", i)
        }
    }()
    
    go func() {
        for i := 0; i < 3; i++ {
            time.Sleep(700 * time.Millisecond)
            ch2 <- fmt.Sprintf("ch2: %d", i)
        }
    }()
    
    for i := 0; i < 6; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println(msg1)
        case msg2 := <-ch2:
            fmt.Println(msg2)
        }
    }
}
```

---

## Buffered Channels

Buffered channels have capacity and don't block until full:

### Creating Buffered Channels

```go
// Unbuffered channel (capacity 0)
ch := make(chan int)

// Buffered channel (capacity 3)
ch := make(chan int, 3)

// Send without blocking (until buffer full)
ch <- 1
ch <- 2
ch <- 3
// ch <- 4  // This would block (buffer full)

// Receive
fmt.Println(<-ch)  // 1
fmt.Println(<-ch)  // 2
fmt.Println(<-ch)  // 3
```

### Buffered vs Unbuffered

```go
package main

import (
    "fmt"
    "time"
)

func unbufferedExample() {
    ch := make(chan int)
    
    go func() {
        fmt.Println("Sending...")
        ch <- 1  // Blocks until received
        fmt.Println("Sent!")
    }()
    
    time.Sleep(1 * time.Second)  // Sender waits here
    fmt.Println("Receiving...")
    fmt.Println(<-ch)
}

func bufferedExample() {
    ch := make(chan int, 1)
    
    go func() {
        fmt.Println("Sending...")
        ch <- 1  // Doesn't block (buffer available)
        fmt.Println("Sent!")
    }()
    
    time.Sleep(1 * time.Second)  // Sender doesn't wait
    fmt.Println("Receiving...")
    fmt.Println(<-ch)
}

func main() {
    fmt.Println("=== Unbuffered ===")
    unbufferedExample()
    
    fmt.Println("\n=== Buffered ===")
    bufferedExample()
}
```

### When to Use Buffered Channels

✅ **Use buffered channels when:**
- You know the number of items to send
- You want to avoid blocking senders temporarily
- You're implementing a queue/worker pool

❌ **Don't use buffered channels:**
- As a default (start with unbuffered)
- To hide concurrency bugs
- When you need synchronization

---

## Channel Patterns

### 1. Pipeline Pattern

Chain goroutines together:

```go
package main

import "fmt"

// Stage 1: Generate numbers
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// Stage 2: Square numbers
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func main() {
    // Create pipeline
    numbers := generate(1, 2, 3, 4, 5)
    squares := square(numbers)
    
    // Consume pipeline
    for result := range squares {
        fmt.Println(result)
    }
}

// Output: 1, 4, 9, 16, 25
```

### 2. Fan-Out, Fan-In Pattern

Distribute work across multiple workers:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Worker function
func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, j)
        time.Sleep(time.Second)  // Simulate work
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 10)
    results := make(chan int, 10)
    
    // Fan-out: Start 3 workers
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }
    
    // Send 9 jobs
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)
    
    // Fan-in: Collect results
    for a := 1; a <= 9; a++ {
        fmt.Println("Result:", <-results)
    }
}
```

### 3. Worker Pool Pattern

```go
package main

import (
    "fmt"
    "sync"
)

type Job struct {
    ID     int
    Data   string
}

type Result struct {
    JobID  int
    Output string
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    
    for job := range jobs {
        fmt.Printf("Worker %d started job %d\n", id, job.ID)
        
        // Process job
        output := fmt.Sprintf("Processed: %s", job.Data)
        
        results <- Result{
            JobID:  job.ID,
            Output: output,
        }
    }
}

func main() {
    const numWorkers = 3
    const numJobs = 10
    
    jobs := make(chan Job, numJobs)
    results := make(chan Result, numJobs)
    
    // Start workers
    var wg sync.WaitGroup
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }
    
    // Send jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- Job{
            ID:   j,
            Data: fmt.Sprintf("task-%d", j),
        }
    }
    close(jobs)
    
    // Wait for workers and close results
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Collect results
    for result := range results {
        fmt.Printf("Job %d: %s\n", result.JobID, result.Output)
    }
}
```

### 4. Done Channel Pattern

Signal completion:

```go
func doWork(done <-chan bool) {
    for {
        select {
        case <-done:
            fmt.Println("Work cancelled")
            return
        default:
            fmt.Println("Working...")
            time.Sleep(500 * time.Millisecond)
        }
    }
}

func main() {
    done := make(chan bool)
    
    go doWork(done)
    
    time.Sleep(2 * time.Second)
    close(done)  // Signal done
    time.Sleep(500 * time.Millisecond)
}
```

---

## Sync Package

When channels are overkill, use sync primitives:

### WaitGroup

Wait for multiple goroutines to finish:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done()  // Decrement counter when done
    
    fmt.Printf("Worker %d starting\n", id)
    time.Sleep(time.Second)
    fmt.Printf("Worker %d done\n", id)
}

func main() {
    var wg sync.WaitGroup
    
    for i := 1; i <= 5; i++ {
        wg.Add(1)  // Increment counter
        go worker(i, &wg)
    }
    
    wg.Wait()  // Block until counter is 0
    fmt.Println("All workers completed")
}
```

### Mutex (Mutual Exclusion)

Protect shared data:

```go
package main

import (
    "fmt"
    "sync"
)

type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}

func main() {
    counter := SafeCounter{}
    var wg sync.WaitGroup
    
    // 1000 goroutines incrementing counter
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter.Increment()
        }()
    }
    
    wg.Wait()
    fmt.Println("Final count:", counter.Value())  // 1000
}
```

### RWMutex (Read-Write Mutex)

Allow multiple readers or one writer:

```go
type SafeMap struct {
    mu   sync.RWMutex
    data map[string]int
}

func (m *SafeMap) Get(key string) (int, bool) {
    m.mu.RLock()  // Read lock (multiple readers OK)
    defer m.mu.RUnlock()
    val, ok := m.data[key]
    return val, ok
}

func (m *SafeMap) Set(key string, value int) {
    m.mu.Lock()  // Write lock (exclusive)
    defer m.mu.Unlock()
    m.data[key] = value
}
```

### Once

Execute something exactly once:

```go
package main

import (
    "fmt"
    "sync"
)

var (
    instance *Singleton
    once     sync.Once
)

type Singleton struct {
    data string
}

func GetInstance() *Singleton {
    once.Do(func() {
        fmt.Println("Creating singleton instance")
        instance = &Singleton{data: "singleton"}
    })
    return instance
}

func main() {
    var wg sync.WaitGroup
    
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            s := GetInstance()
            fmt.Println(s.data)
        }()
    }
    
    wg.Wait()
}

// Output: "Creating singleton instance" printed only once
```

---

## Context Package

Manage cancellation, deadlines, and request-scoped values:

### Context Basics

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func doWork(ctx context.Context, name string) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("%s: cancelled (%v)\n", name, ctx.Err())
            return
        default:
            fmt.Printf("%s: working...\n", name)
            time.Sleep(500 * time.Millisecond)
        }
    }
}

func main() {
    // Context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    go doWork(ctx, "Worker1")
    go doWork(ctx, "Worker2")
    
    time.Sleep(3 * time.Second)
}
```

### Context Types

```go
// 1. Background context (root context)
ctx := context.Background()

// 2. Context with cancellation
ctx, cancel := context.WithCancel(ctx)
cancel()  // Call to cancel

// 3. Context with timeout
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

// 4. Context with deadline
deadline := time.Now().Add(10 * time.Second)
ctx, cancel := context.WithDeadline(ctx, deadline)
defer cancel()

// 5. Context with value
ctx = context.WithValue(ctx, "userID", 12345)
userID := ctx.Value("userID").(int)
```

### Real-World Context Example

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "time"
)

func fetchData(ctx context.Context, url string) (string, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return "", err
    }
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    
    return fmt.Sprintf("Status: %d", resp.StatusCode), nil
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    result, err := fetchData(ctx, "https://api.example.com/data")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    
    fmt.Println(result)
}
```

---

## Common Concurrency Patterns

### 1. Timeout Pattern

```go
func DoWithTimeout(timeout time.Duration) (string, error) {
    resultCh := make(chan string)
    errCh := make(chan error)
    
    go func() {
        // Simulate long operation
        time.Sleep(3 * time.Second)
        resultCh <- "success"
    }()
    
    select {
    case result := <-resultCh:
        return result, nil
    case err := <-errCh:
        return "", err
    case <-time.After(timeout):
        return "", fmt.Errorf("operation timed out")
    }
}

result, err := DoWithTimeout(2 * time.Second)
// Returns timeout error
```

### 2. Rate Limiting Pattern

```go
func rateLimitedWorker(requests <-chan int, results chan<- int) {
    limiter := time.Tick(200 * time.Millisecond)  // Max 5 per second
    
    for req := range requests {
        <-limiter  // Wait for rate limiter
        results <- processRequest(req)
    }
}
```

### 3. Debounce Pattern

```go
func debounce(interval time.Duration, input <-chan string, output chan<- string) {
    var item string
    timer := time.NewTimer(interval)
    timer.Stop()
    
    for {
        select {
        case item = <-input:
            timer.Reset(interval)
        case <-timer.C:
            output <- item
        }
    }
}
```

### 4. Retry Pattern

```go
func retryOperation(maxRetries int, operation func() error) error {
    var err error
    
    for i := 0; i < maxRetries; i++ {
        err = operation()
        if err == nil {
            return nil
        }
        
        fmt.Printf("Retry %d/%d failed: %v\n", i+1, maxRetries, err)
        time.Sleep(time.Second * time.Duration(i+1))  // Exponential backoff
    }
    
    return fmt.Errorf("operation failed after %d retries: %w", maxRetries, err)
}
```

---

## Race Conditions & How to Avoid Them

### What is a Race Condition?

When multiple goroutines access shared data concurrently and at least one modifies it:

```go
// ❌ Race condition
var counter int

func increment() {
    counter++  // Not atomic! Read, increment, write
}

func main() {
    for i := 0; i < 1000; i++ {
        go increment()
    }
    
    time.Sleep(time.Second)
    fmt.Println(counter)  // Unpredictable result (not 1000)
}
```

### Detecting Races

```bash
# Run with race detector
go run -race main.go

# Build with race detector
go build -race main.go

# Test with race detector
go test -race ./...
```

### Solution 1: Mutex

```go
// ✅ Use mutex
var (
    counter int
    mu      sync.Mutex
)

func increment() {
    mu.Lock()
    counter++
    mu.Unlock()
}
```

### Solution 2: Channels

```go
// ✅ Use channels
func main() {
    counter := 0
    done := make(chan bool)
    
    increment := make(chan bool)
    
    go func() {
        for range increment {
            counter++
        }
        done <- true
    }()
    
    for i := 0; i < 1000; i++ {
        increment <- true
    }
    
    close(increment)
    <-done
    fmt.Println(counter)  // Always 1000
}
```

### Solution 3: Atomic Operations

```go
import "sync/atomic"

var counter int64

func increment() {
    atomic.AddInt64(&counter, 1)
}

func main() {
    for i := 0; i < 1000; i++ {
        go increment()
    }
    
    time.Sleep(time.Second)
    fmt.Println(atomic.LoadInt64(&counter))  // Always 1000
}
```

---

## Best Practices

### 1. Don't Communicate by Sharing Memory; Share Memory by Communicating

```go
// ❌ Bad: Shared memory
var sharedMap = make(map[string]int)
var mu sync.Mutex

func badUpdate(key string, value int) {
    mu.Lock()
    sharedMap[key] = value
    mu.Unlock()
}

// ✅ Good: Communicate via channels
type Update struct {
    Key   string
    Value int
}

func goodWorker(updates <-chan Update) {
    localMap := make(map[string]int)
    for update := range updates {
        localMap[update.Key] = update.Value
    }
}
```

### 2. Always Close Channels (When Appropriate)

```go
// ✅ Producer closes channel
func producer(ch chan<- int) {
    defer close(ch)
    
    for i := 0; i < 10; i++ {
        ch <- i
    }
}

// Consumer uses range (stops when closed)
func consumer(ch <-chan int) {
    for value := range ch {
        fmt.Println(value)
    }
}
```

### 3. Use Context for Cancellation

```go
// ✅ Pass context for cancellation
func worker(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            // Do work
        }
    }
}
```

### 4. Avoid Goroutine Leaks

```go
// ❌ Goroutine leak
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch  // Waits forever if nothing sent
        fmt.Println(val)
    }()
    // Goroutine never exits!
}

// ✅ Use timeout or context
func noLeak(ctx context.Context) {
    ch := make(chan int)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return
        }
    }()
}
```

### 5. Size Buffered Channels Carefully

```go
// ❌ Too large buffer (memory waste)
ch := make(chan int, 1000000)

// ✅ Size based on actual needs
ch := make(chan int, runtime.NumCPU())
```

---

## Interview Questions

### Q1: What's the difference between concurrency and parallelism?

**Answer:** Concurrency is about dealing with multiple things at once (design/structure), while parallelism is about doing multiple things at once (execution). Go programs are concurrent by design but may or may not execute in parallel depending on available CPU cores and GOMAXPROCS setting.

### Q2: When would you use a buffered vs unbuffered channel?

**Answer:**
- **Unbuffered:** Default choice. Provides synchronization - sender blocks until receiver reads
- **Buffered:** When you know capacity needed, want to decouple sender/receiver timing, or implementing producer-consumer with known queue size

### Q3: Explain how `select` works with multiple channels

**Answer:** `select` blocks until one of its cases can proceed. If multiple cases are ready, it chooses one at random. With a `default` case, select never blocks.

### Q4: How do you prevent goroutine leaks?

**Answer:**
- Always provide a way to stop goroutines (context, done channel)
- Use timeouts for operations
- Close channels when done sending
- Be careful with blocking operations

### Q5: What's the difference between `sync.Mutex` and `sync.RWMutex`?

**Answer:**
- `Mutex`: Exclusive lock for both read and write
- `RWMutex`: Multiple readers OR one writer (better for read-heavy workloads)

### Q6: How does the race detector work?

**Answer:** It instruments your code to track memory accesses and detects when multiple goroutines access the same memory location without synchronization, and at least one is a write. Run with `go run -race` or `go test -race`.

---

## Hands-On Exercise

### Task: Build a Concurrent URL Checker

Build a program that checks multiple URLs concurrently and reports their status.

**Requirements:**
1. Accept list of URLs
2. Check each URL concurrently (max 10 concurrent checks)
3. Report which URLs are up/down
4. Calculate total time taken
5. Handle timeouts (2 seconds per URL)

**Starter Code:**

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "sync"
    "time"
)

type Result struct {
    URL    string
    Status string
    Code   int
    Error  error
}

// TODO: Implement concurrent URL checker
func checkURL(ctx context.Context, url string) Result {
    // Check if URL is accessible
    // Return Result with status
    return Result{}
}

// TODO: Implement worker pool
func checkURLsConcurrently(urls []string, maxWorkers int) []Result {
    // Use worker pool pattern
    // Return slice of results
    return nil
}

func main() {
    urls := []string{
        "https://google.com",
        "https://github.com",
        "https://stackoverflow.com",
        "https://invalid-url-12345.com",
        "https://golang.org",
        "https://reddit.com",
        "https://twitter.com",
        "https://linkedin.com",
    }
    
    start := time.Now()
    
    // TODO: Check URLs concurrently
    results := checkURLsConcurrently(urls, 5)
    
    // Print results
    for _, result := range results {
        if result.Error != nil {
            fmt.Printf("❌ %s - ERROR: %v\n", result.URL, result.Error)
        } else {
            fmt.Printf("✅ %s - %s (Code: %d)\n", result.URL, result.Status, result.Code)
        }
    }
    
    fmt.Printf("\nCompleted in: %v\n", time.Since(start))
}
```

**Expected Output:**

```
✅ https://google.com - OK (Code: 200)
✅ https://github.com - OK (Code: 200)
✅ https://stackoverflow.com - OK (Code: 200)
❌ https://invalid-url-12345.com - ERROR: timeout
✅ https://golang.org - OK (Code: 200)
✅ https://reddit.com - OK (Code: 200)
✅ https://twitter.com - OK (Code: 200)
✅ https://linkedin.com - OK (Code: 200)

Completed in: 2.3s
```

**Bonus Challenges:**
1. Add retry logic (3 attempts)
2. Implement rate limiting
3. Add progress indicator
4. Save results to file

---

## 📚 Additional Resources

- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [Advanced Go Concurrency Patterns](https://go.dev/blog/io2013-talk-concurrency)
- [Context Package](https://go.dev/blog/context)
- [Share Memory by Communicating](https://go.dev/blog/codelab-share)

---

## ✅ Module Checklist

Before moving to the next module, ensure you can:

- [ ] Launch and manage goroutines
- [ ] Create and use channels (buffered and unbuffered)
- [ ] Use select statement for multiplexing
- [ ] Implement common patterns (pipeline, fan-out/fan-in, worker pool)
- [ ] Use sync package (WaitGroup, Mutex, RWMutex)
- [ ] Work with context for cancellation and timeouts
- [ ] Detect and fix race conditions
- [ ] Complete the hands-on exercise

---

**Next Module:** [03_Go_REST_APIs.md](./03_Go_REST_APIs.md) - Build production-ready HTTP services! 🌐
