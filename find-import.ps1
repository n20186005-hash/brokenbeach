$js = [System.IO.File]::ReadAllText((Resolve-Path "public\assets\index-bkD-tkRG.js"))
$jsLen = $js.Length

Write-Host "=== All 4 import() calls ==="
$pattern = 'import\s*\('
$ms = [regex]::Matches($js, $pattern)
Write-Host "Count: $($ms.Count)"
foreach ($m in $ms) {
    $i = $m.Index
    $st = [Math]::Max(0, $i-150)
    $ln = [Math]::Min(400, $jsLen - $st)
    Write-Host ""
    Write-Host "import( at [$i]:"
    Write-Host "  ...$($js.Substring($st, $ln))..."
}

Write-Host ""
Write-Host "=== All @vite matches (13) ==="
$pat2 = '@vite'
$idx = 0
$count = 0
while ($count -lt 15) {
    $i = $js.IndexOf($pat2, $idx)
    if ($i -lt 0) { break }
    $st = [Math]::Max(0, $i-80)
    $ln = [Math]::Min(180, $jsLen-$st)
    Write-Host ""
    Write-Host "@vite [$i]:"
    Write-Host "  ...$($js.Substring($st,$ln))..."
    $idx = $i + 5
    $count++
}
