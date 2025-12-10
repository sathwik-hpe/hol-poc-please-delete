# Module 19: Kafka & Event-Driven Architecture 📨

## Build Scalable Event-Driven Systems with Apache Kafka

**Duration:** 6-7 hours  
**Prerequisites:** Module 17 (Microservices), distributed systems basics  
**Outcome:** Master Kafka for real-time data streaming and event-driven architectures

---

## 📚 Table of Contents

1. [What is Kafka](#what-is-kafka)
2. [Core Concepts](#core-concepts)
3. [Producers](#producers)
4. [Consumers](#consumers)
5. [Topics & Partitions](#topics--partitions)
6. [Consumer Groups](#consumer-groups)
7. [Event-Driven Patterns](#event-driven-patterns)
8. [Best Practices](#best-practices)
9. [Interview Questions](#interview-questions)
10. [Hands-On Exercise](#hands-on-exercise)

---

## What is Kafka

### Overview

**Apache Kafka** is a distributed event streaming platform for:
- **Publish/Subscribe**: Messaging system
- **Storage**: Durable log storage
- **Processing**: Stream processing (Kafka Streams)

### Use Cases

```
1. Messaging:         Service-to-service communication
2. Activity Tracking: User actions, clickstream
3. Log Aggregation:   Centralized logging
4. Stream Processing: Real-time analytics
5. Event Sourcing:    Store all state changes
6. CQRS:              Sync read/write models
```

### Kafka vs Traditional Message Queues

```
RabbitMQ/SQS:
- Message broker
- Messages deleted after consumption
- Lower throughput

Kafka:
- Distributed commit log
- Messages retained (days/weeks)
- High throughput (millions/sec)
- Replay messages
```

---

## Core Concepts

### Architecture

```
Producer → Kafka Cluster → Consumer

Kafka Cluster:
├── Broker 1 (server)
├── Broker 2
└── Broker 3

Topic: Category/feed name (e.g., "orders", "user-events")
Partition: Ordered, immutable sequence of messages
Offset: Message position in partition (0, 1, 2, ...)
```

### Message Structure

```
Record:
- Key:       Used for partitioning
- Value:     Actual data (JSON, Avro, Protobuf)
- Timestamp: When produced
- Headers:   Metadata

Example:
{
  "key": "user-123",
  "value": {
    "event": "order_created",
    "order_id": "ord-456",
    "amount": 99.99
  },
  "timestamp": 1699564800
}
```

---

## Installation & Setup

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
```

```bash
# Start Kafka
docker-compose up -d

# Verify
docker-compose ps

# Access Kafka UI
open http://localhost:8080
```

---

## Producers

### Simple Producer

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
)

type OrderEvent struct {
    OrderID   string  `json:"order_id"`
    UserID    string  `json:"user_id"`
    Amount    float64 `json:"amount"`
    Timestamp int64   `json:"timestamp"`
}

func main() {
    // Create writer
    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers:  []string{"localhost:9092"},
        Topic:    "orders",
        Balancer: &kafka.LeastBytes{},
    })
    defer writer.Close()

    // Create event
    event := OrderEvent{
        OrderID:   "ord-12345",
        UserID:    "user-67890",
        Amount:    199.99,
        Timestamp: time.Now().Unix(),
    }

    // Serialize to JSON
    value, _ := json.Marshal(event)

    // Send message
    err := writer.WriteMessages(context.Background(),
        kafka.Message{
            Key:   []byte(event.OrderID),
            Value: value,
        },
    )

    if err != nil {
        log.Fatal("failed to write message:", err)
    }

    log.Println("Message sent successfully!")
}
```

### Batch Producer (High Throughput)

```go
func ProduceBatch() {
    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers:      []string{"localhost:9092"},
        Topic:        "orders",
        BatchSize:    100,          // Batch 100 messages
        BatchTimeout: 10 * time.Millisecond,
        Compression:  kafka.Snappy, // Compress messages
    })
    defer writer.Close()

    messages := make([]kafka.Message, 0, 1000)

    for i := 0; i < 1000; i++ {
        event := OrderEvent{
            OrderID: fmt.Sprintf("ord-%d", i),
            UserID:  "user-123",
            Amount:  99.99,
        }
        value, _ := json.Marshal(event)

        messages = append(messages, kafka.Message{
            Key:   []byte(event.OrderID),
            Value: value,
        })
    }

    // Send batch
    err := writer.WriteMessages(context.Background(), messages...)
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Sent %d messages\n", len(messages))
}
```

### Producer with Partitioning

```go
// Custom partitioner
type UserPartitioner struct{}

func (p *UserPartitioner) Partition(msg kafka.Message, numPartitions int) int {
    // Hash user ID to determine partition
    key := string(msg.Key)
    hash := fnv.New32a()
    hash.Write([]byte(key))
    return int(hash.Sum32()) % numPartitions
}

func main() {
    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers:  []string{"localhost:9092"},
        Topic:    "orders",
        Balancer: &UserPartitioner{}, // Custom partitioner
    })
    defer writer.Close()

    // All messages with same user ID go to same partition
    // Ensures ordering per user
}
```

---

## Consumers

### Simple Consumer

```go
func ConsumeOrders() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers:  []string{"localhost:9092"},
        Topic:    "orders",
        GroupID:  "order-processor",
        MinBytes: 10e3, // 10KB
        MaxBytes: 10e6, // 10MB
    })
    defer reader.Close()

    log.Println("Starting consumer...")

    for {
        msg, err := reader.ReadMessage(context.Background())
        if err != nil {
            log.Println("Error reading message:", err)
            continue
        }

        // Parse message
        var event OrderEvent
        if err := json.Unmarshal(msg.Value, &event); err != nil {
            log.Println("Error parsing message:", err)
            continue
        }

        // Process event
        log.Printf("Processing order: %s, Amount: $%.2f\n", event.OrderID, event.Amount)

        // Simulate processing
        processOrder(&event)
    }
}

func processOrder(event *OrderEvent) {
    // Business logic here
    time.Sleep(100 * time.Millisecond)
}
```

### Manual Offset Management

```go
func ConsumeWithManualCommit() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "orders",
        GroupID: "order-processor",
    })
    defer reader.Close()

    for {
        msg, err := reader.FetchMessage(context.Background())
        if err != nil {
            log.Println(err)
            continue
        }

        // Process message
        var event OrderEvent
        json.Unmarshal(msg.Value, &event)

        err = processOrder(&event)
        if err != nil {
            log.Printf("Failed to process %s: %v\n", event.OrderID, err)
            // Don't commit - will retry
            continue
        }

        // Commit offset only after successful processing
        if err := reader.CommitMessages(context.Background(), msg); err != nil {
            log.Println("Failed to commit:", err)
        }

        log.Printf("Committed offset %d\n", msg.Offset)
    }
}
```

---

## Topics & Partitions

### Creating Topics

```bash
# Using kafka-topics.sh
docker exec -it kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 1

# List topics
docker exec -it kafka kafka-topics --list \
  --bootstrap-server localhost:9092

# Describe topic
docker exec -it kafka kafka-topics --describe \
  --bootstrap-server localhost:9092 \
  --topic orders
```

### Partitioning Strategy

```
Why Partitions?
1. Parallelism: Multiple consumers
2. Ordering:    Guaranteed within partition
3. Scalability: Distribute load

Partition Assignment:
- Key-based:   hash(key) % num_partitions
- Round-robin: If no key
- Custom:      Custom partitioner

Example (3 partitions):
user-1 → Partition 0
user-2 → Partition 1
user-3 → Partition 2
user-1 → Partition 0 (same user, same partition)
```

### Partition Selection

```go
// Choosing number of partitions
/*
Factors:
1. Consumer parallelism: Max consumers = num partitions
2. Broker capacity
3. Producer throughput

Formula:
Partitions >= (Target Throughput) / (Consumer Throughput)

Example:
- Target: 1M msgs/sec
- Each consumer: 100K msgs/sec
- Partitions = 1M / 100K = 10 partitions
*/

// Create topic with Go
func CreateTopic() {
    conn, _ := kafka.Dial("tcp", "localhost:9092")
    defer conn.Close()

    topicConfig := kafka.TopicConfig{
        Topic:             "orders",
        NumPartitions:     10,
        ReplicationFactor: 3,
    }

    err := conn.CreateTopics(topicConfig)
    if err != nil {
        log.Fatal(err)
    }
}
```

---

## Consumer Groups

### How Consumer Groups Work

```
Topic: orders (3 partitions)

Consumer Group: order-processors
├── Consumer 1 → Partition 0
├── Consumer 2 → Partition 1
└── Consumer 3 → Partition 2

Rules:
1. Each partition consumed by ONE consumer in group
2. If consumer dies, partitions rebalanced
3. Can't have more consumers than partitions
```

### Multiple Consumer Groups

```
orders topic

Group 1 (order-processor):
- Consumer A → All partitions
- Processes orders

Group 2 (analytics):
- Consumer B → All partitions
- Generates reports

Group 3 (email-sender):
- Consumer C → All partitions
- Sends confirmation emails

Each group gets ALL messages independently!
```

### Implementation

```go
// Consumer Group 1: Order Processing
func OrderProcessor() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "orders",
        GroupID: "order-processor",  // Same group ID
    })
    defer reader.Close()

    for {
        msg, _ := reader.ReadMessage(context.Background())
        // Process order
        log.Printf("[ORDER-PROCESSOR] Processing: %s\n", msg.Value)
    }
}

// Consumer Group 2: Analytics
func Analytics() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "orders",
        GroupID: "analytics",  // Different group ID
    })
    defer reader.Close()

    for {
        msg, _ := reader.ReadMessage(context.Background())
        // Generate analytics
        log.Printf("[ANALYTICS] Analyzing: %s\n", msg.Value)
    }
}

func main() {
    go OrderProcessor()
    go Analytics()
    
    select {} // Keep running
}
```

---

## Event-Driven Patterns

### 1. Event Sourcing

```go
// Store all events, rebuild state
type Event struct {
    Type      string          `json:"type"`
    AggregateID string        `json:"aggregate_id"`
    Data      json.RawMessage `json:"data"`
    Timestamp time.Time       `json:"timestamp"`
}

// Events for an order
var events = []Event{
    {Type: "OrderCreated", AggregateID: "ord-1", Data: []byte(`{"user_id":"user-1","total":99.99}`)},
    {Type: "PaymentReceived", AggregateID: "ord-1", Data: []byte(`{"amount":99.99}`)},
    {Type: "OrderShipped", AggregateID: "ord-1", Data: []byte(`{"tracking":"TRACK123"}`)},
}

// Publish events to Kafka
func PublishEvent(event Event) error {
    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "order-events",
    })
    defer writer.Close()

    value, _ := json.Marshal(event)
    return writer.WriteMessages(context.Background(), kafka.Message{
        Key:   []byte(event.AggregateID),
        Value: value,
    })
}

// Rebuild order state from events
func RebuildOrderState(orderID string) *Order {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "order-events",
    })
    defer reader.Close()

    order := &Order{ID: orderID}

    for {
        msg, err := reader.ReadMessage(context.Background())
        if err != nil {
            break
        }

        var event Event
        json.Unmarshal(msg.Value, &event)

        if event.AggregateID != orderID {
            continue
        }

        // Apply event
        switch event.Type {
        case "OrderCreated":
            order.Status = "created"
        case "PaymentReceived":
            order.Status = "paid"
        case "OrderShipped":
            order.Status = "shipped"
        }
    }

    return order
}
```

### 2. CQRS (Command Query Responsibility Segregation)

```go
// Write Model (commands)
type OrderCommandHandler struct {
    kafkaWriter *kafka.Writer
}

func (h *OrderCommandHandler) CreateOrder(cmd CreateOrderCommand) error {
    // Validate command
    
    // Publish event
    event := OrderCreatedEvent{
        OrderID: uuid.New().String(),
        UserID:  cmd.UserID,
        Items:   cmd.Items,
        Total:   cmd.Total,
    }
    
    value, _ := json.Marshal(event)
    return h.kafkaWriter.WriteMessages(context.Background(), kafka.Message{
        Key:   []byte(event.OrderID),
        Value: value,
    })
}

// Read Model (queries)
type OrderQueryHandler struct {
    db *sql.DB
}

func (h *OrderQueryHandler) GetOrder(orderID string) (*Order, error) {
    // Read from optimized read database
    var order Order
    err := h.db.QueryRow("SELECT * FROM orders WHERE id = $1", orderID).Scan(&order)
    return &order, err
}

// Event Processor (updates read model)
func EventProcessor() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "order-events",
        GroupID: "read-model-updater",
    })
    defer reader.Close()

    for {
        msg, _ := reader.ReadMessage(context.Background())
        
        var event OrderCreatedEvent
        json.Unmarshal(msg.Value, &event)
        
        // Update read database
        db.Exec(`
            INSERT INTO orders (id, user_id, total, status)
            VALUES ($1, $2, $3, 'created')
        `, event.OrderID, event.UserID, event.Total)
    }
}
```

### 3. Saga Pattern (Distributed Transactions)

```go
// Order Saga - coordinated via Kafka
func OrderSaga() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "order-commands",
        GroupID: "order-saga",
    })
    defer reader.Close()

    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "saga-events",
    })
    defer writer.Close()

    for {
        msg, _ := reader.ReadMessage(context.Background())
        
        var cmd CreateOrderCommand
        json.Unmarshal(msg.Value, &cmd)
        
        // Step 1: Reserve inventory
        inventoryEvent := ReserveInventoryEvent{OrderID: cmd.OrderID}
        publishEvent(writer, "inventory-commands", inventoryEvent)
        
        // Wait for confirmation
        confirmed := waitForEvent("inventory-confirmed", cmd.OrderID)
        if !confirmed {
            // Compensate - cancel order
            cancelEvent := CancelOrderEvent{OrderID: cmd.OrderID}
            publishEvent(writer, "order-commands", cancelEvent)
            continue
        }
        
        // Step 2: Process payment
        paymentEvent := ProcessPaymentEvent{OrderID: cmd.OrderID, Amount: cmd.Total}
        publishEvent(writer, "payment-commands", paymentEvent)
        
        // Wait for confirmation
        confirmed = waitForEvent("payment-confirmed", cmd.OrderID)
        if !confirmed {
            // Compensate - release inventory
            releaseEvent := ReleaseInventoryEvent{OrderID: cmd.OrderID}
            publishEvent(writer, "inventory-commands", releaseEvent)
            continue
        }
        
        // Success - confirm order
        confirmEvent := ConfirmOrderEvent{OrderID: cmd.OrderID}
        publishEvent(writer, "order-events", confirmEvent)
    }
}
```

### 4. Change Data Capture (CDC)

```go
// Capture database changes and publish to Kafka
func DatabaseCDC() {
    // Listen to PostgreSQL WAL (Write-Ahead Log)
    // Or use Debezium connector
    
    // When user is created in database:
    user := User{ID: 1, Name: "John", Email: "john@example.com"}
    
    // Publish to Kafka
    event := UserCreatedEvent{
        UserID: user.ID,
        Name:   user.Name,
        Email:  user.Email,
    }
    
    publishToKafka("user-events", event)
    
    // Other services consume this event
    // - Send welcome email
    // - Update analytics
    // - Sync to Elasticsearch
}
```

---

## Best Practices

### 1. Message Serialization

```go
// JSON (simple, human-readable)
type OrderEvent struct {
    OrderID string  `json:"order_id"`
    Amount  float64 `json:"amount"`
}

// Avro (schema evolution, compact)
import "github.com/linkedin/goavro/v2"

schema := `{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "amount", "type": "double"}
  ]
}`

codec, _ := goavro.NewCodec(schema)
binary, _ := codec.BinaryFromNative(nil, map[string]interface{}{
    "order_id": "ord-123",
    "amount":   99.99,
})
```

### 2. Error Handling

```go
func ConsumeWithRetry() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "orders",
        GroupID: "order-processor",
    })
    defer reader.Close()

    deadLetterWriter := kafka.NewWriter(kafka.WriterConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "orders-dlq", // Dead Letter Queue
    })
    defer deadLetterWriter.Close()

    for {
        msg, _ := reader.FetchMessage(context.Background())
        
        // Retry logic
        var err error
        for attempt := 0; attempt < 3; attempt++ {
            err = processMessage(msg)
            if err == nil {
                break
            }
            time.Sleep(time.Second * time.Duration(attempt+1))
        }
        
        if err != nil {
            // Send to DLQ after max retries
            deadLetterWriter.WriteMessages(context.Background(), kafka.Message{
                Key:   msg.Key,
                Value: msg.Value,
                Headers: []kafka.Header{
                    {Key: "error", Value: []byte(err.Error())},
                },
            })
        }
        
        // Commit regardless
        reader.CommitMessages(context.Background(), msg)
    }
}
```

### 3. Exactly-Once Semantics

```go
// Enable idempotence
writer := kafka.NewWriter(kafka.WriterConfig{
    Brokers:  []string{"localhost:9092"},
    Topic:    "orders",
    Idempotent: true, // Prevents duplicate messages
})

// Transactional writes
writer := kafka.NewWriter(kafka.WriterConfig{
    Brokers:  []string{"localhost:9092"},
    Topic:    "orders",
    Transactions: true,
    TransactionalID: "order-producer-1",
})

// Begin transaction
writer.BeginTxn()

// Write messages
writer.WriteMessages(ctx, messages...)

// Commit transaction
writer.CommitTxn()
// or writer.AbortTxn()
```

### 4. Monitoring

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    messagesProduced = prometheus.NewCounter(prometheus.CounterOpts{
        Name: "kafka_messages_produced_total",
    })
    
    messagesConsumed = prometheus.NewCounter(prometheus.CounterOpts{
        Name: "kafka_messages_consumed_total",
    })
    
    consumerLag = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "kafka_consumer_lag",
    })
)

func init() {
    prometheus.MustRegister(messagesProduced, messagesConsumed, consumerLag)
}
```

---

## Interview Questions

**Q1: Kafka vs RabbitMQ - when to use each?**

**Answer:**
- **Kafka**: High throughput, message retention, replay capability, stream processing. Use for event streaming, log aggregation, CDC.
- **RabbitMQ**: Complex routing, traditional queuing, lower throughput. Use for task queues, RPC, priority queues.

**Q2: How does Kafka guarantee message ordering?**

**Answer:** Ordering guaranteed **within a partition only**. Messages with same key go to same partition (hash-based). To ensure global ordering, use single partition (limits throughput). For per-entity ordering (e.g., per user), use entity ID as key.

**Q3: What is consumer lag and how to handle it?**

**Answer:** Lag = difference between latest offset and consumer's current offset. Indicates consumer can't keep up. Solutions:
- Scale consumers (add more to group)
- Optimize processing (faster code, batching)
- Increase partitions (more parallelism)
- Tune consumer config (fetch sizes, poll intervals)

**Q4: Explain Kafka replication.**

**Answer:** Each partition has N replicas across brokers. One leader (handles reads/writes), others followers (sync data). If leader fails, follower promoted. Replication factor 3 = 1 leader + 2 followers. ISR (In-Sync Replicas) = replicas caught up with leader.

**Q5: How do you handle poison messages?**

**Answer:** Poison message = message that causes processing to fail repeatedly. Solutions:
1. Retry with exponential backoff
2. Dead Letter Queue (DLQ) after max retries
3. Manual review/fix in DLQ
4. Skip message (log and continue)
5. Circuit breaker pattern

---

## Hands-On Exercise

### Task: Build Event-Driven Order System

```go
// Complete event-driven order processing
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"
    
    "github.com/segmentio/kafka-go"
)

// Events
type OrderCreatedEvent struct {
    OrderID   string    `json:"order_id"`
    UserID    string    `json:"user_id"`
    Total     float64   `json:"total"`
    Timestamp time.Time `json:"timestamp"`
}

type PaymentProcessedEvent struct {
    OrderID string  `json:"order_id"`
    Amount  float64 `json:"amount"`
}

type OrderShippedEvent struct {
    OrderID  string `json:"order_id"`
    Tracking string `json:"tracking"`
}

// Order Service - publishes OrderCreated
func OrderService() {
    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "order-events",
    })
    defer writer.Close()

    event := OrderCreatedEvent{
        OrderID:   "ord-12345",
        UserID:    "user-67890",
        Total:     199.99,
        Timestamp: time.Now(),
    }

    value, _ := json.Marshal(event)
    writer.WriteMessages(context.Background(), kafka.Message{
        Key:   []byte(event.OrderID),
        Value: value,
    })

    log.Println("Order created:", event.OrderID)
}

// Payment Service - consumes OrderCreated, publishes PaymentProcessed
func PaymentService() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "order-events",
        GroupID: "payment-service",
    })
    defer reader.Close()

    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "payment-events",
    })
    defer writer.Close()

    for {
        msg, _ := reader.ReadMessage(context.Background())
        
        var orderEvent OrderCreatedEvent
        json.Unmarshal(msg.Value, &orderEvent)

        // Process payment
        log.Printf("Processing payment for order: %s\n", orderEvent.OrderID)
        time.Sleep(2 * time.Second) // Simulate payment processing

        // Publish payment event
        paymentEvent := PaymentProcessedEvent{
            OrderID: orderEvent.OrderID,
            Amount:  orderEvent.Total,
        }
        value, _ := json.Marshal(paymentEvent)
        writer.WriteMessages(context.Background(), kafka.Message{
            Key:   []byte(paymentEvent.OrderID),
            Value: value,
        })

        log.Printf("Payment processed for order: %s\n", orderEvent.OrderID)
    }
}

// Shipping Service - consumes PaymentProcessed, publishes OrderShipped
func ShippingService() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "payment-events",
        GroupID: "shipping-service",
    })
    defer reader.Close()

    writer := kafka.NewWriter(kafka.WriterConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "shipping-events",
    })
    defer writer.Close()

    for {
        msg, _ := reader.ReadMessage(context.Background())
        
        var paymentEvent PaymentProcessedEvent
        json.Unmarshal(msg.Value, &paymentEvent)

        // Ship order
        log.Printf("Shipping order: %s\n", paymentEvent.OrderID)
        time.Sleep(1 * time.Second)

        // Publish shipping event
        shippingEvent := OrderShippedEvent{
            OrderID:  paymentEvent.OrderID,
            Tracking: "TRACK-" + paymentEvent.OrderID,
        }
        value, _ := json.Marshal(shippingEvent)
        writer.WriteMessages(context.Background(), kafka.Message{
            Key:   []byte(shippingEvent.OrderID),
            Value: value,
        })

        log.Printf("Order shipped: %s, Tracking: %s\n", shippingEvent.OrderID, shippingEvent.Tracking)
    }
}

// Notification Service - consumes all events
func NotificationService() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "order-events",
        GroupID: "notification-service",
    })
    defer reader.Close()

    for {
        msg, _ := reader.ReadMessage(context.Background())
        log.Printf("Sending notification for: %s\n", msg.Value)
    }
}

func main() {
    // Start services
    go PaymentService()
    go ShippingService()
    go NotificationService()

    time.Sleep(2 * time.Second)

    // Create order
    OrderService()

    select {} // Keep running
}
```

---

## 📚 Additional Resources

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Designing Event-Driven Systems (Ben Stopford)](https://www.confluent.io/designing-event-driven-systems/)
- [Kafka: The Definitive Guide](https://www.confluent.io/resources/kafka-the-definitive-guide/)
- [Segmentio Kafka-Go](https://github.com/segmentio/kafka-go)

---

## ✅ Module Checklist

- [ ] Install and configure Kafka
- [ ] Implement producer with partitioning
- [ ] Build consumer with offset management
- [ ] Create consumer groups for parallel processing
- [ ] Implement event sourcing pattern
- [ ] Build CQRS with Kafka
- [ ] Implement saga pattern for distributed transactions
- [ ] Complete event-driven order system exercise

---

**Next Module:** [Module 20: Frontend-Backend Integration](./20_Frontend_Backend_Integration.md) - Connect UIs to your APIs! 🌐
