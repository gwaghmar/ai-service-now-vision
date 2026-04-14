$auth = Get-Content "$env:APPDATA\com.vercel.cli\Data\auth.json" | ConvertFrom-Json
$token = $auth.token
$headers = @{ Authorization = "Bearer $token" }

# Trigger sign-in
try { 
  Invoke-RestMethod -Method POST -Uri "https://ai-service-now-vision.vercel.app/api/auth/sign-in/email" -ContentType "application/json" -Body '{"email":"govind@admin.com","password":"Govind@123"}' 
} catch {}

Start-Sleep -Seconds 4

# Get runtime logs from last 30s
$since = [DateTimeOffset]::UtcNow.AddSeconds(-30).ToUnixTimeMilliseconds()
$logs = Invoke-RestMethod -Uri "https://api.vercel.com/v2/deployments/dpl_EHeyvHx487BmKc8tkdbHwckBgcVV/events?limit=100&since=$since" -Headers $headers
$logs | ForEach-Object { $_.payload.text } | Where-Object { $_ }
