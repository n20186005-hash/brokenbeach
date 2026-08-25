$path = Resolve-Path "public\index.html"
$htmlRaw = [System.IO.File]::ReadAllBytes($path)
$html = [System.Text.Encoding]::ASCII.GetString($htmlRaw)

# Extract manus-runtime content
$scrStart = $html.IndexOf('<script id="manus-runtime">')
if ($scrStart -eq -1) { $scrStart = $html.IndexOf('id="manus-runtime"') }
$realStart = $html.IndexOf('>', $scrStart) + 1
$scrEnd = $html.IndexOf('</script>', $realStart)
$js = $html.Substring($realStart, $scrEnd - $realStart)

Write-Host "Manus-runtime length (chars): $($js.Length)"
$jsBytes = [System.Text.Encoding]::ASCII.GetBytes($js)

# === State machine scan for quote balance ===
$inSingle = $false       # inside '...'
$inDouble = $false       # inside "..."
$inTemplate = $false     # inside `...` (we don't have backticks but just in case)
$inLineComment = $false  # inside // ...
$inBlockComment = $false # inside /* ... */
$escape = $false         # last char was \ inside string
$inRegex = $false        # inside /.../ regex

$totalDQ = 0
$totalSQ = 0
$totalBT = 0

$lastBadPos = -1
$stateStack = @()

for ($i = 0; $i -lt $jsBytes.Length; $i++) {
    $b = $jsBytes[$i]
    $c = [char]$b

    if ($inLineComment) {
        if ($c -eq "`n") { $inLineComment = $false }
        continue
    }
    if ($inBlockComment) {
        if ($c -eq '*' -and ($i+1 -lt $jsBytes.Length) -and ([char]$jsBytes[$i+1] -eq '/')) {
            $inBlockComment = $false
            $i++  # skip the /
        }
        continue
    }

    if ($escape) {
        $escape = $false
        continue
    }

    if ($inDouble -or $inSingle -or $inTemplate) {
        if ($c -eq '\') { $escape = $true; continue }
        if ($inDouble -and $c -eq '"') { $inDouble = $false; continue }
        if ($inSingle -and $c -eq "'") { $inSingle = $false; continue }
        if ($inTemplate -and $c -eq '`') { $inTemplate = $false; continue }
        continue
    }

    # Outside all strings/comments
    if ($c -eq '/') {
        if ($i+1 -lt $jsBytes.Length) {
            $n = [char]$jsBytes[$i+1]
            if ($n -eq '/') { $inLineComment = $true; $i++; continue }
            if ($n -eq '*') { $inBlockComment = $true; $i++; continue }
        }
    }
    if ($c -eq '"') {
        $inDouble = $true
        $totalDQ++
        $stateStack += @("DQ open @ $i")
        continue
    }
    if ($c -eq "'") {
        $inSingle = $true
        $totalSQ++
        $stateStack += @("SQ open @ $i")
        continue
    }
    if ($c -eq '`') {
        $inTemplate = $true
        $totalBT++
        continue
    }
}

Write-Host ""
Write-Host "=== Final string/comment state ==="
Write-Host "inDouble=$inDouble, inSingle=$inSingle, inTemplate=$inTemplate"
Write-Host "inLineComment=$inLineComment, inBlockComment=$inBlockComment, escape=$escape, inRegex=$inRegex"
Write-Host "Total DQ: $totalDQ (even=$($totalDQ%2-eq0)), SQ: $totalSQ (even=$($totalSQ%2-eq0)), BT: $totalBT (even=$($totalBT%2-eq0))"
Write-Host ""
Write-Host "=== Stack of unclosed strings ==="
if ($stateStack.Count % 2 -ne 0) {
    $last = $stateStack[$stateStack.Count-1]
    Write-Host "  ODD NUMBER OF STRING OPENS! Last open: $last"
    # Show context around last open
    $m = [regex]::Match($last, '@\s*(\d+)')
    if ($m.Success) {
        $pos = [int]$m.Groups[1].Value
        $ctxStart = [Math]::Max(0, $pos-40)
        $ctxLen = [Math]::Min(120, $jsBytes.Length - $ctxStart)
        $ctx = [System.Text.Encoding]::ASCII.GetString($jsBytes, $ctxStart, $ctxLen)
        Write-Host "  Context around last unclosed string open [$pos]:"
        Write-Host "    $ctx"
    }
}
Write-Host ""

# Also: find all DQ positions, locate the EARLIEST position where cumulative count goes odd at file end
# simpler: check cumulative from end to find where balance breaks
$cumDQ = 0
$lastImbalanceAt = -1
for ($i = $jsBytes.Length-1; $i -ge 0; $i--) {
    $c = [char]$jsBytes[$i]
    if ($c -eq '"' -and ($i -eq 0 -or [char]$jsBytes[$i-1] -ne '\')) { $cumDQ++ }
}
Write-Host "Brute DQ count (no state machine): $cumDQ (at end, parity=$($cumDQ%2))"

# Better: check at which specific byte the SM leaves inDouble=true without ever closing
# Rerun simpler SM and record positions where DQ opens but fails to close before a newline / suspicious point
# Actually, simplest: find the last unmatched DQ open
# Run again, tracking open positions:
[System.Collections.ArrayList]$openDQ = @()
$inD = $false; $inS = $false; $inLc = $false; $inBc = $false; $esc = $false;
for ($i=0; $i -lt $jsBytes.Length; $i++) {
    $c = [char]$jsBytes[$i]
    if ($inLc) { if ($c -eq "`n") {$inLc=$false}; continue }
    if ($inBc) { if ($c -eq '*' -and $i+1 -lt $jsBytes.Length -and [char]$jsBytes[$i+1] -eq '/') {$inBc=$false; $i++}; continue }
    if ($esc) { $esc=$false; continue }
    if ($inD) {
        if ($c -eq '\') { $esc=$true; continue }
        if ($c -eq '"') {
            $null = $openDQ.RemoveAt($openDQ.Count-1)
            $inD = $false
            continue
        }
        continue
    }
    if ($inS) {
        if ($c -eq '\') { $esc=$true; continue }
        if ($c -eq "'") { $inS = $false; continue }
        continue
    }
    if ($c -eq '/') {
        if ($i+1 -lt $jsBytes.Length) {
            $n = [char]$jsBytes[$i+1]
            if ($n -eq '/') { $inLc = $true; $i++; continue }
            if ($n -eq '*') { $inBc = $true; $i++; continue }
        }
    }
    if ($c -eq '"') { $null = $openDQ.Add($i); $inD = $true }
    elseif ($c -eq "'") { $inS = $true }
}

Write-Host ""
Write-Host "=== SM2: Unclosed DQ open positions (count=$($openDQ.Count)) ==="
if ($openDQ.Count -gt 0) {
    for ($k=0; $k -lt $openDQ.Count; $k++) {
        $pos = [int]$openDQ[$k]
        $ctxStart = [Math]::Max(0, $pos-30)
        $ctxLen = [Math]::Min(90, $jsBytes.Length - $ctxStart)
        $ctx = [System.Text.Encoding]::ASCII.GetString($jsBytes, $ctxStart, $ctxLen)
        Write-Host "  Unclosed DQ #$k at js_byte[$pos]: ...$ctx..."
    }
}
