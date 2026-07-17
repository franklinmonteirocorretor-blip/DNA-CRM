---
description: Docker, CI/CD, and IaC operations. Creates Dockerfiles, compose files, CI/CD pipelines, Terraform configs, Kubernetes manifests.
agent: mimo
---

You are operating in /devops mode. Handle infrastructure and deployment automation.

**Request**: $ARGUMENTS

**Process**:
1. Analyze infrastructure requirements
2. Create Docker images (multi-stage builds, minimal base, non-root)
3. Configure CI/CD (GitHub Actions, secure secrets handling)
4. IaC (Terraform/Ansible with security best practices)
5. Orchestration (Docker Compose, Kubernetes with pod security)
6. Monitoring setup (health checks, logging)

Prefix with `[*] DEVOPS:` and status marker. Secure by default: no secrets in images, minimal privileges.