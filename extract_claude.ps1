$ErrorActionPreference = 'SilentlyContinue'
$jsonLines = Get-Content "C:\Users\Cassi\.claude\projects\C--Anderson-Agnaldo-Gomes\27e0bce9-4cd1-4b15-a8aa-527f36c24f47.jsonl" -Encoding UTF8
$output = @()
foreach ($line in $jsonLines) {
    if ($line -match '"type":"assistant"') {
        $obj = $line | ConvertFrom-Json
        if ($obj.message.role -eq 'assistant' -and $obj.message.content) {
            foreach ($c in $obj.message.content) {
                if ($c.type -eq 'text') {
                    $output += $c.text
                    $output += "----------------------------------------"
                }
            }
        }
    }
}
$output | Out-File -FilePath "c:\Anderson\Agnaldo Gomes\claude_extracted_plan.txt" -Encoding UTF8
