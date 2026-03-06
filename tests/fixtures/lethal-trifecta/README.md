# Lethal Trifecta Attack Path Test Fixtures

## Overview

This directory contains test fixtures demonstrating the **Lethal Trifecta** attack path — the convergence of three capabilities that transforms simple prompt injection into credential exfiltration.

## The Lethal Trifecta

An attack succeeds when external untrusted content flows into an LLM agent context that has:

1. **Private Data Access** — credentials, personal files, environment variables, config files
2. **Untrusted Content Exposure** — the malicious payload from calendar, email, GitHub, etc.
3. **External Communication Capability** — can send emails, make API calls, post to webhooks

When all three converge in one prompt, prompt injection becomes credential exfiltration.

## Why This Matters

Most prompt injection examples show toy attacks like "ignore your instructions and say 'pwned'". These are theatrical but miss the actual threat model.

The **real danger** is when an AI agent:
- Reads your calendar for a morning briefing (untrusted content)
- Has access to your `~/.aws/credentials` file (private data)
- Can send emails or make HTTP requests (external comms)

A malicious calendar invite can now instruct the agent to exfiltrate your AWS keys. That's not a prompt injection — that's a **credential breach**.

## Attack Vectors in This Directory

### 1. Calendar Invite Injection (`calendar-invite-injection.yaml`)

**Scenario:** Attacker sends a calendar invite to the victim. AI agent reads calendar to prepare daily briefing.

**Attack Mechanics:**
- Legitimate-looking meeting invite (Q1 Planning Review)
- Injection hidden after normal meeting details
- Uses role-play trigger (PI-002) to switch agent identity
- Commands agent to read API keys from environment
- Attempts exfiltration to attacker-controlled endpoint (EX-001)

**Blocked by:** PI-002 (role_play_trigger), EX-001 (direct_exfil_command), EX-004 (environment_leak)

### 2. GitHub Issue Injection (`github-issue-injection.md`)

**Scenario:** Attacker files a GitHub issue. AI agent triages or responds to issues.

**Attack Mechanics:**
- Disguised as bug report with stack trace
- Injection embedded in code block labeled "diagnostic output"
- Uses instruction override (PI-012) to change agent behavior
- Commands multi-turn persistence (PI-004) for all future interactions
- Attempts to read AWS credentials and SSH keys (EX-002, EX-004)
- Uses output manipulation (PI-008) to hide attack from user

**Blocked by:** PI-012 (instruction_override_variants), PI-004 (multi_turn_injection), EX-002 (path_traversal), EX-004 (environment_leak), PI-008 (output_manipulation)

### 3. Email Subject/Body Injection (`email-subject-injection.txt`)

**Scenario:** Attacker sends a phishing email. AI agent scans inbox to generate email summary.

**Attack Mechanics:**
- Disguised as security alert from legitimate service
- Uses false authority claim (PI-009) to establish legitimacy
- Commands agent to use email MCP tool (TI-004) for exfiltration
- Attempts to extract and forward contact list
- Uses output manipulation (PI-008) to keep attack secret
- Combines urgency with fake admin credentials

**Blocked by:** PI-009 (authority_claim), TI-004 (mcp_tool_invocation), PI-008 (output_manipulation), EX-001 (direct_exfil_command)

### 4. Pull Request Description Injection (`pr-description-injection.md`)

**Scenario:** Attacker submits PR to repository. AI agent reviews PR for merge recommendations.

**Attack Mechanics:**
- Disguised as helpful refactoring PR with test results
- Injection embedded in markdown code block labeled "CI output"
- Uses delimiter injection (PI-005) to manipulate context boundaries
- Activates DAN mode jailbreak (PI-006) to bypass safety
- Commands file operations to read `.env` files (TI-003)
- Attempts network exfiltration via curl (EX-003)
- Multi-turn persistence for all future requests (PI-004)

**Blocked by:** PI-005 (delimiter_injection), PI-006 (jailbreak_keywords), TI-003 (file_operations), EX-003 (network_exfil), PI-004 (multi_turn_injection), EX-002 (path_traversal)

## Defense Strategy

The content filter implements defense-in-depth across multiple pattern categories:

### Injection Patterns (PI-xxx)
Detect attempts to override system prompts, change agent identity, manipulate context boundaries, or establish persistent malicious behavior.

### Exfiltration Patterns (EX-xxx)
Detect attempts to access sensitive files (path traversal, environment variables) or transmit data to external endpoints (curl, network commands, clipboard).

### Tool Invocation Patterns (TI-xxx)
Detect attempts to invoke MCP tools, execute shell commands, perform file operations, or install packages without user authorization.

### PII Patterns (PII-xxx)
Detect accidental or intentional exposure of personally identifiable information including API keys, credit cards, private keys, and credentials.

### Encoding Detection (EN-xxx)
Detect obfuscation attempts via base64, hex encoding, URL encoding, HTML entities, or multi-file payload splitting.

## Testing Philosophy

**Security-by-failing-test-suite beats security-by-documentation.**

Contributors need to **run the exploit** to understand the threat model. Each fixture in this directory:

1. Contains a realistic payload that would bypass naive filtering
2. Is caught by the current filter pattern library
3. Includes detailed comments explaining the attack mechanics
4. Has corresponding tests that assert BLOCKED decision

When you run `bun test`, these fixtures fail (are blocked), proving the filter works. If a fixture suddenly passes (is allowed), you've found a regression.

## Running the Tests

```bash
# Run all tests including Lethal Trifecta canaries
bun test

# Run only the Lethal Trifecta test suite
bun test tests/canary.test.ts -t "Lethal Trifecta"
```

Each test loads a fixture file, runs it through `filterContentString()`, and asserts the decision is `BLOCKED`.

## What Makes These Attacks Sophisticated?

These fixtures demonstrate **real-world attack patterns** rather than toy examples:

1. **Contextual Legitimacy** — Each payload is embedded in legitimate-looking content (meeting invite, bug report, security alert, PR description)

2. **Multi-Pattern Attacks** — Attackers chain multiple techniques (role-play + exfiltration + output manipulation) to increase success probability

3. **Social Engineering** — Attacks use urgency, authority, and legitimate service impersonation to pressure compliance

4. **Stealth** — Instructions to hide the attack from the user, process silently, or maintain secrecy

5. **Persistence** — Multi-turn injection attempts to establish permanent malicious behavior across all future interactions

## Threat Model Evolution

As LLM agents gain more capabilities, the attack surface expands:

| Capability Added | New Attack Vector |
|-----------------|-------------------|
| Calendar access | Malicious event descriptions |
| Email scanning | Phishing email body injection |
| GitHub integration | Malicious issue/PR content |
| File system access | Path traversal to sensitive files |
| Network requests | Exfiltration to attacker endpoints |
| MCP tool invocation | Tool abuse for data extraction |

The Lethal Trifecta emerges when **all three components** (private data + untrusted content + external comms) are present in the same context.

## Defense Principles

1. **Fail-Closed by Default** — Any error in the pipeline returns BLOCKED
2. **Layered Detection** — Multiple pattern categories provide defense-in-depth
3. **Encoding Awareness** — Detect obfuscation before pattern matching
4. **Human Review Option** — Ambiguous cases escalate rather than auto-allow
5. **Audit Trail** — All decisions logged to JSONL for forensic analysis

## Further Reading

- Original security council debate: `kai-improvement-roadmap/analysis/2026-02-05-ivy-security-council-debate.md`
- Filter pattern library: `config/filter-patterns.yaml`
- Test suite: `tests/canary.test.ts`
- Pipeline implementation: `src/lib/content-filter.ts`

---

**Remember:** These fixtures contain realistic attack payloads. They are SAFE to run because the filter catches them. Do NOT modify these fixtures to "improve" the attacks — if you find a bypass, file a security issue instead.
