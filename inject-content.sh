#!/bin/bash
# Inject editorial content sections into tool pages before the footer
# Usage: bash inject-content.sh <file> "<how-to-HTML>" "<use-cases-HTML>" "<faq-HTML>" "<why-use-HTML>"
# Or just: bash inject-content.sh <file> "<all-content-HTML>"
# The content is inserted before the <!-- Cookie Consent Banner --> or the footer div

FILE="$1"
CONTENT="$2"

# Find the insertion point: before Cookie Consent Banner or before footer
if grep -q '<!-- Cookie Consent Banner -->' "$FILE"; then
    # Insert before cookie consent banner
    python3 -c "
import sys
f = sys.argv[1]
content = sys.argv[2]
with open(f, 'r') as fh:
    html = fh.read()
marker = '<!-- Cookie Consent Banner -->'
idx = html.find(marker)
if idx == -1:
    print('ERROR: Cookie banner not found', file=sys.stderr)
    sys.exit(1)
new_html = html[:idx] + '\n\n' + content + '\n\n' + html[idx:]
with open(f, 'w') as fh:
    fh.write(new_html)
print(f'Inserted content before cookie banner in {f}')
" "$FILE" "$CONTENT"
elif grep -q 'class="text-center text-xs text-gray-400 dark:text-gray-600 mt-' "$FILE"; then
    # Insert before the footer div
    python3 -c "
import sys, re
f = sys.argv[1]
content = sys.argv[2]
with open(f, 'r') as fh:
    html = fh.read()
# Find footer pattern
pattern = r'(<div class=\"text-center text-xs text-gray-400 dark:text-gray-600 mt-[68]\">)'
match = re.search(pattern, html)
if not match:
    print('ERROR: Footer not found', file=sys.stderr)
    sys.exit(1)
idx = match.start()
new_html = html[:idx] + '\n\n' + content + '\n\n' + html[idx:]
with open(f, 'w') as fh:
    fh.write(new_html)
print(f'Inserted content before footer in {f}')
" "$FILE" "$CONTENT"
else
    echo "ERROR: Could not find insertion point in $FILE"
    exit 1
fi