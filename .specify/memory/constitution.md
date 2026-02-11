<!--
Sync Impact Report
==================
Version: 0.0.0 → 1.0.0 (MAJOR - Initial constitution)
Modified Principles: N/A (initial creation)
Added Sections:
  - I. Security & Privacy First (NON-NEGOTIABLE)
  - II. Package-Based Architecture
  - III. Data Normalization & Efficiency
  - IV. Responsible External System Integration
  - V. User Control & Transparency
  - Development Workflow section
  - Quality Standards section
  - Governance section
Removed Sections: N/A
Templates Requiring Updates:
  ✅ .specify/templates/spec-template.md - Reviewed, aligns with security and user story requirements
  ✅ .specify/templates/plan-template.md - Reviewed, Constitution Check section present
  ✅ .specify/templates/tasks-template.md - Reviewed, aligns with package structure and phased approach
  ✅ .specify/templates/checklist-template.md - Not reviewed (defer to next update)
  ✅ .claude/commands/*.md - Not reviewed (defer to next update)
Follow-up TODOs: None
-->

# Audible Library Share Platform Constitution

## Core Principles

### I. Security & Privacy First (NON-NEGOTIABLE)

The platform MUST NEVER request, store, or transmit Amazon/Audible user credentials. All data extraction MUST occur locally within the user's authenticated browser session. This principle is non-negotiable and supersedes all other requirements.

**Requirements**:
- Extension scraping MUST execute entirely in the user's browser with their existing Audible session
- Sync tokens MUST be short-lived (< 1 hour), single-use, and scoped to upload-only operations
- Users MUST be able to revoke extension connections at any time
- All user data visibility MUST be controlled by the user (public, unlisted, friends-only)
- No credentials, session tokens, or authentication cookies may be transmitted to the platform

**Rationale**: The platform's trust model depends on never touching user credentials. Any violation would compromise user trust and potentially violate Amazon/Audible's terms of service.

### II. Package-Based Architecture

The platform is organized as a monorepo with clearly separated packages. Each package MUST have a single, well-defined purpose documented in its PURPOSE.md file. Packages MUST NOT contain circular dependencies.

**Requirements**:
- Three core packages: `extension` (browser-based scraper), `ui` (web application), `db` (data storage)
- Each package MUST maintain its own PURPOSE.md documenting its responsibilities and boundaries
- Inter-package communication MUST occur through well-defined interfaces (HTTP APIs, JSON payloads, database schemas)
- Shared code MUST be extracted to a separate shared package, NOT duplicated across packages
- No package may directly access another package's internal implementation details

**Rationale**: Clear package boundaries enable independent development, testing, and deployment. This architecture scales better than monolithic designs and allows different packages to evolve at different rates.

### III. Data Normalization & Efficiency

The platform MUST maintain a shared title catalog to avoid duplicating metadata across users. User libraries MUST store references to catalog entries, not duplicate title data.

**Requirements**:
- Single source of truth: Title catalog stores all audiobook metadata (ASIN, title, authors, narrators, duration, cover art, summary, ratings, etc.)
- User libraries store ONLY: title references (foreign keys), user-specific metadata (progress, personal ratings, list membership, date added)
- When syncing, new titles get added to catalog; existing titles get referenced
- List creation (recommendation lists, tier lists) MUST reference titles from the user's library, which in turn references the catalog

**Rationale**: Thousands of users will share many of the same popular titles. Storing full metadata per user would waste storage and create consistency problems when title data needs updating.

### IV. Responsible External System Integration

When interacting with external systems (Audible, third-party APIs), the platform MUST implement rate limiting and graceful degradation. The platform MUST NOT overload external servers or violate their terms of service.

**Requirements**:
- Extension scraping MUST throttle requests to Audible (e.g., max 5 concurrent requests, delays between batches)
- Failed requests MUST use exponential backoff before retry
- Users MUST be shown clear status and progress during long-running operations
- Extension MUST NOT run in the background without explicit user initiation
- If external service rate-limits or blocks requests, operation MUST fail gracefully with clear user messaging

**Rationale**: Responsible integration protects both the external service and our users. Aggressive scraping could get users' IP addresses blocked by Audible or violate their terms of service.

### V. User Control & Transparency

Users MUST have full control over their data visibility and platform connections. All operations MUST provide clear status reporting and allow user intervention.

**Requirements**:
- Every list, library, and profile MUST have configurable visibility (public, unlisted, friends-only)
- Extension sync operations MUST show real-time progress (current item, total items, warnings, errors)
- Users MUST be able to view sync history with timestamps and item counts
- Failed operations MUST display actionable error messages, not generic failures
- Users MUST be able to disconnect extension, delete lists, or delete their entire account

**Rationale**: Users entrust us with data about their personal audiobook collections. Transparency and control are essential for maintaining that trust.

## Development Workflow

### Feature Specifications

All features MUST begin with a specification documenting user stories, requirements, and success criteria. Specifications MUST use the template at `.specify/templates/spec-template.md`.

**Requirements**:
- User stories MUST be prioritized (P1, P2, P3) and independently testable
- Functional requirements MUST be enumerated (FR-001, FR-002, etc.)
- Success criteria MUST be measurable and technology-agnostic
- Edge cases and error scenarios MUST be documented
- Unclear requirements MUST be marked with `[NEEDS CLARIFICATION: reason]`

### Implementation Planning

Features requiring more than trivial implementation MUST have an implementation plan following `.specify/templates/plan-template.md`.

**Requirements**:
- Plans MUST include Constitution Check verification
- Plans MUST document source code structure (which package(s) are affected)
- Plans MUST identify dependencies, data models, and API contracts
- Plans MUST justify any complexity that violates simplicity principles
- Plans MUST document what research was conducted and key findings

### Task Generation

Implementation plans MUST be broken down into actionable tasks following `.specify/templates/tasks-template.md`.

**Requirements**:
- Tasks MUST be organized by user story to enable independent testing
- Each user story's tasks MUST be completable independently
- Tasks MUST include exact file paths
- Parallel-safe tasks MUST be marked `[P]`
- Task dependencies MUST be explicitly documented

## Quality Standards

### Testing Expectations

The platform does NOT mandate TDD or specific test coverage thresholds unless explicitly requested in feature specifications. Testing strategies are determined per-feature based on risk and complexity.

**When tests ARE requested**:
- Tests MUST be written BEFORE implementation (TDD approach)
- Tests MUST fail before implementation begins
- Contract tests for API boundaries, integration tests for user journeys
- Tests MUST be organized by user story to enable independent validation

### Code Quality

- Prefer clarity over cleverness
- Document non-obvious decisions with inline comments
- Use meaningful variable and function names
- Avoid premature optimization
- Remove dead code rather than commenting it out

### Security Review

Features touching authentication, data access, or external integrations MUST undergo security review before merging.

**Review focus areas**:
- Ensure no credentials are logged or transmitted inappropriately
- Validate all user inputs
- Verify authorization checks on data access
- Check for injection vulnerabilities (SQL, XSS, etc.)
- Ensure tokens have appropriate expiration and scope

## Governance

This constitution supersedes all other development practices. When practices conflict with constitutional principles, the constitution wins.

### Amendment Process

1. **Propose**: Document proposed changes with rationale in a GitHub issue or discussion
2. **Review**: Core maintainers review for conflicts with existing principles and alignment with project vision
3. **Approve**: Changes require consensus from core maintainers
4. **Version**: Bump constitution version according to semantic versioning:
   - MAJOR: Backward-incompatible governance changes, principle removals, or redefinitions
   - MINOR: New principles added or materially expanded guidance
   - PATCH: Clarifications, wording improvements, typo fixes
5. **Propagate**: Update dependent templates (spec, plan, tasks) to reflect constitutional changes
6. **Document**: Add entry to Sync Impact Report at top of constitution file

### Compliance Review

- All pull requests MUST verify compliance with applicable constitutional principles
- Reviewers MUST flag violations and require changes before approval
- Feature specifications MUST reference relevant constitutional principles
- Implementation plans MUST include Constitution Check section documenting how the feature aligns with or requires exceptions to principles

### Complexity Justification

Any feature requiring complexity that violates simplicity principles MUST be justified in the implementation plan's Complexity Tracking section, documenting:
- What principle is being violated
- Why the complexity is necessary
- What simpler alternatives were considered and why they were rejected

**Version**: 1.0.0 | **Ratified**: 2026-02-11 | **Last Amended**: 2026-02-11
