# Optional local-only static server. No Python/Node installation or admin account.
# Windows PowerShell 5.1 compatible. Not executed on Windows in this audit.
param([ValidateRange(1024,65535)][int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$prefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch { Write-Host "Cannot open 127.0.0.1:$Port. Another process may be using this port. Nothing was changed."; exit 1 }
$url = "http://127.0.0.1:$Port/app/index.html"
Write-Host "WordQuest R1: $url"
Write-Host 'Keep this window open. Press Ctrl+C to stop. Only this computer can connect.'
Start-Process $url
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.webp'='image/webp'; '.svg'='image/svg+xml'; '.md'='text/plain; charset=utf-8'; '.txt'='text/plain; charset=utf-8' }
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
   $line=([Text.Encoding]::ASCII.GetString($buf,0,$end)).Split("`r`n")[0]
   $parts=$line.Split(' '); if($parts.Length -ne 3){continue}
   $method=$parts[0];$status='200 OK';$type='text/plain; charset=utf-8';$file=$null
   if($method -ne 'GET' -and $method -ne 'HEAD'){$status='405 Method Not Allowed'}
   else {
    $rel=[Uri]::UnescapeDataString(($parts[1].Split('?')[0])).TrimStart('/')
    if($rel -eq ''){$rel='START_HERE.html'}
    if($rel.IndexOf([char]0) -ge 0 -or $rel.Contains(':')){$status='400 Bad Request'}
    else {
     $candidate=[IO.Path]::GetFullPath([IO.Path]::Combine($root,$rel.Replace('/',[IO.Path]::DirectorySeparatorChar)))
     if(-not $candidate.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){$status='403 Forbidden'}
     elseif(-not [IO.File]::Exists($candidate)){$status='404 Not Found'}
     else {
      $file=$candidate;$ext=[IO.Path]::GetExtension($candidate).ToLowerInvariant()
      if($types.ContainsKey($ext)){$type=$types[$ext]}else{$type='application/octet-stream'}
     }
    }
   }
   if($file){$length=(New-Object IO.FileInfo($file)).Length}else{$body=[Text.Encoding]::UTF8.GetBytes($status);$length=$body.Length}
   $header="HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $length`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
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
