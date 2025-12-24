# PowerShell script to batch update UI theme colors
# Run this in PowerShell: .\batch-theme-update.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "UI Theme Migration - Batch Update" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = "frontend\src"
$patterns = @(
    # Indigo -> Primary (Orange)
    @{Old='bg-indigo-600'; New='bg-primary'; Desc='Primary background'},
    @{Old='bg-indigo-500'; New='bg-primary'; Desc='Primary background'},
    @{Old='bg-indigo-100'; New='bg-primary-light'; Desc='Light primary background'},
    @{Old='bg-indigo-50'; New='bg-primary-50'; Desc='Lightest primary background'},
    @{Old='text-indigo-600'; New='text-primary'; Desc='Primary text'},
    @{Old='text-indigo-500'; New='text-primary'; Desc='Primary text'},
    @{Old='hover:bg-indigo-700'; New='hover:bg-primary-hover'; Desc='Hover state'},
    @{Old='hover:bg-indigo-600'; New='hover:bg-primary-hover'; Desc='Hover state'},
    @{Old='hover:text-indigo-700'; New='hover:text-primary-hover'; Desc='Text hover'},
    @{Old='hover:text-indigo-600'; New='hover:text-primary-hover'; Desc='Text hover'},
    @{Old='active:bg-indigo-800'; New='active:bg-primary-active'; Desc='Active state'},
    @{Old='active:bg-indigo-700'; New='active:bg-primary-active'; Desc='Active state'},
    @{Old='focus:ring-indigo-500'; New='focus:ring-primary'; Desc='Focus ring'},
    @{Old='focus:ring-indigo-600'; New='focus:ring-primary'; Desc='Focus ring'},
    @{Old='focus:ring-indigo-200'; New='focus:ring-primary'; Desc='Focus ring light'},
    @{Old='focus:ring-indigo-100'; New='focus:ring-primary'; Desc='Focus ring lightest'},
    @{Old='ring-indigo-100'; New='ring-primary-100'; Desc='Ring indigo 100'},
    @{Old='focus:border-indigo-500'; New='focus:border-primary'; Desc='Focus border'},
    @{Old='ring-indigo-500'; New='ring-primary'; Desc='Ring color'},
    @{Old='from-indigo-50'; New='from-white'; Desc='Gradient from'},
    @{Old='bg-indigo-50'; New='bg-primary-50'; Desc='Indigo 50'},
    @{Old='text-indigo-700'; New='text-primary'; Desc='Indigo text 700'},
    @{Old='text-indigo-800'; New='text-primary'; Desc='Indigo text 800'},
    @{Old='text-indigo-900'; New='text-primary'; Desc='Indigo text 900'},
    @{Old='border-indigo-200'; New='border-primary-200'; Desc='Indigo border 200'},
    @{Old='border-indigo-300'; New='border-primary-300'; Desc='Indigo border 300'},
    @{Old='hover:text-indigo-800'; New='hover:text-primary-hover'; Desc='Hover indigo 800'},
    @{Old='hover:border-indigo-200'; New='hover:border-primary-200'; Desc='Hover border indigo'},
    
    # Gray backgrounds
    @{Old='bg-gray-900'; New='bg-text-main'; Desc='Dark backgrounds'},
    @{Old='bg-gray-800'; New='bg-text-main'; Desc='Dark backgrounds'},
    @{Old='bg-gray-100'; New='bg-bg-hover'; Desc='Light backgrounds'},
    @{Old='bg-gray-50'; New='bg-bg-secondary'; Desc='Secondary backgrounds'},
    @{Old='hover:bg-gray-100'; New='hover:bg-bg-hover'; Desc='Hover backgrounds'},
    @{Old='hover:bg-gray-50'; New='hover:bg-bg-secondary'; Desc='Hover backgrounds'},
    
    # Gray text
    @{Old='text-gray-900'; New='text-text-main'; Desc='Primary text'},
    @{Old='text-gray-800'; New='text-text-main'; Desc='Primary text'},
    @{Old='text-gray-700'; New='text-text-main'; Desc='Primary text'},
    @{Old='text-gray-600'; New='text-text-secondary'; Desc='Secondary text'},
    @{Old='text-gray-500'; New='text-text-secondary'; Desc='Secondary text'},
    @{Old='text-gray-400'; New='text-text-muted'; Desc='Muted text'},
    @{Old='hover:text-gray-900'; New='hover:text-text-main'; Desc='Text hover'},
    
    # Borders
    @{Old='border-gray-300'; New='border-border-light'; Desc='Light borders'},
    @{Old='border-gray-200'; New='border-border-light'; Desc='Light borders'},
    @{Old='border-gray-100'; New='border-border-light'; Desc='Very light borders'},
    @{Old='border-gray-400'; New='border-border-medium'; Desc='Medium borders'},
    
    # Gradients
    @{Old='via-blue-50'; New='via-white'; Desc='Gradient via'},
    @{Old='to-purple-50'; New='to-white'; Desc='Gradient to'}
)

# Find all JSX/TSX files
$files = Get-ChildItem -Path $rootPath -Include *.jsx,*.tsx -Recurse | Where-Object { 
    $_.FullName -notmatch 'node_modules' -and $_.FullName -notmatch 'dist' 
}

Write-Host "Found $($files.Count) files to process" -ForegroundColor Yellow
Write-Host ""

$totalChanges = 0
$filesModified = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileChanges = 0
    
    foreach ($pattern in $patterns) {
        # Use word boundary regex for accurate matching
        $regex = '\b' + [regex]::Escape($pattern.Old) + '\b'
        $matches = [regex]::Matches($content, $regex)
        if ($matches.Count -gt 0) {
            $content = $content -replace $regex, $pattern.New
            $fileChanges += $matches.Count
        }
    }
    
    if ($fileChanges -gt 0) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesModified++
        $totalChanges += $fileChanges
        $relativePath = $file.FullName.Replace($PWD.Path + "\", "")
        Write-Host "✓ $relativePath" -ForegroundColor Green -NoNewline
        Write-Host " - $fileChanges changes" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Files processed: $($files.Count)" -ForegroundColor White
Write-Host "Files modified: $filesModified" -ForegroundColor Green
Write-Host "Total changes: $totalChanges" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ Migration complete!" -ForegroundColor Green

