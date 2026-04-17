# Read-only source: edream_frontend. Writes only under waterb_frontend.
$ErrorActionPreference = "Stop"
$EdreamRoot = "c:\Users\aram\psh\project\edream_frontend"
$WaterRoot = "c:\Users\aram\psh\project\waterb_frontend"

$RelPaths = @(
  "src\widgets\userWeb\BizInputDmSection\index.tsx",
  "src\widgets\userWeb\BizInputPrSection\index.tsx",
  "src\widgets\userWeb\BizInputSection\index.tsx",
  "src\widgets\userWeb\BizInputVdSection\index.tsx",
  "src\widgets\userWeb\CommunitySection\index.tsx",
  "src\widgets\userWeb\CommunityViewSection\index.tsx",
  "src\widgets\userWeb\JoinAcSection\index.tsx",
  "src\widgets\userWeb\NoticeViewSection\index.tsx",
  "src\widgets\userWeb\QnaSection\index.tsx",
  "src\widgets\userWeb\QnaViewSection\index.tsx",
  "src\features\adminWeb\article\detail\model\useArticleDetail.ts",
  "src\features\adminWeb\support\application\register\model\useSupportApplicationRegister.ts",
  "src\features\adminWeb\support\update\model\useSupportUpdate.ts"
)

foreach ($rel in $RelPaths) {
  $src = Join-Path $EdreamRoot $rel
  $dst = Join-Path $WaterRoot $rel
  if (-not (Test-Path $src)) {
    Write-Warning "Skip (missing in edream): $rel"
    continue
  }
  $text = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)
  # Prefix replace covers both downloadEdreamAttachment( and downloadEdreamAttachmentOrOpenView
  $text = $text.Replace("downloadEdreamAttachment", "downloadWaterbAttachment")
  $dir = Split-Path $dst -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($dst, $text, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Synced: $rel"
}
