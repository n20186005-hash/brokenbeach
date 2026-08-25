$jsPath = Resolve-Path "public\assets\index-bkD-tkRG.js"
$js = [System.IO.File]::ReadAllText($jsPath)
$jsLen = $js.Length

Write-Host "=== createRoot occurrences ==="
$idx = 0
$count = 0
while ($count -lt 15) {
    $i = $js.IndexOf('createRoot', $idx)
    if ($i -lt 0) { break }
    $start = [Math]::Max(0, $i-80)
    $len = [Math]::Min(200, $jsLen - $start)
    $ctx = $js.Substring($start, $len)
    Write-Host ("  createRoot[{0}]: ...{1}..." -f $i, $ctx)
    Write-Host ""
    $idx = $i + 10
    $count++
}

Write-Host "=== jsxDEV occurrences (first 10) ==="
$idx = 0
$count = 0
while ($count -lt 10) {
    $i = $js.IndexOf('jsxDEV', $idx)
    if ($i -lt 0) { break }
    $start = [Math]::Max(0, $i-80)
    $len = [Math]::Min(160, $jsLen - $start)
    Write-Host ("  jsxDEV[{0}]: ...{1}..." -f $i, $js.Substring($start,$len))
    $idx = $i + 6
    $count++
}

Write-Host ""
Write-Host "=== getElementById calls ==="
$pattern = 'getElementById\([^)]{0,30}\)'
$ms = [regex]::Matches($js, $pattern)
Write-Host "Found $($ms.Count) matches"
foreach ($m in $ms) {
    $i2 = $m.Index
    $st = [Math]::Max(0, $i2-100)
    $ln = [Math]::Min(240, $jsLen - $st)
    Write-Host ("  @{0}: ...{1}..." -f $i2, $js.Substring($st, $ln))
}
