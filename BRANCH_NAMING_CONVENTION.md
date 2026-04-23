# Branch Naming Convention

## 🎯 Overview

This document defines the branch naming conventions for this project to ensure consistency, clarity, and automated workflow compatibility.

## 📋 Branch Naming Rules

### Format
```
<type>/<ticket-id>-<short-description>
```

### Components

#### 1. **Type** (Required)
| Type | Description | Example |
|------|-------------|---------|
| `feature` | New features or enhancements | `feature/AUTH-123-user-login` |
| `bugfix` | Bug fixes | `bugfix/BUG-456-fix-login-error` |
| `hotfix` | Critical production fixes | `hotfix/CRIT-789-security-patch` |
| `refactor` | Code refactoring without new features | `refactor/TECH-101-cleanup-utils` |
| `docs` | Documentation updates | `docs/DOC-202-update-readme` |
| `test` | Adding or updating tests | `test/TEST-303-add-unit-tests` |
| `chore` | Maintenance tasks, build changes | `chore/BUILD-404-update-deps` |
| `release` | Release preparation | `release/v1.2.3` |

#### 2. **Ticket ID** (Optional but Recommended)
- Use your project management system ticket ID
- Examples: `JIRA-123`, `GH-456`, `TICKET-789`
- If no ticket exists, use descriptive identifier

#### 3. **Short Description** (Required)
- Use kebab-case (lowercase with hyphens)
- Keep it concise but descriptive
- Maximum 50 characters recommended

## ✅ Valid Examples

```bash
# Feature branches
feature/AUTH-123-user-authentication
feature/PAY-456-stripe-integration
feature/search-functionality

# Bug fixes
bugfix/LOGIN-789-fix-password-reset
bugfix/UI-101-button-alignment
bugfix/memory-leak-fix

# Hotfixes
hotfix/SECURITY-999-xss-vulnerability
hotfix/PROD-111-database-connection

# Other types
refactor/TECH-222-restructure-components
docs/update-testing-guide
test/add-integration-tests
chore/UPDATE-333-upgrade-react
release/v2.1.0
```

## ❌ Invalid Examples

```bash
# Bad: No type
user-login-feature

# Bad: Spaces
feature/user login page

# Bad: CamelCase
feature/userLoginPage

# Bad: Too vague
feature/fix

# Bad: Special characters
feature/user@login!

# Bad: Too long
feature/TICKET-123-implement-comprehensive-user-authentication-system-with-oauth-and-2fa
```

## 🚀 Branch Lifecycle

### Main Branches
- `main` - Production-ready code
- `develop` - Integration branch for features
- `dev` - Development/testing branch

### Feature Workflow
1. Create branch from `develop`
2. Follow naming convention
3. Develop feature
4. Create PR to `develop`
5. After review, merge and delete branch

### Hotfix Workflow
1. Create branch from `main`
2. Use `hotfix/` prefix
3. Fix critical issue
4. Create PR to both `main` and `develop`
5. After merge, delete branch

## 🛠️ Enforcement

### Local Validation
- Pre-push Git hook validates branch names
- Prevents pushing branches with invalid names

### CI/CD Integration
- GitHub Actions validate branch names
- Automated checks on all pushes

### GitHub Settings
- Branch protection rules enforce naming
- Required status checks for valid names

## 📝 Configuration

### IDE Integration
Configure your IDE to suggest branch names:

**VS Code Settings:**
```json
{
  "git.branchPrefix": "feature/",
  "git.branchSuggestions": [
    "feature/",
    "bugfix/",
    "hotfix/",
    "refactor/",
    "docs/",
    "test/",
    "chore/"
  ]
}
```

### Branch Creation Helper Script
Use the provided script for easy branch creation:
```bash
# Create a feature branch with ticket ID
./scripts/create-branch.sh feature user-authentication AUTH-123

# Create a bugfix branch with ticket ID  
./scripts/create-branch.sh bugfix login-error BUG-456

# Create a docs branch without ticket ID
./scripts/create-branch.sh docs update-readme
```

The script will:
- ✅ Validate the branch type and description
- ✅ Check if the branch already exists
- ✅ Create and checkout the new branch
- ✅ Provide next steps guidance

### Git Aliases
Add to your `.gitconfig`:
```bash
[alias]
  new-feature = "!f() { git checkout -b feature/$1; }; f"
  new-bugfix = "!f() { git checkout -b bugfix/$1; }; f"
  new-hotfix = "!f() { git checkout -b hotfix/$1; }; f"
```

Usage:
```bash
git new-feature TICKET-123-user-login
git new-bugfix BUG-456-fix-button
git new-hotfix CRIT-789-security-patch
```

## 🎯 Best Practices

### DO:
- ✅ Use descriptive names that explain the purpose
- ✅ Include ticket/issue numbers when available
- ✅ Keep descriptions concise but clear
- ✅ Use consistent formatting across the team
- ✅ Delete branches after merging

### DON'T:
- ❌ Use personal identifiers in branch names
- ❌ Create branches with generic names like "fix" or "update"
- ❌ Use special characters or spaces
- ❌ Create long-lived feature branches
- ❌ Push directly to main branches

## 🔧 Troubleshooting

### Branch Name Rejected?
```bash
# Check current branch name
git branch --show-current

# Rename current branch
git branch -m new-valid-name

# Delete remote branch and push with new name
git push origin --delete old-branch-name
git push origin -u new-valid-name
```

### Common Issues
1. **Spaces in names** → Use hyphens instead
2. **Missing type prefix** → Add appropriate type/
3. **Too long** → Shorten description
4. **Special characters** → Use only letters, numbers, hyphens

## 📊 Validation Rules

The following regex pattern validates branch names:
```regex
^(feature|bugfix|hotfix|refactor|docs|test|chore|release)\/[a-zA-Z0-9]+([a-zA-Z0-9\-]*[a-zA-Z0-9])?$
```

### Pattern Breakdown:
- `^` - Start of string
- `(feature|bugfix|hotfix|refactor|docs|test|chore|release)` - Valid types
- `\/` - Forward slash separator
- `[a-zA-Z0-9]+` - At least one alphanumeric character
- `([a-zA-Z0-9\-]*[a-zA-Z0-9])?` - Optional additional chars with hyphens
- `$` - End of string

## 🎉 Benefits

- **Consistency**: Uniform naming across the team
- **Automation**: CI/CD workflows trigger correctly
- **Organization**: Easy to understand branch purpose
- **Integration**: Works with project management tools
- **Cleanup**: Easier to identify and remove old branches

---

## Quick Reference Card

```
Types: feature, bugfix, hotfix, refactor, docs, test, chore, release
Format: type/TICKET-123-short-description
Examples:
  ✅ feature/AUTH-123-user-login
  ✅ bugfix/UI-456-button-fix
  ✅ hotfix/PROD-789-critical-fix
  ❌ feature/user login
  ❌ fix-something
  ❌ myFeatureBranch
```

For questions or suggestions, please create an issue or reach out to the development team. 