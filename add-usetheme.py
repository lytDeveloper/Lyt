#!/usr/bin/env python3
import sys
import re

def add_usetheme(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add useTheme to @mui/material imports if not already there
    if 'useTheme' not in content:
        # Find the @mui/material import block
        mui_import_pattern = r'(} from [\'"]@mui/material[\'"];)'
        replacement = r', useTheme \1'
        content = re.sub(mui_import_pattern, replacement, content)

        # Add const theme = useTheme(); after function declaration
        # Pattern: export default function ComponentName({ ... }: Props) {
        function_pattern = r'(}: \w+Props\) \{)\n'
        theme_hook = r'\1\n  const theme = useTheme();\n'
        content = re.sub(function_pattern, theme_hook, content, count=1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Added useTheme to: {filepath}")

if __name__ == '__main__':
    for filepath in sys.argv[1:]:
        add_usetheme(filepath)
