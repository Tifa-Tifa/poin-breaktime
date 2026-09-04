$nodePath = 'C:\Users\athif\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'

if (Get-Command node -ErrorAction SilentlyContinue) {
  node "$PSScriptRoot\server.js"
} elseif (Test-Path -LiteralPath $nodePath) {
  & $nodePath "$PSScriptRoot\server.js"
} else {
  Write-Error 'Node.js was not found. Install Node.js 18 or newer and run this script again.'
}
