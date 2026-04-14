$noBomUtf8 = New-Object System.Text.UTF8Encoding $false
$tmp = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmp, "true", $noBomUtf8)
cmd /c "vercel env add ALLOW_STUB_PROVISION production < `"$tmp`""
Remove-Item $tmp -Force
Write-Host "Done"
