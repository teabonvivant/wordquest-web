# WordQuest R3 local-only STATIC server; Windows PowerShell 5.1.
# Serves app/ only. It does not implement the optional /api/speech endpoint.
# No admin account or installation required. Not executed on Windows in this audit.
param([ValidateRange(1024,65535)][int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../app'))
$prefix = $root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if ((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint) {
 Write-Host 'The app folder must not be a junction or symbolic link.'; exit 1
}
$listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch { Write-Host "Cannot open 127.0.0.1:$Port. Port may already be in use. Nothing was changed."; exit 1 }
$url = "http://127.0.0.1:$Port/app/index.html"
Write-Host "WordQuest R3: $url"
Write-Host 'Keep this window open. Ctrl+C stops the server. Only this computer can connect.'
Write-Host 'For fixed cloud voice use START_WITH_VOICE.cmd instead. Do not run both on the same port.'
Start-Process $url
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.wasm'='application/wasm'; '.gz'='application/gzip'; '.png'='image/png'; '.jpg'='image/jpeg'; '.webp'='image/webp'; '.svg'='image/svg+xml'; '.wav'='audio/wav'; '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'; '.mp4'='audio/mp4'; '.txt'='text/plain; charset=utf-8' }
try {
 while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
   $client.ReceiveTimeout=3000; $client.SendTimeout=10000
   $stream=$client.GetStream(); $buf=New-Object byte[] 16384; $count=0; $end=-1
   while ($count -lt $buf.Length -and $end -lt 0) {
    $n=$stream.Read($buf,$count,$buf.Length-$count); if($n -le 0){break}; $count += $n
    $end=([Text.Encoding]::ASCII.GetString($buf,0,$count)).IndexOf("`r`n`r`n")
   }
   if($end -lt 0){continue}
   $lines=([Text.Encoding]::ASCII.GetString($buf,0,$end)) -split "`r`n"
   $parts=$lines[0].Split(' '); if($parts.Length -ne 3){continue}
   $method=$parts[0]; $status='200 OK'; $type='text/plain; charset=utf-8'; $file=$null
   $hosts=@($lines | Where-Object { $_ -match '^Host:' })
   $hostValue=if($hosts.Count -eq 1){($hosts[0] -replace '^Host:\s*','').Trim()}else{''}
   if($hostValue -ne "127.0.0.1:$Port" -and $hostValue -ne "localhost:$Port"){$status='403 Forbidden'}
   elseif($method -ne 'GET' -and $method -ne 'HEAD'){$status='405 Method Not Allowed'}
   elseif(-not $parts[1].StartsWith('/') -or $parts[1].StartsWith('//')){$status='400 Bad Request'}
   else {
    $rel=[Uri]::UnescapeDataString(($parts[1].Split('?')[0]))
    if($rel -eq '/' -or $rel -eq '/app/' -or $rel -eq '/index.html'){$rel='/app/index.html'}
    if($rel.IndexOf([char]0) -ge 0 -or $rel.Contains(':') -or $rel.Contains('\')){$status='400 Bad Request'}
    elseif(-not $rel.StartsWith('/app/',[StringComparison]::Ordinal)){$status='403 Forbidden'}
    elseif(@($rel.Split('/') | Where-Object { $_.StartsWith('.') }).Count -gt 0){$status='403 Forbidden'}
    else {
     $pathPart=$rel.Substring(5).Replace('/',[IO.Path]::DirectorySeparatorChar)
     $candidate=[IO.Path]::GetFullPath([IO.Path]::Combine($root,$pathPart))
     if(-not $candidate.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){$status='403 Forbidden'}
     elseif(-not [IO.File]::Exists($candidate)){$status='404 Not Found'}
     else {
      # Reject every junction/symlink in the requested path, including the file.
      $safe=$true; $walk=$candidate
      while($walk -and $walk.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){
       if((Get-Item -LiteralPath $walk -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){$safe=$false;break}
       $walk=[IO.Path]::GetDirectoryName($walk)
      }
      if(-not $safe){$status='403 Forbidden'}
      else {$file=$candidate; $ext=[IO.Path]::GetExtension($candidate).ToLowerInvariant(); if($types.ContainsKey($ext)){$type=$types[$ext]}else{$type='application/octet-stream'}}
     }
    }
   }
   if($file){$length=(Get-Item -LiteralPath $file).Length}else{$body=[Text.Encoding]::UTF8.GetBytes($status);$length=$body.Length}
   $header="HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $length`r`nCache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`nX-Frame-Options: DENY`r`nReferrer-Policy: no-referrer`r`nConnection: close`r`n`r`n"
   $h=[Text.Encoding]::ASCII.GetBytes($header);$stream.Write($h,0,$h.Length)
   if($method -ne 'HEAD') {
    if($file){$fs=[IO.File]::OpenRead($file);try{$fs.CopyTo($stream)}finally{$fs.Dispose()}}
    else{$stream.Write($body,0,$body.Length)}
   }
   $stream.Flush()
  } catch { Write-Host ('Request stopped: '+$_.Exception.Message) }
  finally { $client.Dispose() }
 }
} finally { $listener.Stop() }
