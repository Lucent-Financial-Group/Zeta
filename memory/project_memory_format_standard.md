---
name: project_memory_format_standard
description: "The canonical standard for the format of memory files."
type: project-policy
originSessionId: lior-b0330-work
---

# Memory Format Standard

This document defines the standard format for all files within the `memory/` directory. Adherence to this standard is enforced by the `memory-schema-validator` tool (B-0335).

## 1. Filename Conventions

Memory files MUST be named according to their type, using the following prefixes:

- **`feedback_*`:** For memories that capture direct feedback from a human operator.
- **`project_*`:** For memories that document ongoing work, structural facts about the repository, or project-level policies (like this one).
- **`user_*`:** For memories that are private to a specific user or agent persona.
- **`reference_*`:** For memories that contain reference material, such as conversation transcripts or external articles.

## 2. Frontmatter Schema

Every memory file MUST begin with a YAML frontmatter block containing at least the following fields:

- **`name`:** A unique identifier for the memory. Should match the file name without the `.md` extension.
- **`description`:** A one-sentence summary of the memory's content.
- **`type`:** The type of the memory, which MUST be one of `feedback`, `project`, `user`, or `reference`.

Optional fields include:
- **`originSessionId`:** The session ID in which the memory was created.
- **`composes_with`:** A list of other memory files that this memory relates to.

## 3. Section Headers

The body of a memory file should be organized with the following standard section headers, where applicable:

- **`## What this observes`:** A description of the observation or event that prompted the creation of this memory.
- **`## The carved sentence`:** A single, concise sentence that captures the core lesson or takeaway of the memory.
- **`## Composes with`:** A list of links to related memory files, providing context and connections.
