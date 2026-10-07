#!/bin/bash
# Script for installing git hooks

#set -euxo pipefail #DEBUG
set -euo pipefail #NORMAL

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "📦 Installing git hooks..."

# Create the hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Copy the pre-commit hook
if [ -f "$HOOKS_DIR/pre-commit" ]; then
    echo "⚠️ pre-commit hook already exists, creating backup..."
    mv "$HOOKS_DIR/pre-commit" "$HOOKS_DIR/pre-commit.backup.$(date +%s)"
fi

cat > "$HOOKS_DIR/pre-commit" << 'HOOK_EOF'
#!/bin/bash
# Pre-commit hook for checking trailing whitespaces and newline at the end of the file

#set -euxo pipefail #DEBUG
set -euo pipefail #NORMAL

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Checking code quality..."

# Get the list of staged files (excluding deleted ones)
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(html|css|js|json|tf|yaml|yml|sh|md|txt|py|Makefile)$' || true)

if [ -z "$FILES" ]; then
    echo -e "${GREEN}✓ No files to check${NC}"
    exit 0
fi

# Check each file for trailing whitespaces and missing newline at the end
FOUND_ISSUES=0

for FILE in $FILES; do
    if [ -f "$FILE" ]; then
        # Check for trailing spaces at the end of lines
        if grep -n ' $' "$FILE" > /dev/null 2>&1; then
            if [ $FOUND_ISSUES -eq 0 ]; then
                echo -e "${RED}✗ Issues found:${NC}"
                FOUND_ISSUES=1
            fi
            echo -e "${YELLOW}  $FILE: trailing whitespaces${NC}"
            grep -n ' $' "$FILE" | head -5 | sed 's/^/    /'
            if [ $(grep -c ' $' "$FILE") -gt 5 ]; then
                echo -e "    ${YELLOW}... and $(( $(grep -c ' $' "$FILE") - 5 )) more lines${NC}"
            fi
        fi

        # Check for missing newline at the end of the file
        if [ -n "$(tail -c 1 "$FILE")" ]; then
            if [ $FOUND_ISSUES -eq 0 ]; then
                echo -e "${RED}✗ Issues found:${NC}"
                FOUND_ISSUES=1
            fi
            echo -e "${YELLOW}  $FILE: missing newline at the end of the file${NC}"
        fi
    fi
done

if [ $FOUND_ISSUES -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Commit rejected: formatting issues found${NC}"
    echo ""
    echo -e "${YELLOW}To fix, run:${NC}"
    echo -e "  ${GREEN}# Remove trailing whitespaces from all staged files${NC}"
    echo -e "  git diff --cached --name-only | xargs sed -i 's/[[:space:]]*$//'"
    echo ""
    echo -e "  ${GREEN}# Add a newline at the end of files (macOS)${NC}"
    echo -e "  for f in \$(git diff --cached --name-only); do [ -n \"\$(tail -c 1 \"\$f\")\" ] && echo >> \"\$f\"; done"
    echo ""
    echo -e "  ${GREEN}# Or fix manually and add the files again${NC}"
    echo -e "  git add <file>"
    echo ""
    echo -e "${YELLOW}To skip the check (not recommended):${NC}"
    echo -e "  git commit --no-verify"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ All checks passed${NC}"
exit 0
HOOK_EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "Installed hooks:"
echo "  - pre-commit: checks trailing whitespaces and newline at the end of files"
echo ""
echo "To test:"
echo "  git add <file> && git commit -m 'test'"

