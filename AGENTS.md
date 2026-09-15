# SP-Manager — AI Development Rules

## Project Identity

- Project Name: SP-Manager
- GitHub Repository: ShiningPearlTinted/SP-Manager
- Local Development Root: DEVELOPMENT
- Frontend: frontend
- Local Hardware Agent: agent

## LOCKED EXISTING FUNCTIONALITY

The existing SP-Manager application is the source of truth.

All existing functionality is LOCKED by default.

Do NOT:
- remove existing functionality
- replace existing functionality
- rename existing functionality
- refactor unrelated code
- rewrite working code unnecessarily
- revert to older versions of the code
- restore old implementations unless explicitly requested
- change existing calculations or business logic without explicit instruction
- change existing UI/layout/design without explicit instruction
- change existing database/API behaviour without explicit instruction
- change authentication or access behaviour without explicit instruction
- change existing customer, sales, report, booking, payment, warranty, or other workflows without explicit instruction

## CHANGE POLICY

Only modify the exact functionality explicitly requested by the user.

Before changing code:
1. Read the current implementation.
2. Understand how the existing function works.
3. Identify the smallest safe change.
4. Preserve all unrelated functionality.

Do not assume that an old implementation is better than the current implementation.

The latest code in this repository is always the source of truth.

## FRONTEND

The existing frontend uses React and Vite.

Treat these existing files as LOCKED unless the user explicitly requests changes:
- frontend/src/main.jsx
- frontend/src/styles.css
- frontend/vite.config.js

Preserve the existing:
- UI structure
- navigation
- calculations
- business logic
- forms
- buttons
- workflows
- API integration
- responsive behaviour

## LOCAL HARDWARE AGENT

The agent/ directory contains the SP-Manager Local Agent.

It is used for local hardware integration such as:
- printers
- cash drawer
- display

Do NOT modify, replace, remove, reinstall, or refactor the Local Agent unless the user explicitly requests a change to the Local Agent.

Do not confuse the Local Agent with an AI coding agent.

## TESTING

After every requested code change:

1. Check for syntax errors.
2. Run the relevant tests or checks.
3. Run the frontend production build when applicable:
   npm run build
4. Check that existing functionality has not been unintentionally changed.
5. Report any errors clearly.

Never hide or ignore build errors.

## GIT SAFETY

Use Git as the recovery mechanism.

Before major changes, create a clear local checkpoint when appropriate.

Do NOT push changes to GitHub unless the user explicitly asks for a GitHub push.

Never force-push.

Never delete or rewrite Git history without explicit permission.

## PRODUCTION SAFETY

Do not deploy to production or modify the live website/domain unless explicitly requested by the user.

Do not modify unrelated repositories or websites.

## COMMUNICATION

When completing a change, clearly report:
- what was changed
- which files were changed
- what existing functionality was preserved
- what tests/builds were run
- whether any issues remain

If a requested change could significantly affect existing functionality, stop and explain the impact before making the change.

## PRIORITY

User instructions have priority for requested changes.

However, a request to change one feature is NOT permission to modify unrelated features.

Preserve everything that was not explicitly requested.
