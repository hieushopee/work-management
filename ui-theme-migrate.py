#!/usr/bin/env python3
"""
UI Theme Migration Script
Chuyển đổi từ dark theme (indigo/gray) sang white theme (orange/white)

Usage:
    python ui-theme-migrate.py [--dry-run] [--path <directory>]
    
Options:
    --dry-run    Chỉ hiển thị preview, không thực sự thay đổi files
    --path       Đường dẫn thư mục (default: frontend/src)
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

# ===== PATTERNS TO REPLACE =====
# Format: (pattern, replacement, description)
REPLACEMENTS = [
    # Background Colors
    (r'\bbg-indigo-600\b', 'bg-primary', 'Primary button/active state background'),
    (r'\bbg-indigo-500\b', 'bg-primary', 'Primary background'),
    (r'\bbg-indigo-100\b', 'bg-primary-light', 'Light primary background'),
    (r'\bbg-indigo-50\b', 'bg-primary-50', 'Lightest primary background'),
    (r'\bhover:bg-indigo-700\b', 'hover:bg-primary-hover', 'Primary hover state'),
    (r'\bhover:bg-indigo-600\b', 'hover:bg-primary-hover', 'Primary hover state'),
    (r'\bactive:bg-indigo-800\b', 'active:bg-primary-active', 'Primary active state'),
    (r'\bactive:bg-indigo-700\b', 'active:bg-primary-active', 'Primary active state'),
    
    # Text Colors
    (r'\btext-indigo-600\b', 'text-primary', 'Primary text color'),
    (r'\btext-indigo-500\b', 'text-primary', 'Primary text color'),
    (r'\btext-indigo-700\b', 'text-primary', 'Primary text color (dark)'),
    (r'\bhover:text-indigo-700\b', 'hover:text-primary-hover', 'Primary text hover'),
    (r'\bhover:text-indigo-600\b', 'hover:text-primary-hover', 'Primary text hover'),
    
    # Gray Backgrounds
    (r'\bbg-gray-900\b', 'bg-text-main', 'Dark background (tooltips, etc)'),
    (r'\bbg-gray-800\b', 'bg-text-main', 'Dark background'),
    (r'\bbg-gray-100\b', 'bg-bg-hover', 'Light gray background'),
    (r'\bbg-gray-50\b', 'bg-bg-secondary', 'Lightest gray background'),
    (r'\bhover:bg-gray-100\b', 'hover:bg-bg-hover', 'Gray hover state'),
    (r'\bhover:bg-gray-50\b', 'hover:bg-bg-secondary', 'Light gray hover'),
    
    # Gray Text
    (r'\btext-gray-900\b', 'text-text-main', 'Primary text (dark gray)'),
    (r'\btext-gray-800\b', 'text-text-main', 'Primary text'),
    (r'\btext-gray-700\b', 'text-text-main', 'Primary text'),
    (r'\btext-gray-600\b', 'text-text-secondary', 'Secondary text'),
    (r'\btext-gray-500\b', 'text-text-secondary', 'Secondary text'),
    (r'\btext-gray-400\b', 'text-text-muted', 'Muted text'),
    (r'\bhover:text-gray-900\b', 'hover:text-text-main', 'Text hover'),
    
    # Borders
    (r'\bborder-gray-300\b', 'border-border-light', 'Light border'),
    (r'\bborder-gray-200\b', 'border-border-light', 'Light border'),
    (r'\bborder-gray-100\b', 'border-border-light', 'Very light border'),
    (r'\bborder-gray-400\b', 'border-border-medium', 'Medium border'),
    
    # Focus States
    (r'\bfocus:ring-indigo-500\b', 'focus:ring-primary', 'Focus ring primary'),
    (r'\bfocus:ring-indigo-600\b', 'focus:ring-primary', 'Focus ring primary'),
    (r'\bfocus:border-indigo-500\b', 'focus:border-primary', 'Focus border primary'),
    (r'\bfocus:border-indigo-600\b', 'focus:border-primary', 'Focus border primary'),
    
    # Shadows (optional - only if not using soft shadows)
    (r'\bshadow-2xl\b', 'shadow-soft-xl', 'Extra large soft shadow'),
    (r'\bshadow-xl\b', 'shadow-soft-lg', 'Large soft shadow'),
    (r'\bshadow-lg\b', 'shadow-soft-md', 'Medium-large soft shadow'),
    (r'\bshadow-md\b', 'shadow-soft', 'Small-medium soft shadow'),
    
    # Ring Colors
    (r'\bring-indigo-500\b', 'ring-primary', 'Ring color primary'),
    (r'\bring-indigo-600\b', 'ring-primary', 'Ring color primary'),
    
    # Gradient backgrounds (if any)
    (r'\bfrom-indigo-50\b', 'from-primary-50', 'Gradient from primary light'),
    (r'\bvia-blue-50\b', 'via-white', 'Gradient via white'),
    (r'\bto-purple-50\b', 'to-white', 'Gradient to white'),
]

# Additional specific patterns for better context
CONTEXTUAL_REPLACEMENTS = [
    # Buttons specifically
    (r"className=['\"]([^'\"]*)\bbg-indigo-600\b([^'\"]*)['\"]", 
     lambda m: f"className=\"{m.group(1)}bg-primary{m.group(2)}\"",
     'Button primary background'),
    
    # Active states in navigation
    (r"isActive\s*\?[^:]*'bg-indigo-600[^']*'",
     lambda m: m.group(0).replace('bg-indigo-600', 'bg-primary'),
     'Active nav state'),
]

def find_jsx_tsx_files(root_path: str) -> List[Path]:
    """Find all .jsx and .tsx files recursively"""
    patterns = ['**/*.jsx', '**/*.tsx', '**/*.js', '**/*.ts']
    files = []
    root = Path(root_path)
    
    for pattern in patterns:
        files.extend(root.glob(pattern))
    
    # Filter out node_modules and dist
    files = [f for f in files if 'node_modules' not in str(f) and 'dist' not in str(f)]
    return files

def apply_replacements(content: str, dry_run: bool = False) -> Tuple[str, int]:
    """Apply all replacements to content"""
    modified_content = content
    changes_count = 0
    changes_log = []
    
    for pattern, replacement, description in REPLACEMENTS:
        matches = re.findall(pattern, modified_content)
        if matches:
            count = len(matches)
            changes_count += count
            if isinstance(replacement, str):
                modified_content = re.sub(pattern, replacement, modified_content)
            changes_log.append(f"  - {description}: {count} replacements")
    
    if changes_log and dry_run:
        print("\n".join(changes_log))
    
    return modified_content, changes_count

def process_file(file_path: Path, dry_run: bool = False) -> Tuple[int, bool]:
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        modified_content, changes_count = apply_replacements(original_content, dry_run)
        
        if changes_count > 0:
            if dry_run:
                print(f"\n📄 {file_path}")
                print(f"   Would make {changes_count} changes")
                return changes_count, False
            else:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                print(f"✅ {file_path} - {changes_count} changes")
                return changes_count, True
        
        return 0, False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return 0, False

def main():
    """Main execution"""
    args = sys.argv[1:]
    dry_run = '--dry-run' in args
    
    # Get path
    root_path = 'frontend/src'
    if '--path' in args:
        idx = args.index('--path')
        if idx + 1 < len(args):
            root_path = args[idx + 1]
    
    if not os.path.exists(root_path):
        print(f"❌ Path does not exist: {root_path}")
        return
    
    print("=" * 60)
    print("🎨 UI Theme Migration Script")
    print("=" * 60)
    print(f"Mode: {'DRY RUN (preview only)' if dry_run else 'LIVE (will modify files)'}")
    print(f"Path: {root_path}")
    print(f"Patterns: {len(REPLACEMENTS)} replacement rules")
    print("=" * 60)
    
    if dry_run:
        print("\n⚠️  DRY RUN MODE - No files will be modified")
        print("Remove --dry-run flag to apply changes\n")
    else:
        print("\n⚠️  LIVE MODE - Files will be modified!")
        response = input("Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Cancelled.")
            return
    
    # Find all files
    files = find_jsx_tsx_files(root_path)
    print(f"\n📁 Found {len(files)} files to process")
    
    # Process files
    total_changes = 0
    files_modified = 0
    
    for file_path in files:
        changes, modified = process_file(file_path, dry_run)
        total_changes += changes
        if modified:
            files_modified += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"Files processed: {len(files)}")
    print(f"Files modified: {files_modified}")
    print(f"Total changes: {total_changes}")
    
    if dry_run:
        print("\n✅ Dry run complete. No files were modified.")
        print("Run without --dry-run to apply changes.")
    else:
        print("\n✅ Migration complete!")
    
    print("=" * 60)

if __name__ == "__main__":
    main()

