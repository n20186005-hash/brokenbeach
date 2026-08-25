$html = [System.IO.File]::ReadAllText((Resolve-Path "public\index.html"), [System.Text.Encoding]::ASCII)

# Extract manus-runtime
$ss = $html.IndexOf('<script id="manus-runtime">')
$realStart = $html.IndexOf('>', $ss) + 1
$se = $html.IndexOf('</script>', $realStart)
$manus = $html.Substring($realStart, $se - $realStart)
$mlen = $manus.Length
Write-Host "Manus-runtime length: $mlen"

Write-Host ""
Write-Host "=== import( calls in manus-runtime ==="
$m1 = [regex]::Matches($manus, 'import\s*\(')
Write-Host "Count: $($m1.Count)"
foreach ($m in $m1) {
    $i = $m.Index
    $st = [Math]::Max(0, $i-100)
    $ln = [Math]::Min(300, $mlen-$st)
    Write-Host "import( @ $i :"
    Write-Host "  ...$($manus.Substring($st,$ln))..."
    Write-Host ""
}

Write-Host "=== __vite_plugin_react_preamble or @vite patterns in manus-runtime ==="
$keywords = @('__vite_plugin_react_preamble_installed__','__vite','@vite','/@vite','%40vite','createElement("script"','appendChild.*src.*vite')
foreach ($kw in $keywords) {
    $m = [regex]::Matches($manus, [regex]::Escape($kw))
    Write-Host "Pattern '$kw': count=$($m.Count)"
    if ($m.Count -gt 0) {
        for ($k=0; $k -lt [Math]::Min(5,$m.Count); $k++) {
            $i = $m[$k].Index
            $st=[Math]::Max(0,$i-80)
            $ln=[Math]::Min(200,$mlen-$st)
            Write-Host "  @$i : ...$($manus.Substring($st,$ln))..."
        }
        Write-Host ""
    }
}

Write-Host "=== jsxDEV function definition in manus-runtime (first 500 context) ==="
$jd = $manus.IndexOf('jsxDEV')
if ($jd -gt 0) {
    $st = [Math]::Max(0, $jd - 200)
    $ln = [Math]::Min(600, $mlen - $st)
    Write-Host $manus.Substring($st, $ln)
}
