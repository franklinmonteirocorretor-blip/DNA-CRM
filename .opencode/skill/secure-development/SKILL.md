---
name: secure-development
description: Use when building or reviewing applications with security requirements. Covers secure coding patterns, hardening configurations, encryption, authentication, and OWASP defenses. Trigger keywords: secure coding, security hardening, authentication, JWT, encryption, OWASP, XSS prevention, SQL injection prevention, CSP, security headers, secure API.
---

# Secure Development Toolkit

Security-hardened development patterns across all tech stacks.

## Authentication & Authorization

### JWT Best Practices
```javascript
// Use strong algorithms (RS256/ES256, NOT none/HS256 with weak secrets)
// Short expiration (15 min access + refresh token pattern)
// Validate: signature, expiration, issuer, audience

const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: userId, role: userRole },
  PRIVATE_KEY,
  { algorithm: 'RS256', expiresIn: '15m', issuer: 'myapp' }
);

// Refresh token: opaque random string stored server-side, single-use
```

### Password Storage
```python
# Argon2id (winner of Password Hashing Competition)
from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
hash = ph.hash(password)

# bcrypt as fallback (minimum cost 12)
import bcrypt
hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
```

### Rate Limiting
```python
# Per-IP and per-account rate limiting on auth endpoints
# 5 attempts per minute per IP
# 10 attempts per hour per account
# Progressive delays after failures
```

## Input Validation & Injection Prevention

### SQL Injection Prevention
```python
# Use parameterized queries ALWAYS
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
cursor.execute("SELECT * FROM users WHERE name = :name", {"name": user_name})

# NEVER concatenate user input into queries
# If ORM, verify it generates parameterized queries
```

### XSS Prevention
```html
<!-- Output encoding based on context -->
<!-- HTML context: & < > " ' -->
<!-- HTML attribute context: same + always quote attributes -->
<!-- JavaScript context: \xHH \uHHHH -->
<!-- URL context: %HH -->

<!-- Content-Security-Policy header -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
```

### Command Injection Prevention
```python
# Use subprocess with list args (NOT shell=True with string)
subprocess.run(['ls', '-la', user_dir], check=True)

# If shell is unavoidable, escape thoroughly
import shlex
safe = shlex.quote(user_input)
```

### Path Traversal Prevention
```python
# Validate and canonicalize paths
import os
user_path = os.path.realpath(os.path.join(base_dir, user_input))
if not user_path.startswith(os.path.realpath(base_dir)):
    raise SecurityError("Path traversal detected")
```

## Security Headers

```nginx
# Recommended security headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "0" always;                            # Deprecated, use CSP
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
```

## C/C++ Secure Compilation

```bash
# Compiler hardening flags
gcc -O2 \
  -fstack-protector-strong \    # Stack canary
  -D_FORTIFY_SOURCE=2 \         # Buffer overflow detection in glibc
  -Wformat -Wformat-security \  # Format string warnings
  -fPIE \                       # Position-independent code
  -o binary source.c

# Linker hardening flags  
ld \
  -z relro \                    # Read-only relocations
  -z now \                      # Full RELRO (bind now)
  -pie \                        # Position-independent executable
  -z noexecstack \              # Non-executable stack
  -o binary
```

## Encryption

### Data at Rest
```python
# AES-256-GCM with random IV (12 bytes) per encryption
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
aesgcm = AESGCM(key)  # key must be 32 bytes
nonce = os.urandom(12)
ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)

# Store: nonce + ciphertext (GCM includes auth tag)
```

### Data in Transit
- TLS 1.3 minimum, TLS 1.2 with strong ciphers as fallback
- HSTS header with long max-age and preload
- Certificate pinning for mobile apps
- Mutual TLS for service-to-service communication

### Key Management
- Never hardcode keys; use environment variables or secrets manager
- Rotate keys regularly
- Separate keys per environment
- Audit key access

## Container Security

```dockerfile
# Minimal base image
FROM alpine:3.19

# Non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

# Minimal dependencies
# No compilers, no debugging tools in production image

# HEALTHCHECK for monitoring
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

## Security Checklist for Every Implementation

- [ ] No hardcoded secrets, keys, or credentials
- [ ] All user input validated and sanitized
- [ ] Parameterized queries (no string concatenation for SQL)
- [ ] Output encoded for context (HTML, JS, URL)
- [ ] Authentication uses secure session tokens
- [ ] Password hashing with Argon2id or bcrypt(cost>=12)
- [ ] Rate limiting on auth endpoints
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- [ ] TLS enforced with strong ciphers
- [ ] No debug endpoints in production
- [ ] Error messages don't leak internals
- [ ] File uploads validated (size, type, content, path)
- [ ] CORS restricted to known origins
- [ ] Dependencies audited for CVEs