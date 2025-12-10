# Module 01: Go Fundamentals 🔵

## Master the Basics of Go Programming

**Duration:** 3-4 hours  
**Prerequisites:** Basic programming knowledge in any language  
**Outcome:** Write idiomatic Go code with confidence

---

## 📚 Table of Contents

1. [Why Go?](#why-go)
2. [Setup & Hello World](#setup--hello-world)
3. [Basic Syntax & Types](#basic-syntax--types)
4. [Variables & Constants](#variables--constants)
5. [Control Flow](#control-flow)
6. [Functions](#functions)
7. [Structs & Methods](#structs--methods)
8. [Interfaces](#interfaces)
9. [Packages & Modules](#packages--modules)
10. [Error Handling](#error-handling)
11. [Common Mistakes](#common-mistakes)
12. [Best Practices](#best-practices)
13. [Interview Questions](#interview-questions)
14. [Hands-On Exercise](#hands-on-exercise)

---

## Why Go?

### The Language of Cloud Infrastructure

Go (Golang) powers the world's most critical infrastructure:
- **Docker** - Container runtime
- **Kubernetes** - Container orchestration
- **Terraform** - Infrastructure as code
- **Prometheus** - Monitoring system
- **Consul** - Service mesh
- **etcd** - Distributed key-value store

### Key Advantages

1. **Fast Compilation** - Compile large codebases in seconds
2. **Static Typing** - Catch errors at compile time
3. **Built-in Concurrency** - Goroutines make parallel programming easy
4. **Simple Syntax** - Just 25 keywords, easy to learn
5. **Strong Standard Library** - Everything from HTTP servers to cryptography
6. **Cross-Platform** - Compile for any OS/architecture
7. **Backward Compatible** - Go 1.x guarantees compatibility

### When to Use Go

✅ **Perfect For:**
- Microservices and APIs
- CLI tools
- DevOps automation
- Network servers
- Distributed systems
- Cloud-native applications

❌ **Not Ideal For:**
- GUI applications
- Mobile apps (though possible)
- Machine learning (use Python)
- Game development

---

## Setup & Hello World

### Installation

```bash
# macOS
brew install go

# Linux
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Verify installation
go version  # Should show: go version go1.21.5
```

### Your First Go Program

```go
// main.go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}
```

```bash
# Run directly
go run main.go

# Build executable
go build main.go
./main

# Build and install to $GOPATH/bin
go install
```

### Understanding the Basics

```go
package main              // Every Go file belongs to a package
                          // 'main' package = executable program

import "fmt"              // Import standard library packages

func main() {             // main() is the entry point
    fmt.Println("Hello")  // Exported functions start with capital letter
}
```

---

## Basic Syntax & Types

### Primitive Types

```go
package main

import "fmt"

func main() {
    // Boolean
    var isActive bool = true
    
    // Integers
    var age int = 30                    // Platform dependent (32 or 64 bit)
    var count int64 = 1000000000000     // Explicitly 64-bit
    var smallNum int8 = 127             // -128 to 127
    var unsignedAge uint = 30           // 0 to 2^32-1 or 2^64-1
    
    // Floating point
    var price float64 = 99.99           // Preferred for decimals
    var discount float32 = 0.15         // Less precision
    
    // String
    var name string = "Alice"
    var message = `Multi-line
    string using backticks`             // Raw string literal
    
    // Byte and Rune
    var b byte = 'A'                    // byte = uint8, ASCII character
    var r rune = '😀'                   // rune = int32, Unicode code point
    
    fmt.Printf("Boolean: %v\n", isActive)
    fmt.Printf("Integer: %d, Float: %.2f\n", age, price)
    fmt.Printf("String: %s\n", name)
    fmt.Printf("Rune: %c (code: %d)\n", r, r)
}
```

### Type Inference

```go
// Go can infer types using :=
name := "Bob"           // Inferred as string
age := 25               // Inferred as int
price := 19.99          // Inferred as float64
isValid := true         // Inferred as bool

// This is the most common way to declare variables
```

### Zero Values

Go initializes variables to their zero value if not explicitly set:

```go
var i int        // 0
var f float64    // 0.0
var b bool       // false
var s string     // "" (empty string)
var p *int       // nil (pointer)
```

---

## Variables & Constants

### Variable Declaration Styles

```go
// Style 1: var keyword with type
var name string = "Alice"

// Style 2: var keyword with type inference
var age = 30

// Style 3: Short declaration (most common, only inside functions)
city := "New York"

// Multiple declarations
var (
    username = "admin"
    password = "secret"
    port     = 8080
)

// Multiple assignment
x, y := 10, 20
```

### Constants

```go
// Single constant
const Pi = 3.14159

// Multiple constants
const (
    StatusOK       = 200
    StatusNotFound = 404
    StatusError    = 500
)

// Typed constants
const MaxConnections int = 100

// Untyped constants (more flexible)
const Port = 8080  // Can be used as int, int64, float64, etc.

// iota: auto-incrementing constant generator
const (
    Sunday = iota    // 0
    Monday           // 1
    Tuesday          // 2
    Wednesday        // 3
    Thursday         // 4
    Friday           // 5
    Saturday         // 6
)

// iota with expressions
const (
    _  = iota             // Skip 0
    KB = 1 << (10 * iota) // 1 << 10 = 1024
    MB                    // 1 << 20 = 1048576
    GB                    // 1 << 30 = 1073741824
    TB                    // 1 << 40 = 1099511627776
)
```

---

## Control Flow

### If-Else

```go
// Basic if
if age >= 18 {
    fmt.Println("Adult")
}

// If-else
if score >= 90 {
    fmt.Println("A")
} else if score >= 80 {
    fmt.Println("B")
} else {
    fmt.Println("C")
}

// If with initialization statement (very common pattern)
if err := doSomething(); err != nil {
    fmt.Println("Error:", err)
    return
}
// 'err' is only in scope within this if block
```

### For Loops

Go only has `for` loops, but they're versatile:

```go
// Traditional for loop
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// While-style loop
count := 0
for count < 10 {
    fmt.Println(count)
    count++
}

// Infinite loop
for {
    fmt.Println("Forever...")
    break  // Use break to exit
}

// For-range over slices
nums := []int{1, 2, 3, 4, 5}
for index, value := range nums {
    fmt.Printf("Index: %d, Value: %d\n", index, value)
}

// Ignore index with underscore
for _, value := range nums {
    fmt.Println(value)
}

// For-range over maps
ages := map[string]int{"Alice": 30, "Bob": 25}
for name, age := range ages {
    fmt.Printf("%s is %d years old\n", name, age)
}

// For-range over strings (iterates over runes)
for i, char := range "Hello 😀" {
    fmt.Printf("Index %d: %c\n", i, char)
}
```

### Switch

```go
// Basic switch
day := "Monday"
switch day {
case "Monday":
    fmt.Println("Start of work week")
case "Friday":
    fmt.Println("TGIF!")
case "Saturday", "Sunday":
    fmt.Println("Weekend!")
default:
    fmt.Println("Midweek day")
}

// Switch with initialization
switch hour := time.Now().Hour(); {
case hour < 12:
    fmt.Println("Good morning")
case hour < 18:
    fmt.Println("Good afternoon")
default:
    fmt.Println("Good evening")
}

// Switch without condition (like if-else chain)
score := 85
switch {
case score >= 90:
    fmt.Println("A")
case score >= 80:
    fmt.Println("B")
default:
    fmt.Println("C")
}

// Type switch (check interface type)
var i interface{} = "hello"
switch v := i.(type) {
case int:
    fmt.Printf("Integer: %d\n", v)
case string:
    fmt.Printf("String: %s\n", v)
default:
    fmt.Printf("Unknown type: %T\n", v)
}
```

### Defer

Execute a statement when the surrounding function returns:

```go
func readFile(filename string) {
    file, err := os.Open(filename)
    if err != nil {
        return
    }
    defer file.Close()  // Ensures file is closed when function returns
    
    // Read from file...
    // Even if there's an error or early return, file.Close() will be called
}

// Multiple defers execute in LIFO order (Last In, First Out)
func example() {
    defer fmt.Println("First")
    defer fmt.Println("Second")
    defer fmt.Println("Third")
    fmt.Println("Function body")
}
// Output:
// Function body
// Third
// Second
// First
```

---

## Functions

### Basic Functions

```go
// Function with parameters and return type
func add(a int, b int) int {
    return a + b
}

// Shorthand when parameters share type
func multiply(a, b int) int {
    return a * b
}

// Multiple return values (idiomatic Go pattern)
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("division by zero")
    }
    return a / b, nil
}

// Usage
result, err := divide(10, 2)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println("Result:", result)
```

### Named Return Values

```go
func calculate(a, b int) (sum int, product int) {
    sum = a + b
    product = a * b
    return  // Naked return (returns named values)
}

// Equivalent to:
func calculateExplicit(a, b int) (int, int) {
    sum := a + b
    product := a * b
    return sum, product
}
```

### Variadic Functions

```go
// Accept variable number of arguments
func sum(nums ...int) int {
    total := 0
    for _, num := range nums {
        total += num
    }
    return total
}

// Usage
fmt.Println(sum(1, 2, 3))           // 6
fmt.Println(sum(1, 2, 3, 4, 5))     // 15

// Pass slice with ... operator
numbers := []int{1, 2, 3, 4}
fmt.Println(sum(numbers...))        // 10
```

### Higher-Order Functions

```go
// Functions as values
func applyOperation(a, b int, operation func(int, int) int) int {
    return operation(a, b)
}

// Usage
add := func(x, y int) int { return x + y }
multiply := func(x, y int) int { return x * y }

fmt.Println(applyOperation(5, 3, add))       // 8
fmt.Println(applyOperation(5, 3, multiply))  // 15

// Closures (functions that capture variables)
func counter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}

c := counter()
fmt.Println(c())  // 1
fmt.Println(c())  // 2
fmt.Println(c())  // 3
```

---

## Structs & Methods

### Defining Structs

```go
// Basic struct
type Person struct {
    Name string
    Age  int
}

// Creating instances
p1 := Person{Name: "Alice", Age: 30}
p2 := Person{"Bob", 25}  // Positional (not recommended)

// Accessing fields
fmt.Println(p1.Name)
p1.Age = 31

// Pointer to struct
p3 := &Person{Name: "Charlie", Age: 35}
fmt.Println(p3.Name)  // Go auto-dereferences, no need for p3->Name

// Anonymous structs (useful for one-off data structures)
user := struct {
    Username string
    IsAdmin  bool
}{
    Username: "admin",
    IsAdmin:  true,
}
```

### Struct Embedding (Composition)

```go
// Go doesn't have inheritance, but composition through embedding
type Address struct {
    Street string
    City   string
}

type Employee struct {
    Person           // Embedded struct (anonymous field)
    Address          // Embedded struct
    EmployeeID int
}

// Usage
emp := Employee{
    Person:     Person{Name: "Alice", Age: 30},
    Address:    Address{Street: "123 Main St", City: "NYC"},
    EmployeeID: 12345,
}

// Can access embedded fields directly
fmt.Println(emp.Name)    // From Person
fmt.Println(emp.City)    // From Address
fmt.Println(emp.EmployeeID)
```

### Methods

Methods are functions with a receiver:

```go
type Rectangle struct {
    Width  float64
    Height float64
}

// Value receiver (works on a copy)
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Pointer receiver (works on original, can modify)
func (r *Rectangle) Scale(factor float64) {
    r.Width *= factor
    r.Height *= factor
}

// Usage
rect := Rectangle{Width: 10, Height: 5}
fmt.Println("Area:", rect.Area())  // 50

rect.Scale(2)
fmt.Println("New dimensions:", rect.Width, rect.Height)  // 20, 10
```

**When to use pointer receivers:**
- Need to modify the receiver
- Struct is large (avoid copying)
- Consistency (if one method uses pointer, all should)

---

## Interfaces

Interfaces define behavior. Types implement interfaces implicitly:

```go
// Define interface
type Shape interface {
    Area() float64
    Perimeter() float64
}

// Rectangle implements Shape (implicitly)
type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

func (r Rectangle) Perimeter() float64 {
    return 2 * (r.Width + r.Height)
}

// Circle implements Shape
type Circle struct {
    Radius float64
}

func (c Circle) Area() float64 {
    return 3.14159 * c.Radius * c.Radius
}

func (c Circle) Perimeter() float64 {
    return 2 * 3.14159 * c.Radius
}

// Function that accepts any Shape
func printShapeInfo(s Shape) {
    fmt.Printf("Area: %.2f, Perimeter: %.2f\n", s.Area(), s.Perimeter())
}

// Usage
rect := Rectangle{Width: 10, Height: 5}
circle := Circle{Radius: 7}

printShapeInfo(rect)    // Works!
printShapeInfo(circle)  // Works!
```

### Empty Interface

```go
// interface{} can hold any type (like 'any' in other languages)
func printAnything(v interface{}) {
    fmt.Println(v)
}

printAnything(42)
printAnything("hello")
printAnything(true)
printAnything([]int{1, 2, 3})

// Type assertion to get underlying value
var i interface{} = "hello"
s, ok := i.(string)  // Type assertion with safety check
if ok {
    fmt.Println("String value:", s)
}

// Type switch
switch v := i.(type) {
case int:
    fmt.Printf("Integer: %d\n", v)
case string:
    fmt.Printf("String: %s\n", v)
default:
    fmt.Printf("Unknown type: %T\n", v)
}
```

### Common Standard Interfaces

```go
// Stringer (like toString())
type Stringer interface {
    String() string
}

type Person struct {
    Name string
    Age  int
}

func (p Person) String() string {
    return fmt.Sprintf("%s (%d years old)", p.Name, p.Age)
}

p := Person{"Alice", 30}
fmt.Println(p)  // Automatically calls String() method

// Reader and Writer (for I/O)
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}
```

---

## Packages & Modules

### Package Basics

```go
// Every Go file starts with package declaration
package main  // Executable package

package utils  // Library package

// Exported names start with capital letter
func ExportedFunction() {}   // Can be used by other packages
func unexportedFunction() {} // Only visible within package
```

### Creating a Module

```bash
# Initialize a new module
mkdir myapp
cd myapp
go mod init github.com/username/myapp

# This creates go.mod file:
# module github.com/username/myapp
# 
# go 1.21
```

### Project Structure

```
myapp/
├── go.mod
├── go.sum
├── main.go
├── handlers/
│   ├── user.go
│   └── product.go
├── models/
│   ├── user.go
│   └── product.go
└── utils/
    └── helpers.go
```

### Importing Packages

```go
package main

import (
    "fmt"                                    // Standard library
    "net/http"                               // Standard library
    
    "github.com/username/myapp/handlers"     // Local package
    "github.com/username/myapp/models"       // Local package
    
    "github.com/gorilla/mux"                 // External package
)

func main() {
    router := mux.NewRouter()
    router.HandleFunc("/users", handlers.GetUsers)
    http.ListenAndServe(":8080", router)
}
```

### Installing Dependencies

```bash
# Add dependency
go get github.com/gorilla/mux

# Install all dependencies from go.mod
go mod download

# Remove unused dependencies
go mod tidy

# Update dependency
go get -u github.com/gorilla/mux

# Update all dependencies
go get -u ./...
```

---

## Error Handling

Go's philosophy: Explicit error handling, no exceptions

### Basic Error Handling

```go
import (
    "errors"
    "fmt"
)

// Function returns error as second value
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Usage: always check errors
result, err := divide(10, 0)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println("Result:", result)
```

### Creating Custom Errors

```go
// Method 1: errors.New()
err := errors.New("something went wrong")

// Method 2: fmt.Errorf() with formatting
err := fmt.Errorf("user %s not found", username)

// Method 3: Custom error type
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on field '%s': %s", e.Field, e.Message)
}

// Usage
func validateAge(age int) error {
    if age < 0 {
        return &ValidationError{
            Field:   "age",
            Message: "must be non-negative",
        }
    }
    return nil
}
```

### Error Wrapping (Go 1.13+)

```go
import (
    "errors"
    "fmt"
)

// Wrap error to add context
func readConfig(filename string) error {
    _, err := os.Open(filename)
    if err != nil {
        return fmt.Errorf("failed to read config: %w", err)
    }
    return nil
}

// Check for specific error
err := readConfig("config.yaml")
if errors.Is(err, os.ErrNotExist) {
    fmt.Println("Config file doesn't exist")
}

// Unwrap error chain
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("Path error:", pathErr.Path)
}
```

### Panic and Recover

```go
// panic: something went terribly wrong (like throwing exception)
func riskyOperation() {
    panic("something went wrong!")
}

// recover: catch panics (like try-catch)
func safeOperation() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered from panic:", r)
        }
    }()
    
    riskyOperation()
    fmt.Println("This won't be printed")
}

// Only use panic for truly unrecoverable errors
// Most errors should be handled explicitly
```

---

## Common Mistakes

### 1. Unused Variables

```go
// ❌ Error: "declared and not used"
func bad() {
    x := 10
    // x is never used
}

// ✅ Use underscore to ignore values
func good() {
    _, err := doSomething()
    if err != nil {
        return
    }
}
```

### 2. Shadowing Variables

```go
// ❌ Shadowing error variable
func bad() error {
    err := setup()
    if err != nil {
        return err
    }
    
    err := process()  // This creates NEW variable, doesn't reassign!
    return err
}

// ✅ Reuse existing variable
func good() error {
    err := setup()
    if err != nil {
        return err
    }
    
    err = process()  // Correctly reassigns
    return err
}
```

### 3. Slice Gotchas

```go
// ❌ Slices share underlying array
func bad() {
    a := []int{1, 2, 3}
    b := a
    b[0] = 999
    fmt.Println(a)  // [999, 2, 3] - a is also changed!
}

// ✅ Copy slice if you need independence
func good() {
    a := []int{1, 2, 3}
    b := make([]int, len(a))
    copy(b, a)
    b[0] = 999
    fmt.Println(a)  // [1, 2, 3] - a is unchanged
}
```

### 4. Goroutine Loop Variable Capture

```go
// ❌ All goroutines use same variable
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i)  // Might print 5 five times!
    }()
}

// ✅ Pass variable as parameter
for i := 0; i < 5; i++ {
    go func(n int) {
        fmt.Println(n)  // Correctly prints 0, 1, 2, 3, 4
    }(i)
}
```

---

## Best Practices

### 1. Error Handling

```go
// ✅ Always check errors immediately
result, err := doSomething()
if err != nil {
    return fmt.Errorf("failed to do something: %w", err)
}

// ✅ Early returns for error cases
func processUser(id int) error {
    user, err := getUser(id)
    if err != nil {
        return err
    }
    
    if user.IsBlocked {
        return errors.New("user is blocked")
    }
    
    // Main logic here
    return nil
}
```

### 2. Naming Conventions

```go
// ✅ Short, descriptive names
user := getUser(123)
err := validate(user)

// ✅ Use camelCase
func getUserByID(id int) (*User, error)

// ✅ Acronyms in capitals
func ParseHTTPRequest(url string) error
var userID int
var apiURL string

// ✅ Package names: lowercase, no underscores
package httputil
package userservice
```

### 3. Code Organization

```go
// ✅ Imports: standard, external, local
import (
    "fmt"
    "net/http"
    
    "github.com/gorilla/mux"
    
    "myapp/handlers"
    "myapp/models"
)

// ✅ Exported types and functions first
type User struct { ... }
func NewUser() *User { ... }
func unexported() { ... }
```

### 4. Interface Design

```go
// ✅ Small, focused interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

// ✅ Accept interfaces, return structs
func ProcessData(r io.Reader) (*Result, error) {
    // ...
}

// ❌ Don't accept interfaces everywhere
// Only use when you need polymorphism
```

---

## Interview Questions

### Basic Level

**Q1: What is the difference between `var` and `:=`?**

```go
// var: can be used at package level and inside functions
var globalVar = 10

// := can only be used inside functions (short declaration)
func example() {
    localVar := 20
}
```

**Q2: Explain zero values in Go.**

Go initializes all variables to their zero value:
- Numbers: `0`
- Booleans: `false`
- Strings: `""` (empty)
- Pointers, slices, maps, channels, functions, interfaces: `nil`

**Q3: What's the difference between an array and a slice?**

```go
// Array: fixed size, value type
var arr [5]int = [5]int{1, 2, 3, 4, 5}

// Slice: dynamic size, reference type
var slice []int = []int{1, 2, 3, 4, 5}
```

### Intermediate Level

**Q4: When should you use pointer receivers vs value receivers?**

Use pointer receivers when:
- You need to modify the receiver
- The struct is large (avoid copying)
- For consistency across methods

**Q5: Explain interface implementation in Go.**

Interfaces are implemented implicitly. If a type has all the methods of an interface, it implements that interface automatically.

```go
type Writer interface {
    Write([]byte) (int, error)
}

type MyWriter struct {}

// MyWriter implements Writer implicitly
func (m MyWriter) Write(p []byte) (int, error) {
    // implementation
    return len(p), nil
}
```

**Q6: What is the purpose of defer?**

`defer` postpones function execution until surrounding function returns. Used for cleanup:
```go
defer file.Close()
defer mutex.Unlock()
defer transaction.Rollback()
```

---

## Hands-On Exercise

### Task: Build a CLI Todo Application

Create a command-line todo app with these features:

**Requirements:**
1. Add todo items
2. List all todos
3. Mark todo as complete
4. Delete todo
5. Save to/load from file (JSON)

**Starter Code:**

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "os"
)

type Todo struct {
    ID        int    `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
}

type TodoList struct {
    Todos []Todo `json:"todos"`
}

// TODO: Implement these methods
func (tl *TodoList) Add(title string) {
    // Add new todo
}

func (tl *TodoList) List() {
    // Print all todos
}

func (tl *TodoList) Complete(id int) error {
    // Mark todo as complete
    return nil
}

func (tl *TodoList) Delete(id int) error {
    // Delete todo
    return nil
}

func (tl *TodoList) Save(filename string) error {
    // Save to JSON file
    return nil
}

func Load(filename string) (*TodoList, error) {
    // Load from JSON file
    return nil, nil
}

func main() {
    // TODO: Implement CLI interface
    // Use os.Args for command-line arguments
    // Commands: add, list, complete, delete
}
```

**Expected Usage:**

```bash
go run todo.go add "Buy groceries"
go run todo.go add "Write Go code"
go run todo.go list
# Output:
# [1] Buy groceries
# [2] Write Go code

go run todo.go complete 1
go run todo.go list
# Output:
# [1] ✓ Buy groceries
# [2] Write Go code

go run todo.go delete 1
```

**Solution available in next module's appendix**

---

## 📚 Additional Resources

- [Official Go Tour](https://go.dev/tour/)
- [Effective Go](https://go.dev/doc/effective_go)
- [Go by Example](https://gobyexample.com/)
- [Go Standard Library](https://pkg.go.dev/std)

---

## ✅ Module Checklist

Before moving to the next module, ensure you can:

- [ ] Write and run basic Go programs
- [ ] Use all primitive types correctly
- [ ] Implement control flow (if, for, switch)
- [ ] Write functions with multiple return values
- [ ] Create and use structs with methods
- [ ] Understand and implement interfaces
- [ ] Handle errors properly
- [ ] Organize code into packages
- [ ] Complete the hands-on exercise

---

**Next Module:** [02_Go_Concurrency.md](./02_Go_Concurrency.md) - Learn goroutines and channels! 🚀
