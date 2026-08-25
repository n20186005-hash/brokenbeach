$path = Resolve-Path "public\index.html"
$html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::ASCII)

# Extract manus-runtime
$scrStart = $html.IndexOf('id="manus-runtime"')
$realStart = $html.IndexOf('>', $scrStart) + 1
$scrEnd = $html.IndexOf('</script>', $realStart)
$js = $html.Substring($realStart, $scrEnd - $realStart)
$jsBytes = [System.Text.Encoding]::ASCII.GetBytes($js)

Write-Host "=== === Find all backtick positions, show context around 317200-317380 ==="
$start = 317200
$len = 200
$ctx = [System.Text.Encoding]::ASCII.GetString($jsBytes, $start, $len)
Write-Host "Context around js_bytes[317200-317400]:"
Write-Host $ctx
Write-Host ""

# === Detailed state machine, log EVERY backtick state change ===
$inD = $false; $inS = $false; $inT = $false; $inLc = $false; $inBc = $false; $esc = $false;
[System.Collections.ArrayList]$btLog = @()  # each entry = @(pos, transition: open->close or close->open)
[System.Collections.ArrayList]$sqLog = @()
for ($i=0; $i -lt $jsBytes.Length; $i++) {
    $c = [char]$jsBytes[$i]
    if ($inLc) { if ($c -eq "`n") {$inLc=$false}; continue }
    if ($inBc) { if ($c -eq '*' -and $i+1 -lt $jsBytes.Length -and [char]$jsBytes[$i+1] -eq '/') {$inBc=$false; $i++}; continue }
    if ($esc) { $esc=$false; continue }

    if ($inD) {
        if ($c -eq '\') { $esc=$true; continue }
        if ($c -eq '"') { $inD = $false }
        # Note: if inside DQ and see backtick, it's just a char, no state change
        continue
    }
    if ($inS) {
        if ($c -eq '\') { $esc=$true; continue }
        if ($c -eq "'") { $inS = $false ; $sqLog += @($i) }
        continue
    }
    if ($inT) {
        if ($c -eq '\') { $esc=$true; continue }
        if ($c -eq '`') { $inT = $false ; $btLog += @($i) }
        continue
    }
    # Outside
    if ($c -eq '/') {
        if ($i+1 -lt $jsBytes.Length) {
            $n = [char]$jsBytes[$i+1]
            if ($n -eq '/') { $inLc = $true; $i++; continue }
            if ($n -eq '*') { $inBc = $true; $i++; continue }
        }
    }
    if ($c -eq '"') { $inD = $true }
    elseif ($c -eq "'") { $inS = $true; $sqLog += @($i) }
    elseif ($c -eq '`') { $inT = $true; $btLog += @($i) }
}

Write-Host "=== Backtick state changes (open/close): count=$($btLog.Count) ==="
Write-Host "  Last 10 backtick state changes:"
for ($k = [Math]::Max(0,$btLog.Count-10); $k -lt $btLog.Count; $k++) {
    $pos = [int]$btLog[$k]
    $isOpen = ($k % 2 -eq 0)
    $ctxStart = [Math]::Max(0, $pos-20)
    $ctxLen = [Math]::Min(60, $jsBytes.Length - $ctxStart)
    $ctx = [System.Text.Encoding]::ASCII.GetString($jsBytes, $ctxStart, $ctxLen)
    Write-Host "    #$k $(if ($isOpen) {'OPEN '} else {'CLOSE'}) @ js[$pos]: ...$ctx..."
}
Write-Host ""
Write-Host "  Final inTemplate after full parse: $inT"
Write-Host ""
Write-Host "=== Single-quote state changes: count=$($sqLog.Count) ==="
Write-Host "  Last 10 single-quote state changes:"
for ($k = [Math]::Max(0,$sqLog.Count-10); $k -lt $sqLog.Count; $k++) {
    $pos = [int]$sqLog[$k]
    $isOpen = ($k % 2 -eq 0)
    $ctxStart = [Math]::Max(0, $pos-20)
    $ctxLen = [Math]::Min(60, $jsBytes.Length - $ctxStart)
    $ctx = [System.Text.Encoding]::ASCII.GetString($jsBytes, $ctxStart, $ctxLen)
    Write-Host "    #$k $(if ($isOpen) {'OPEN '} else {'CLOSE'}) @ js[$pos]: ...$ctx..."
}
