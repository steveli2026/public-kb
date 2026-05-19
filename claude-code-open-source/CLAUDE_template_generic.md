# Project Guide

## Project Goal
- This project exists to solve:
- The most important user outcome is:
- When making tradeoffs, prioritize:

## Tech Stack
- Framework:
- Language:
- State management:
- Styling/UI:
- Testing:
- Package manager:

## Architecture Rules
- Follow the existing project structure unless there is a clear reason to change it.
- Reuse existing patterns before introducing new abstractions.
- Keep functions and components small and easy to read.
- Prefer minimal, targeted changes over broad refactors.

## Coding Rules
- Do not use `any` unless explicitly approved.
- Keep naming consistent with the existing codebase.
- Add error handling for user-facing and network-related logic.
- Avoid adding new dependencies unless necessary.
- Preserve existing comments and do not rewrite unrelated code.

## File Safety Rules
- Ask before changing dependency versions, build config, or environment files.
- Do not modify deployment, CI, or infrastructure files unless the task requires it.
- Do not rename files or move directories unless necessary for the task.
- Ignore unrelated dirty changes in the repo.

## Testing Rules
- Add or update tests when changing behavior.
- Run the smallest relevant test scope first.
- If tests cannot be run, explain why clearly.
- Do not claim success without verification.

## Communication Rules
- Explain important tradeoffs briefly before large changes.
- Surface risks or assumptions clearly.
- Keep summaries concise and action-oriented.

## Preferred Workflow
- First understand the relevant files before editing.
- Then propose or execute the smallest correct change.
- After edits, verify with tests, lint, or a focused check when possible.
- Summarize what changed and any remaining risks.

## Hard Constraints
- Never delete large sections of code unless necessary.
- Never overwrite user changes without confirming.
- Never make destructive git operations.

## Project-Specific Notes
- Put important domain rules here.
- Put naming conventions here.
- Put API or data constraints here.
- Put UX/content tone requirements here.
