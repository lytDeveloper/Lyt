#!/bin/bash

# Batch migration script for COLORS to theme.palette
# Usage: bash migrate-colors.sh <file1> <file2> ...

for file in "$@"; do
  if [ ! -f "$file" ]; then
    echo "Skipping non-existent file: $file"
    continue
  fi

  echo "Migrating: $file"

  # 1. Remove COLORS import line
  sed -i "/import.*COLORS.*from.*common\.styles/d" "$file"

  # 2. Add useTheme to @mui/material imports (if not already present)
  if ! grep -q "useTheme" "$file"; then
    # Add useTheme to existing @mui/material import
    sed -i "s/} from '@mui\/material';/, useTheme } from '@mui\/material';/" "$file"
  fi

  # 3. Add const theme = useTheme(); after component declaration
  # Find the line with "export default function" or "const ComponentName = "
  # and add theme hook on next line if not present
  if ! grep -q "const theme = useTheme();" "$file"; then
    # This is complex in sed, so we'll do it in a second pass if needed
    echo "  - Note: May need manual theme hook addition"
  fi

  # 4. Replace COLORS.TEXT_PRIMARY
  sed -i 's/COLORS\.TEXT_PRIMARY/theme.palette.text.primary/g' "$file"

  # 5. Replace COLORS.TEXT_SECONDARY
  sed -i 's/COLORS\.TEXT_SECONDARY/theme.palette.text.secondary/g' "$file"

  # 6. Replace COLORS.CTA_BLUE
  sed -i 's/COLORS\.CTA_BLUE/theme.palette.primary.main/g' "$file"

  # 7. Common hard-coded color replacements
  sed -i "s/backgroundColor: '#fff'/backgroundColor: theme.palette.background.paper/g" "$file"
  sed -i "s/backgroundColor: '#FFFFFF'/backgroundColor: theme.palette.background.paper/g" "$file"
  sed -i "s/backgroundColor: '#F3F4F6'/backgroundColor: theme.palette.grey[100]/g" "$file"
  sed -i "s/color: '#000'/color: theme.palette.text.primary/g" "$file"
  sed -i "s/color: '#6B7280'/color: theme.palette.text.secondary/g" "$file"
  sed -i "s/color: '#9CA3AF'/color: theme.palette.text.secondary/g" "$file"
  sed -i "s/border: '1px solid #E5E7EB'/border: \`1px solid \${theme.palette.divider}\`/g" "$file"

  echo "  ✓ Completed"
done

echo "Migration complete! Please review changes and add theme hooks manually where needed."
