# Commands

Standardized command system for Claude Co-Work sessions on DisptchMama.

Commands are workflow prompts for the development agents, not runtime shell commands.

## Available Commands

### /deploy
**Purpose**: Build, validate, and prepare for deployment.

Steps:
1. Run `tsc --noEmit` — must pass with 0 errors
2. Run `npm run build` — verify compilation
3. Run `npm run lint` — check for warnings
4. Report results with pass/fail summary
5. If all pass, confirm ready for deploy

### /start-feature [name]
**Purpose**: Begin work on a new feature with proper safety.

Steps:
1. Create a safety branch from current state: `git checkout -b feature/[name]`
2. Create a todo list for the feature scope
3. Confirm the plan before writing any code

### /checkpoint
**Purpose**: Save current progress with a clean commit.

Steps:
1. Run `tsc --noEmit` — must pass
2. Stage changed files (specific files, not `git add .`)
3. Create commit with descriptive message
4. Report status

### /review
**Purpose**: Audit the current codebase for issues.

Steps:
1. Run `tsc --noEmit` — report errors
2. Check for unused imports, dead code
3. Verify architecture layer rules (no cross-layer violations)
4. Check for duplicated logic that should be in services
5. Report findings with severity

### /hotfix [description]
**Purpose**: Quick fix for a critical issue.

Steps:
1. Create branch: `git checkout -b hotfix/[description]`
2. Identify and fix the issue
3. Run `tsc --noEmit` to validate
4. Commit with clear message
5. Report what was fixed

### /refactor [target]
**Purpose**: Improve code structure without changing behavior.

Steps:
1. Create safety branch
2. Identify the refactoring scope
3. Execute changes incrementally
4. Run `tsc --noEmit` after each change
5. Commit when clean

### /release [version]
**Purpose**: Prepare a release.

Steps:
1. Run full `/deploy` checks
2. Update version in package.json if specified
3. Create release commit
4. Tag the release
5. Report release summary
