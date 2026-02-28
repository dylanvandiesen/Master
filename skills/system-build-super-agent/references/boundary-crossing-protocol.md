# Boundary Crossing Protocol

## Default Exclusions

- `projects/*/src/**` (project implementation context)
- `remote-console/**` and `.agency/remote/**` (commander internals)

## Required Prompt Before Crossing

Use this exact prompt:

`This task touches excluded context (<projects source|commander internals>). Please confirm scope and target files so I can proceed safely.`

## Required Inputs

Before crossing boundaries, collect:

1. Confirmed scope (`projects source` or `commander internals`)
2. Exact file paths or folders
3. Expected outcome and constraints
4. Whether changes must remain system-only or include implementation details

## Safe Execution Rules

1. Keep edits minimal and scoped.
2. Do not broaden beyond confirmed files.
3. Re-state boundary crossing in final summary.
4. Return to system-only mode after completing boundary task.

## Refusal Condition

If scope confirmation is missing or ambiguous, do not proceed into excluded paths.
