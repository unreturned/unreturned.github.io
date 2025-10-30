#!/bin/bash
# Скрипт для установки git hooks

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "📦 Установка git hooks..."

# Создаём директорию для hooks если её нет
mkdir -p "$HOOKS_DIR"

# Копируем pre-commit hook
if [ -f "$HOOKS_DIR/pre-commit" ]; then
    echo "⚠️  pre-commit hook уже существует, создаём backup..."
    mv "$HOOKS_DIR/pre-commit" "$HOOKS_DIR/pre-commit.backup.$(date +%s)"
fi

cat > "$HOOKS_DIR/pre-commit" << 'HOOK_EOF'
#!/bin/bash
# Pre-commit hook для проверки trailing whitespaces и newline в конце файла

set -e

# Цвета для вывода
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Проверка качества кода..."

# Получаем список staged файлов (исключая удалённые)
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(tf|yaml|yml|sh|md|txt|Makefile)$' || true)

if [ -z "$FILES" ]; then
    echo -e "${GREEN}✓ Нет файлов для проверки${NC}"
    exit 0
fi

# Проверяем каждый файл на trailing whitespaces и отсутствие newline в конце
FOUND_ISSUES=0

for FILE in $FILES; do
    if [ -f "$FILE" ]; then
        # Проверяем наличие пробелов в конце строк
        if grep -n ' $' "$FILE" > /dev/null 2>&1; then
            if [ $FOUND_ISSUES -eq 0 ]; then
                echo -e "${RED}✗ Найдены проблемы:${NC}"
                FOUND_ISSUES=1
            fi
            echo -e "${YELLOW}  $FILE: trailing whitespaces${NC}"
            grep -n ' $' "$FILE" | head -5 | sed 's/^/    /'
            if [ $(grep -c ' $' "$FILE") -gt 5 ]; then
                echo -e "    ${YELLOW}... и ещё $(( $(grep -c ' $' "$FILE") - 5 )) строк${NC}"
            fi
        fi

        # Проверяем наличие newline в конце файла
        if [ -n "$(tail -c 1 "$FILE")" ]; then
            if [ $FOUND_ISSUES -eq 0 ]; then
                echo -e "${RED}✗ Найдены проблемы:${NC}"
                FOUND_ISSUES=1
            fi
            echo -e "${YELLOW}  $FILE: нет символа новой строки в конце файла${NC}"
        fi
    fi
done

if [ $FOUND_ISSUES -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Коммит отклонён: найдены проблемы с форматированием${NC}"
    echo ""
    echo -e "${YELLOW}Для исправления выполните:${NC}"
    echo -e "  ${GREEN}# Удалить trailing whitespaces во всех staged файлах${NC}"
    echo -e "  git diff --cached --name-only | xargs sed -i 's/[[:space:]]*$//'"
    echo ""
    echo -e "  ${GREEN}# Добавить newline в конце файлов (macOS)${NC}"
    echo -e "  for f in \$(git diff --cached --name-only); do [ -n \"\$(tail -c 1 \"\$f\")\" ] && echo >> \"\$f\"; done"
    echo ""
    echo -e "  ${GREEN}# Или исправить вручную и снова добавить файлы${NC}"
    echo -e "  git add <файл>"
    echo ""
    echo -e "${YELLOW}Для пропуска проверки (не рекомендуется):${NC}"
    echo -e "  git commit --no-verify"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Все проверки пройдены${NC}"
exit 0
HOOK_EOF

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks успешно установлены!"
echo ""
echo "Установленные hooks:"
echo "  - pre-commit: проверка trailing whitespaces и newline в конце файлов"
echo ""
echo "Для тестирования:"
echo "  git add <файл> && git commit -m 'test'"

