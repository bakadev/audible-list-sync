# Feature Specification: User Lists (Recommendations + Tier Lists)

**Feature**: 006-user-lists
**Date**: 2026-02-21
**Status**: Draft
**Constitution Refs**: III (Data Normalization), V (User Control & Transparency)

## Overview

Users can create, manage, edit, and share curated lists from their personal audiobook library. Two list types are supported: **Recommendation Lists** (ordered sequences) and **Tier Lists** (tiered groupings like S/A/B/C). Lists are publicly viewable at a stable URL.

---

## User Stories

### P1 - Core List CRUD

**US-001**: As a user, I want to create a new list so I can organize titles from my library.
- **Given** I am authenticated and on the dashboard or lists page
- **When** I click "Create new list" and fill in name, description, and type
- **Then** a new list is created and I am taken to the list editor

**US-002**: As a user, I want to add titles from my library to a list so I can curate my collection.
- **Given** I am editing a list
- **When** I search my library and select a title
- **Then** the title is added to the list (no duplicates allowed)

**US-003**: As a user, I want to reorder items in a recommendation list via drag and drop.
- **Given** I am editing a recommendation list with multiple items
- **When** I drag an item to a new position
- **Then** the ordering is updated and persisted on save

**US-004**: As a user, I want to assign titles to tiers in a tier list via drag and drop.
- **Given** I am editing a tier list
- **When** I drag a title into a tier (e.g., S, A, B, C) and reorder within the tier
- **Then** the tier assignment and position are updated and persisted on save

**US-005**: As a user, I want to save my list so it becomes accessible at a public URL.
- **Given** I have finished editing a list
- **When** I click Save
- **Then** the list is persisted and viewable at `/[username]/lists/[listId]`

### P1 - List Management

**US-006**: As a user, I want to view all my lists so I can manage them.
- **Given** I am authenticated
- **When** I navigate to my lists page
- **Then** I see all my lists with name, type, item count, and last updated

**US-007**: As a user, I want to edit an existing list.
- **Given** I am on the manage lists page
- **When** I click edit on a list
- **Then** the editor opens with existing data pre-populated

**US-008**: As a user, I want to delete a list.
- **Given** I am on the manage lists page
- **When** I click delete and confirm
- **Then** the list and all its items are permanently removed

### P1 - Public Viewing

**US-009**: As a visitor, I want to view a public list by URL so I can see someone's recommendations.
- **Given** a list exists and is public
- **When** I visit `/[username]/lists/[listId]`
- **Then** I see the list name, description, type, and ordered items with book metadata

**US-010**: As a visitor, I want to see a user's public profile with their lists.
- **Given** a user exists with public lists
- **When** I visit `/[username]`
- **Then** I see the user's profile and their public lists

### P2 - Username System

**US-011**: As a user, I want to set a username so my profile and lists have a clean public URL.
- **Given** I am authenticated and have no username set
- **When** I set a unique username in settings
- **Then** my profile becomes accessible at `/[username]`

### P2 - Tier List Customization

**US-012**: As a user, I want to customize tier names and add/remove tiers.
- **Given** I am editing a tier list
- **When** I rename a tier or add/remove tiers
- **Then** the tier configuration is updated

---

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | List name: required, 3-80 chars, trimmed | P1 |
| FR-002 | List description: optional, max 500 chars, trimmed | P1 |
| FR-003 | List ID: UUID, stable, non-guessable | P1 |
| FR-004 | List type: enum RECOMMENDATION or TIER, immutable after creation | P1 |
| FR-005 | Title selection must come from user's library entries only | P1 |
| FR-006 | Prevent duplicate titles within a list | P1 |
| FR-007 | Max 100 titles per list | P1 |
| FR-008 | Recommendation list: persist explicit position index per item | P1 |
| FR-009 | Tier list: persist tier name + position index per item | P1 |
| FR-010 | Only owner can create/edit/delete lists | P1 |
| FR-011 | Public can view lists at stable URL (read-only) | P1 |
| FR-012 | If a library entry is deleted, remove corresponding list items | P1 |
| FR-013 | Default tiers for new tier lists: S, A, B, C, D | P2 |
| FR-014 | Custom tier names (3-20 chars each), max 10 tiers | P2 |
| FR-015 | Username: unique, 3-30 chars, alphanumeric + hyphens, lowercase | P2 |
| FR-016 | List allows zero titles (empty list is valid, saveable) | P1 |

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Create list with zero titles | Allowed; saves as empty list |
| Add 101st title | Show error toast, prevent addition |
| Same title added twice | Prevent; show "already in list" message |
| Library entry deleted after being added to list | List item auto-removed (cascade) |
| Title metadata changes (cover/title update) | No impact; metadata fetched from Audnex on view |
| Username not found at `/[username]` | 404 page |
| List not found at `/[username]/lists/[listId]` | 404 page |
| List belongs to different user than URL username | 404 page |
| Drag and drop on touch devices | Must work with touch events |
| Library search returns slowly | Show loading spinner, debounce 300ms |
| User has no library entries | Show empty state in title picker |
| Very long list names | Truncate in grid view, show full on detail |

---

## Non-Functional Requirements

- List page load: < 2s for lists with up to 100 items
- Drag and drop: 60fps, no layout shift
- Touch device support for all drag operations
- Keyboard accessible: tab through items, arrow keys to reorder
- Screen reader support for list ordering
