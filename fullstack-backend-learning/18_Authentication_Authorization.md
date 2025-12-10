# Module 18: Authentication & Authorization 🔐

## Secure Your Applications with Modern Auth Patterns

**Duration:** 6-7 hours  
**Prerequisites:** Module 03 (REST APIs), JWT basics, cryptography basics  
**Outcome:** Implement production-grade authentication and authorization systems

---

## 📚 Table of Contents

1. [Authentication vs Authorization](#authentication-vs-authorization)
2. [Password Security](#password-security)
3. [Session-Based Auth](#session-based-auth)
4. [JWT (JSON Web Tokens)](#jwt-json-web-tokens)
5. [OAuth 2.0](#oauth-20)
6. [OIDC (OpenID Connect)](#oidc-openid-connect)
7. [RBAC (Role-Based Access Control)](#rbac-role-based-access-control)
8. [Best Practices](#best-practices)
9. [Interview Questions](#interview-questions)
10. [Hands-On Exercise](#hands-on-exercise)

---

## Authentication vs Authorization

### Definitions

```
Authentication (AuthN):
"Who are you?"
- Verify identity
- Login with username/password
- Prove you are who you claim

Authorization (AuthZ):
"What can you do?"
- Verify permissions
- Check if user can access resource
- After authentication
```

### Example

```
Authentication:
User logs in with email/password → Verified as "john@example.com"

Authorization:
Can john@example.com delete this post?
→ Check permissions: Is john the author? Is john an admin?
```

---

## Password Security

### Hashing (NOT Encryption)

```
Encryption: Reversible (decrypt with key)
Hashing:    One-way (cannot reverse)

Use hashing for passwords!
```

### bcrypt (Recommended)

```go
import "golang.org/x/crypto/bcrypt"

// Hash password
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
    return string(bytes), err
}

// Verify password
func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

// Usage
func Register(username, password string) error {
    hash, err := HashPassword(password)
    if err != nil {
        return err
    }
    
    // Store username + hash in database
    _, err = db.Exec("INSERT INTO users (username, password_hash) VALUES ($1, $2)", username, hash)
    return err
}

func Login(username, password string) (bool, error) {
    var hash string
    err := db.QueryRow("SELECT password_hash FROM users WHERE username = $1", username).Scan(&hash)
    if err != nil {
        return false, err
    }
    
    return CheckPassword(password, hash), nil
}
```

### Password Policies

```go
import "regexp"

func ValidatePassword(password string) error {
    if len(password) < 8 {
        return errors.New("password must be at least 8 characters")
    }
    
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    hasSpecial := regexp.MustCompile(`[!@#$%^&*]`).MatchString(password)
    
    if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
        return errors.New("password must contain uppercase, lowercase, number, and special character")
    }
    
    return nil
}
```

---

## Session-Based Auth

### How It Works

```
1. User logs in with credentials
2. Server creates session, stores in server memory/Redis
3. Server sends session ID to client (cookie)
4. Client sends cookie with each request
5. Server validates session ID
```

### Implementation

```go
import (
    "github.com/gorilla/sessions"
    "github.com/go-redis/redis/v8"
)

var store = sessions.NewCookieStore([]byte("secret-key-change-in-production"))

// Login handler
func LoginHandler(w http.ResponseWriter, r *http.Request) {
    username := r.FormValue("username")
    password := r.FormValue("password")
    
    // Verify credentials
    user, err := authenticateUser(username, password)
    if err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }
    
    // Create session
    session, _ := store.Get(r, "session")
    session.Values["user_id"] = user.ID
    session.Values["username"] = user.Username
    session.Save(r, w)
    
    json.NewEncoder(w).Encode(map[string]string{"message": "Logged in"})
}

// Protected endpoint
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
    session, _ := store.Get(r, "session")
    
    userID, ok := session.Values["user_id"]
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    
    // Fetch user data
    user, _ := getUserByID(userID.(int))
    json.NewEncoder(w).Encode(user)
}

// Logout handler
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
    session, _ := store.Get(r, "session")
    session.Values["user_id"] = nil
    session.Options.MaxAge = -1 // Delete cookie
    session.Save(r, w)
    
    json.NewEncoder(w).Encode(map[string]string{"message": "Logged out"})
}
```

### Redis Session Store

```go
import (
    "github.com/rbcervilla/redisstore/v8"
    "github.com/go-redis/redis/v8"
)

func NewRedisStore() *redisstore.RedisStore {
    client := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    
    store, _ := redisstore.NewRedisStore(context.Background(), client)
    store.KeyPrefix("session:")
    store.Options.MaxAge = 86400 * 7 // 7 days
    
    return store
}

// Usage
var store = NewRedisStore()

func LoginHandler(w http.ResponseWriter, r *http.Request) {
    // ... authentication logic ...
    
    session, _ := store.Get(r, "session")
    session.Values["user_id"] = user.ID
    session.Save(r, w)
}
```

---

## JWT (JSON Web Tokens)

### Structure

```
Header.Payload.Signature

Header (algorithm, type):
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload (claims):
{
  "sub": "1234567890",        // Subject (user ID)
  "name": "John Doe",
  "iat": 1516239022,           // Issued at
  "exp": 1516242622            // Expiration
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Generate JWT

```go
import "github.com/golang-jwt/jwt/v5"

var jwtSecret = []byte("your-secret-key-change-in-production")

type Claims struct {
    UserID   int    `json:"user_id"`
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}

func GenerateToken(user *User) (string, error) {
    claims := Claims{
        UserID:   user.ID,
        Username: user.Username,
        Role:     user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Issuer:    "myapp",
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtSecret)
}

// Login handler
func LoginHandler(w http.ResponseWriter, r *http.Request) {
    var creds struct {
        Username string `json:"username"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&creds)
    
    // Authenticate user
    user, err := authenticateUser(creds.Username, creds.Password)
    if err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }
    
    // Generate JWT
    token, err := GenerateToken(user)
    if err != nil {
        http.Error(w, "Error generating token", http.StatusInternalServerError)
        return
    }
    
    json.NewEncoder(w).Encode(map[string]string{
        "token": token,
    })
}
```

### Verify JWT

```go
func VerifyToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing method
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return jwtSecret, nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }
    
    return nil, errors.New("invalid token")
}

// Middleware
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract token from header
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            http.Error(w, "Missing authorization header", http.StatusUnauthorized)
            return
        }
        
        // Bearer <token>
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        
        // Verify token
        claims, err := VerifyToken(tokenString)
        if err != nil {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
        
        // Add claims to context
        ctx := context.WithValue(r.Context(), "claims", claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Protected handler
func ProfileHandler(w http.ResponseWriter, r *http.Request) {
    claims := r.Context().Value("claims").(*Claims)
    
    user, _ := getUserByID(claims.UserID)
    json.NewEncoder(w).Encode(user)
}
```

### Refresh Tokens

```go
func GenerateTokenPair(user *User) (accessToken, refreshToken string, err error) {
    // Short-lived access token (15 minutes)
    accessClaims := Claims{
        UserID:   user.ID,
        Username: user.Username,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
        },
    }
    accessTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
    accessToken, _ = accessTokenObj.SignedString(jwtSecret)
    
    // Long-lived refresh token (7 days)
    refreshClaims := jwt.RegisteredClaims{
        Subject:   fmt.Sprintf("%d", user.ID),
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
    }
    refreshTokenObj := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
    refreshToken, _ = refreshTokenObj.SignedString(jwtSecret)
    
    // Store refresh token in database
    storeRefreshToken(user.ID, refreshToken)
    
    return accessToken, refreshToken, nil
}

func RefreshAccessToken(w http.ResponseWriter, r *http.Request) {
    var req struct {
        RefreshToken string `json:"refresh_token"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    
    // Verify refresh token
    token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
        return jwtSecret, nil
    })
    
    if err != nil || !token.Valid {
        http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
        return
    }
    
    claims := token.Claims.(jwt.MapClaims)
    userID := int(claims["sub"].(float64))
    
    // Verify refresh token exists in database
    if !isValidRefreshToken(userID, req.RefreshToken) {
        http.Error(w, "Refresh token revoked", http.StatusUnauthorized)
        return
    }
    
    // Generate new access token
    user, _ := getUserByID(userID)
    accessToken, _ := GenerateToken(user)
    
    json.NewEncoder(w).Encode(map[string]string{
        "access_token": accessToken,
    })
}
```

---

## OAuth 2.0

### What is OAuth 2.0?

**Authorization framework** - allows third-party apps to access user data without sharing passwords.

### Use Case

```
User wants to use "Photo Editor App" 
to edit photos from Google Drive

Without OAuth:
User gives Photo Editor their Google password ❌

With OAuth:
1. Photo Editor redirects to Google
2. User logs in to Google (not Photo Editor)
3. User grants Photo Editor access to Drive
4. Google gives Photo Editor access token
5. Photo Editor uses token to access Drive ✅
```

### OAuth 2.0 Flows

#### 1. Authorization Code Flow (Most Common)

```
Client (Web App) → Authorization Server (Google) → Resource Server (Google Drive)

1. Client redirects user to authorization server:
   https://accounts.google.com/oauth/authorize?
     client_id=123&
     redirect_uri=https://myapp.com/callback&
     response_type=code&
     scope=drive.readonly

2. User logs in and approves

3. Authorization server redirects back with code:
   https://myapp.com/callback?code=AUTH_CODE

4. Client exchanges code for access token:
   POST https://oauth2.googleapis.com/token
   {
     "code": "AUTH_CODE",
     "client_id": "123",
     "client_secret": "secret",
     "redirect_uri": "https://myapp.com/callback",
     "grant_type": "authorization_code"
   }

5. Response:
   {
     "access_token": "ya29.a0AfH6SMBx...",
     "refresh_token": "1//0gLn...",
     "expires_in": 3600
   }

6. Client uses access token:
   GET https://www.googleapis.com/drive/v3/files
   Authorization: Bearer ya29.a0AfH6SMBx...
```

#### 2. Client Credentials Flow (Server-to-Server)

```go
// Service accessing another service (no user)
func GetAccessToken() (string, error) {
    data := url.Values{}
    data.Set("grant_type", "client_credentials")
    data.Set("client_id", "your-client-id")
    data.Set("client_secret", "your-client-secret")
    
    resp, err := http.PostForm("https://oauth.provider.com/token", data)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    
    var result struct {
        AccessToken string `json:"access_token"`
        ExpiresIn   int    `json:"expires_in"`
    }
    json.NewDecoder(resp.Body).Decode(&result)
    
    return result.AccessToken, nil
}
```

### Implement OAuth 2.0 Server

```go
import "github.com/go-oauth2/oauth2/v4"

// OAuth server setup
func SetupOAuthServer() *server.Server {
    manager := manage.NewDefaultManager()
    
    // Token store (memory, Redis, etc.)
    manager.MustTokenStorage(store.NewMemoryTokenStore())
    
    // Client store
    clientStore := store.NewClientStore()
    clientStore.Set("client-1", &models.Client{
        ID:     "client-1",
        Secret: "client-secret",
        Domain: "http://localhost:8080",
    })
    manager.MapClientStorage(clientStore)
    
    srv := server.NewDefaultServer(manager)
    srv.SetAllowGetAccessRequest(true)
    
    return srv
}

// Authorization endpoint
func AuthorizeHandler(w http.ResponseWriter, r *http.Request) {
    // Display login page
    // After login, redirect with authorization code
}

// Token endpoint
func TokenHandler(w http.ResponseWriter, r *http.Request) {
    srv.HandleTokenRequest(w, r)
}
```

---

## OIDC (OpenID Connect)

### What is OIDC?

**Identity layer on top of OAuth 2.0**. OAuth = authorization, OIDC = authentication.

### Difference

```
OAuth 2.0:
- "Let app access my photos" (authorization)
- Doesn't verify identity

OIDC:
- "Log in with Google" (authentication)
- Returns ID token with user info
```

### ID Token (JWT)

```json
{
  "iss": "https://accounts.google.com",
  "sub": "1234567890",
  "aud": "your-app-client-id",
  "exp": 1516242622,
  "iat": 1516239022,
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://..."
}
```

### Implement "Login with Google"

```go
import "github.com/coreos/go-oidc/v3/oidc"

var (
    clientID     = "your-google-client-id"
    clientSecret = "your-google-client-secret"
    redirectURL  = "http://localhost:8080/callback"
)

func main() {
    ctx := context.Background()
    
    provider, _ := oidc.NewProvider(ctx, "https://accounts.google.com")
    
    oauth2Config := oauth2.Config{
        ClientID:     clientID,
        ClientSecret: clientSecret,
        RedirectURL:  redirectURL,
        Endpoint:     provider.Endpoint(),
        Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
    }
    
    http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
        // Redirect to Google
        url := oauth2Config.AuthCodeURL("state-token")
        http.Redirect(w, r, url, http.StatusFound)
    })
    
    http.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
        // Exchange code for token
        oauth2Token, _ := oauth2Config.Exchange(ctx, r.URL.Query().Get("code"))
        
        // Extract ID token
        rawIDToken, _ := oauth2Token.Extra("id_token").(string)
        
        // Verify ID token
        verifier := provider.Verifier(&oidc.Config{ClientID: clientID})
        idToken, _ := verifier.Verify(ctx, rawIDToken)
        
        // Extract claims
        var claims struct {
            Email         string `json:"email"`
            EmailVerified bool   `json:"email_verified"`
            Name          string `json:"name"`
        }
        idToken.Claims(&claims)
        
        // Create session or JWT for user
        fmt.Fprintf(w, "Hello %s (%s)", claims.Name, claims.Email)
    })
    
    http.ListenAndServe(":8080", nil)
}
```

---

## RBAC (Role-Based Access Control)

### Concepts

```
User → Role → Permissions

Example:
User "john" has Role "Editor"
Role "Editor" has Permissions ["read", "write"]
→ john can read and write
```

### Database Schema

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE  -- admin, editor, viewer
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE  -- read, write, delete
);

CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id),
    role_id INTEGER REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);
```

### Implementation

```go
type RBAC struct {
    db *sql.DB
}

func (r *RBAC) HasPermission(userID int, permission string) (bool, error) {
    query := `
        SELECT COUNT(*) 
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = $1 AND p.name = $2
    `
    
    var count int
    err := r.db.QueryRow(query, userID, permission).Scan(&count)
    return count > 0, err
}

// Middleware
func RequirePermission(permission string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            claims := r.Context().Value("claims").(*Claims)
            
            rbac := &RBAC{db: db}
            hasPermission, _ := rbac.HasPermission(claims.UserID, permission)
            
            if !hasPermission {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}

// Usage
r.Handle("/posts", RequirePermission("write")(http.HandlerFunc(CreatePostHandler)))
```

### Resource-Based Access Control

```go
// Check if user owns resource
func CanDeletePost(userID, postID int) (bool, error) {
    var authorID int
    err := db.QueryRow("SELECT user_id FROM posts WHERE id = $1", postID).Scan(&authorID)
    if err != nil {
        return false, err
    }
    
    // User can delete if they're the author
    return authorID == userID, nil
}

func DeletePostHandler(w http.ResponseWriter, r *http.Request) {
    claims := r.Context().Value("claims").(*Claims)
    postID := mux.Vars(r)["id"]
    
    canDelete, _ := CanDeletePost(claims.UserID, postID)
    if !canDelete {
        http.Error(w, "You don't have permission to delete this post", http.StatusForbidden)
        return
    }
    
    // Delete post
    db.Exec("DELETE FROM posts WHERE id = $1", postID)
    w.WriteHeader(http.StatusNoContent)
}
```

---

## Best Practices

### 1. Never Store Passwords in Plain Text

```
❌ password: "mypassword123"
✅ password_hash: "$2a$14$xyz..."
```

### 2. Use HTTPS

```
All authentication traffic must be encrypted!
```

### 3. Token Storage

```
✅ httpOnly cookies (prevents XSS)
✅ Secure flag (HTTPS only)
❌ localStorage (vulnerable to XSS)
```

### 4. CSRF Protection

```go
import "github.com/gorilla/csrf"

func main() {
    CSRF := csrf.Protect(
        []byte("32-byte-long-auth-key"),
        csrf.Secure(false), // Set to true in production with HTTPS
    )
    
    http.Handle("/", CSRF(router))
}
```

### 5. Rate Limiting

```go
import "golang.org/x/time/rate"

var limiter = rate.NewLimiter(1, 3) // 1 req/sec, burst of 3

func LoginHandler(w http.ResponseWriter, r *http.Request) {
    if !limiter.Allow() {
        http.Error(w, "Too many requests", http.StatusTooManyRequests)
        return
    }
    
    // Login logic
}
```

---

## Interview Questions

**Q1: Session-based vs Token-based (JWT) authentication?**

**Answer:**
- **Session**: Server stores session, client has cookie. Stateful. Good for web apps. Harder to scale (need shared session store).
- **JWT**: Self-contained token, server validates signature. Stateless. Good for APIs, microservices. Token can't be revoked easily.

**Q2: How do you handle JWT expiration?**

**Answer:** Use refresh tokens:
- Short-lived access token (15 min)
- Long-lived refresh token (7 days)
- When access token expires, client uses refresh token to get new access token
- Store refresh tokens in database for revocation

**Q3: What is OAuth 2.0 and when to use it?**

**Answer:** Authorization framework for delegated access. Use when:
- Third-party app needs access to user's data (Google Drive, GitHub)
- Don't want to share passwords
- Examples: "Login with Google", "Connect Spotify"

**Q4: RBAC vs ABAC (Attribute-Based Access Control)?**

**Answer:**
- **RBAC**: User → Role → Permissions. Simpler, role-centric. Example: Admin, Editor, Viewer.
- **ABAC**: Policies based on attributes (user, resource, environment). More flexible. Example: "Allow if user.department == resource.department AND time < 5pm"

**Q5: How do you secure against common attacks?**

**Answer:**
- **SQL Injection**: Use parameterized queries
- **XSS**: Sanitize input, use httpOnly cookies
- **CSRF**: Use CSRF tokens, SameSite cookies
- **Brute Force**: Rate limiting, account lockout
- **Session Fixation**: Regenerate session ID after login

---

## Hands-On Exercise

### Task: Build Complete Auth System

```go
// Complete auth system with JWT + RBAC
package main

import (
    "database/sql"
    "encoding/json"
    "net/http"
    "time"
    
    "github.com/golang-jwt/jwt/v5"
    "github.com/gorilla/mux"
    "golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("secret")
var db *sql.DB

type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
    Role     string `json:"role"`
}

type Claims struct {
    UserID int    `json:"user_id"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

// Register
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Username string `json:"username"`
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    
    // Hash password
    hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 14)
    
    // Insert user
    var userID int
    err := db.QueryRow(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, 'user')
        RETURNING id
    `, req.Username, req.Email, hash).Scan(&userID)
    
    if err != nil {
        http.Error(w, "User already exists", http.StatusConflict)
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]int{"user_id": userID})
}

// Login
func LoginHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Username string `json:"username"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    
    // Get user
    var user User
    var hash string
    err := db.QueryRow(`
        SELECT id, username, email, role, password_hash
        FROM users WHERE username = $1
    `, req.Username).Scan(&user.ID, &user.Username, &user.Email, &user.Role, &hash)
    
    if err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }
    
    // Verify password
    if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }
    
    // Generate JWT
    claims := Claims{
        UserID: user.ID,
        Role:   user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, _ := token.SignedString(jwtSecret)
    
    json.NewEncoder(w).Encode(map[string]string{
        "token": tokenString,
    })
}

// Auth middleware
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tokenString := r.Header.Get("Authorization")[7:] // Remove "Bearer "
        
        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return jwtSecret, nil
        })
        
        if err != nil || !token.Valid {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        
        ctx := context.WithValue(r.Context(), "claims", claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Admin middleware
func AdminOnly(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        claims := r.Context().Value("claims").(*Claims)
        
        if claims.Role != "admin" {
            http.Error(w, "Forbidden", http.StatusForbidden)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}

func main() {
    r := mux.NewRouter()
    
    // Public routes
    r.HandleFunc("/register", RegisterHandler).Methods("POST")
    r.HandleFunc("/login", LoginHandler).Methods("POST")
    
    // Protected routes
    api := r.PathPrefix("/api").Subrouter()
    api.Use(AuthMiddleware)
    api.HandleFunc("/profile", ProfileHandler).Methods("GET")
    
    // Admin routes
    admin := r.PathPrefix("/admin").Subrouter()
    admin.Use(AuthMiddleware, AdminOnly)
    admin.HandleFunc("/users", ListUsersHandler).Methods("GET")
    
    http.ListenAndServe(":8080", r)
}
```

---

## 📚 Additional Resources

- [JWT.io](https://jwt.io/)
- [OAuth 2.0 Spec](https://oauth.net/2/)
- [OWASP Auth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Go OAuth2 Package](https://pkg.go.dev/golang.org/x/oauth2)

---

## ✅ Module Checklist

- [ ] Implement password hashing with bcrypt
- [ ] Build session-based authentication
- [ ] Generate and verify JWT tokens
- [ ] Implement refresh tokens
- [ ] Build OAuth 2.0 server
- [ ] Integrate "Login with Google" (OIDC)
- [ ] Implement RBAC system
- [ ] Complete full auth system exercise

---

**Next Module:** [Module 19: Kafka & Event-Driven Architecture](./19_Kafka_Event_Driven.md) - Build scalable event systems! 📨
