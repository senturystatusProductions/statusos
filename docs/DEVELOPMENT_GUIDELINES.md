# StatusOS Development Guidelines

## Required Workflow

1. Confirm the current branch.
2. Run `git status`.
3. Make one small change.
4. Save.
5. Test in the browser.
6. Check the browser console.
7. Commit only working files.
8. Push to `main`.
9. Update documentation.

## Instruction Format

Every development instruction must include:

1. Where to click
2. What to find
3. What to change
4. How to save
5. How to test
6. Git commit
7. Rollback

## Safety Rules

- Never paste secret keys into source files or chat.
- Never replace large JavaScript sections without first viewing the full surrounding function.
- Prefer isolated files and small patches.
- Do not proceed after a failed test.
- Keep a clean Git checkpoint before medium- or high-risk work.
- Use `git restore <file>` to return a file to the latest commit when needed.

## Versioning

- Patch release: small fix or UI improvement, for example `v0.2.5`
- Minor release: meaningful new module or capability, for example `v0.3.0`
- Major release: production-ready milestone, for example `v1.0.0`
