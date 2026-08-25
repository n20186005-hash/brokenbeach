$html = [System.IO.File]::ReadAllText((Resolve-Path "public\index.html"), [System.Text.Encoding]::ASCII)

$ss = $html.IndexOf('<script id="manus-runtime">')
$realStart = $html.IndexOf('>', $ss) + 1
$se = $html.IndexOf('</script>', $realStart)
$manus = $html.Substring($realStart, $se - $realStart)
$mlen = $manus.Length

# Check the 3 createElement("script") calls with full context
$offsets = @(169827, 170147, 172950)
foreach ($off in $offsets) {
    $st = [Math]::Max(0, $off - 300)
    $ln = [Math]::Min(800, $mlen - $st)
    Write-Host "======== createElement script @ offset $off ========"
    Write-Host $manus.Substring($st, $ln)
    Write-Host ""
    Write-Host ""
}
