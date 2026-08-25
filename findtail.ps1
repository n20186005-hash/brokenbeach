$path = Resolve-Path "public\index.html"
$html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::ASCII)

$scrStart = $html.IndexOf('id="manus-runtime"')
$realStart = $html.IndexOf('>', $scrStart) + 1
$scrEnd = $html.IndexOf('</script>', $realStart)
$js = $html.Substring($realStart, $scrEnd - $realStart)
$jsBytes = [System.Text.Encoding]::ASCII.GetBytes($js)
$totalLen = $jsBytes.Length
Write-Host "Total JS length: $totalLen"

Write-Host ""
Write-Host "=== js[331370] - js[331500] around OPEN #158 @ 331390 ==="
$s = 331370; $e = [Math]::Min($totalLen, 331500)
$txt = [System.Text.Encoding]::ASCII.GetString($jsBytes, $s, ($e-$s))
Write-Host $txt

Write-Host ""
Write-Host "=== LAST 600 BYTES OF JS [331390..end] — should contain CLOSE for #158 ==="
$from = 331390
$len = $totalLen - $from
Write-Host "Total tail length: $len bytes"
$tail = [System.Text.Encoding]::ASCII.GetString($jsBytes, $from, [Math]::Min(1200, $len))
Write-Host $tail
Write-Host ""
Write-Host "=== Last 200 bytes (hex + ascii) ==="
$tailStart = $totalLen - 200
for ($offset=$tailStart; $offset -lt $totalLen; $offset += 50) {
    $l = [Math]::Min(50, $totalLen - $offset)
    $hex = ($jsBytes[$offset..($offset+$l-1)] | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
    $txt = [System.Text.Encoding]::ASCII.GetString($jsBytes, $offset, $l)
    Write-Host ("{0,7}: {1}`n         => {2}" -f $offset, $hex, $txt)
}
