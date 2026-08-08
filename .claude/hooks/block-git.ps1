$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$cmd = $payload.tool_input.command
if ($cmd -match 'git\s+(merge|checkout\s+main\b|switch\s+main\b|branch\s+-[dD]\s)') {
[Console]::Error.WriteLine("BLOCKED by hook: merges, switching to main, and branch deletion require Oren's explicit approval. Ask her, then she can run it herself or temporarily lift the hook.")
exit 2
}
exit 0
