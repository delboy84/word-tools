#!/usr/bin/env python3
"""Remove AdSense/gtag code and update footers in all HTML files.
This is precise - it only removes the exact blocks we need gone."""
import re
import os
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Remove the gtag consent + dataLayer script block
    # Pattern: <script>\n  window.dataLayer = ... </script>
    content = re.sub(
        r'<script>\s*\n\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];\s*\n\s*function\s*gtag\(\)\{dataLayer\.push\(arguments\);\}\s*\n\s*\n\s*gtag\(\'consent\',\s*\'default\',\s*\{[^}]+\}\s*\);?\s*\n*</script>',
        '<script>',
        content,
        flags=re.DOTALL
    )
    
    # 2. Remove the AdSense script tag
    content = re.sub(
        r'\s*<script\s+async\s+src="https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=ca-pub-[^"]+"\s*\n\s*crossorigin="anonymous"></script>\s*\n',
        '\n',
        content
    )
    
    # 3. Remove any remaining adsbygoogle push blocks
    content = re.sub(
        r'\s*<ins\s+class="adsbygoogle"[^>]*></ins>\s*\n?',
        '',
        content
    )
    content = re.sub(
        r'\s*\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{\}\);\s*\n?',
        '',
        content
    )
    
    # 4. Remove gtag consent update blocks (in cookie banners)
    content = re.sub(
        r"@click=\"gtag\('consent',\s*'update',\s*\{[^}]+\}\);\s*",
        '@click="',
        content
    )
    
    # 5. Remove the gtag consent init JavaScript at the bottom
    content = re.sub(
        r'\s*<script>\s*\n\s*\(function\(\)\s*\{\s*\n\s*const\s+consent\s*=\s*localStorage\.getItem\(\'cookieConsent\'\);\s*\n\s*if\s*\(consent\s*===\s*\'accepted\'\)\s*\{\s*\n\s*gtag\(\'consent\',\s*\'update\',\s*\{[^}]+\}\s*\);\s*\n\s*\}\s*\n\s*\}\)\(\);\s*\n\s*</script>\s*\n',
        '\n',
        content,
        flags=re.DOTALL
    )
    
    # 6. Update footers - old style (about.html and some pages)
    old_footer_about = 'Works offline · Built with ♥ · <a href="about.html" class="text-blue-600 dark:text-cyan-400 hover:underline">About</a>'
    new_footer = 'Works offline · Built with ♥ · <a href="about.html" class="text-blue-600 dark:text-cyan-400 hover:underline">About</a> · <a href="privacy-policy.html" class="text-blue-600 dark:text-cyan-400 hover:underline">Privacy</a> · <a href="terms-of-service.html" class="text-blue-600 dark:text-cyan-400 hover:underline">Terms</a> · <a href="contact.html" class="text-blue-600 dark:text-cyan-400 hover:underline">Contact</a>'
    content = content.replace(old_footer_about, new_footer)
    
    # 7. Update cookie banner text (remove AdSense reference)
    content = content.replace(
        'We use Google AdSense which may set cookies for personalised ads.',
        'This site may use cookies for analytics.'
    )
    
    # 8. Remove the gtag call from the Accept button
    content = re.sub(
        r"@click=\"gtag\('consent',\s*'update',\s*\{[^}]+\}\);\s*localStorage\.setItem\('cookieConsent',\s*'accepted'\);\s*showBanner\s*=\s*false\"",
        '@click="localStorage.setItem(\'cookieConsent\', \'accepted\'); showBanner = false"',
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Process all HTML files
changed = []
for f in glob.glob('*.html'):
    if process_file(f):
        changed.append(f)
        print(f'Updated: {f}')
    else:
        print(f'No changes: {f}')

print(f'\nTotal changed: {len(changed)} files')