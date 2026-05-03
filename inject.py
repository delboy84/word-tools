#!/usr/bin/env python3
"""Inject editorial content sections into tool pages before the cookie consent banner."""
import sys, re

def inject(file_path, content_html):
    with open(file_path, 'r') as f:
        html = f.read()
    
    # Find insertion point: before Cookie Consent Banner comment, or before footer div
    marker = '<!-- Cookie Consent Banner -->'
    if marker in html:
        idx = html.index(marker)
    else:
        # Fallback: before the footer div pattern
        match = re.search(r'<div class="text-center text-xs text-gray-400 dark:text-gray-600 mt-[68]">', html)
        if match:
            idx = match.start()
        else:
            print(f"ERROR: No insertion point found in {file_path}", file=sys.stderr)
            sys.exit(1)
    
    new_html = html[:idx] + '\n\n' + content_html + '\n\n' + html[idx:]
    with open(file_path, 'w') as f:
        f.write(new_html)
    print(f"OK: {file_path}")

if __name__ == '__main__':
    file_path = sys.argv[1]
    content_file = sys.argv[2]
    with open(content_file, 'r') as f:
        content = f.read()
    inject(file_path, content)