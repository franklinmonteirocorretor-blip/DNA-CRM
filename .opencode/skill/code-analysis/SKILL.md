---
name: code-analysis
description: Use when analyzing code quality, complexity, security, performance, or architecture. Trigger keywords: code review, analyze code, code quality, complexity analysis, code smells, dead code, static analysis, audit code, security audit, technical debt.
---

# Code Analysis Toolkit

Intelligent code analysis covering quality, security, performance, and architecture.

## Analysis Dimensions

### 1. Code Quality
- Cyclomatic complexity per function
- Code duplication percentage
- Dead code detection
- Anti-pattern identification
- Naming convention consistency
- Error handling completeness

### 2. Security
- Input validation gaps
- SQL injection risks
- XSS vulnerabilities
- Hardcoded credentials/secrets
- Insecure crypto usage
- Missing access controls
- Unsafe memory operations (C/C++)
- Command injection risks
- Path traversal risks

### 3. Performance
- Algorithm complexity bottlenecks
- Inefficient database queries
- Memory allocation patterns
- Lock contention risks
- Network I/O patterns
- Redundant computations

### 4. Architecture
- Coupling analysis (afferent/efferent)
- Dependency graph
- Layering violations
- SOLID principle adherence
- Design pattern usage
- Module cohesion

## Analysis Commands

### Python
```bash
# Security linting
bandit -r <project_dir>

# Code quality
pylint <source_files>
flake8 <source_files>

# Type checking
mypy <source_files>

# Complexity
radon cc <source_files>
radon mi <source_files>
```

### JavaScript/TypeScript
```bash
# Static analysis
eslint <source_files>
npx tsc --noEmit

# Security
npm audit
npx snyk test
```

### C/C++
```bash
# Static security analysis
flawfinder <source_files>
cppcheck --enable=all <source_files>

# Runtime analysis
valgrind --tool=memcheck <binary>
gcc -fsanitize=address -g <source_files>

# Fuzzing
afl-fuzz -i inputs/ -o outputs/ -- <binary> @@
```

### Go
```bash
# Static analysis
go vet ./...
staticcheck ./...

# Security
gosec ./...

# Complexity
gocyclo -over 15 .
```

### Rust
```bash
# Built-in
cargo clippy
cargo audit

# Unsafe code audit
cargo geiger
```

### General/Multi-language
```bash
# Semgrep for pattern-based security rules
semgrep --config=auto <project_dir>
semgrep --config=p/owasp-top-ten <project_dir>

# CodeQL (GitHub)
codeql database create <db> --language=<lang> --source-root=<dir>
codeql database analyze <db> <query-pack> --format=sarif-latest --output=results.sarif
```

## Metrics to Calculate

| Metric | Tool | Threshold |
|--------|------|-----------|
| Cyclomatic Complexity | radon/gocyclo | >10 = warn, >15 = high |
| Maintainability Index | radon | <50 = needs refactor |
| LOC per function | manual/grep | >50 = consider split |
| Duplication % | jscpd/dupl | >5% = review |
| Comment ratio | cloc | <10% = undocumented |
| Test coverage | coverage tools | <80% = insufficient |

## Report Template

```markdown
# Code Analysis Report

## Summary
- Total files: <N>
- Total LOC: <N>
- Average complexity: <N>
- Duplication: <N>%

## Critical Findings
| # | File | Line | Issue | Severity | Fix |
|---|------|------|-------|----------|-----|

## Complexity Heatmap
(Functions with complexity > 10)

## Security Vulnerabilities
(OWASP Top 10 mapping)

## Architecture Assessment
(Coupling, cohesion, layering)

## Recommendations
(Prioritized by severity and effort)
```