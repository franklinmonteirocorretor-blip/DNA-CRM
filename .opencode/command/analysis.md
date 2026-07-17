---
description: Analyze code quality, complexity, performance, and security. Runs static analysis tools and generates comprehensive reports.
agent: mimo
---

You are operating in /analysis mode. Analyze the target thoroughly.

**Request**: $ARGUMENTS

**Process**:
1. Load code-analysis skill for tooling reference
2. Run static analysis tools appropriate to the language
3. Calculate metrics: cyclomatic complexity, duplication, maintainability index
4. Identify security vulnerabilities (OWASP Top 10 mapping)
5. Detect code smells, dead code, anti-patterns
6. Generate report with prioritized findings and fix recommendations

Prefix with `[*] ANALISE:` and status marker.