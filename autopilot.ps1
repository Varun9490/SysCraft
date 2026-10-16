# SysCanvas Windows OpenCode Autopilot
$ErrorActionPreference = "Stop"

Write-Host "Starting SysCanvas Autonomous Build with OpenCode..." -ForegroundColor Cyan

$maxIterations = 12
$iteration = 0

while (Get-Content "progress.md" | Select-String "\- \[ \]") {
    $iteration++
    if ($iteration -gt $maxIterations) {
        Write-Host "Max iterations reached. Please review progress.md." -ForegroundColor Red
        exit 1
    }

    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host "OpenCode Iteration #$iteration" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Yellow

    # Run OpenCode with standard autonomous flags
    opencode run --auto "Read agents.md, architecture.md, prompt.md, and progress.md. Find the first unchecked '[ ]' item in progress.md and implement it completely with zero placeholders or TODOs. Run 'npm run typecheck', fix any errors until exit code is 0, update progress.md to mark items '[x]', commit changes to git, and proceed immediately to the next milestone. On Milestone 8, run 'npm run typecheck && npm run test && npm run build'."
}

Write-Host "All milestones completed successfully! Running final verification build..." -ForegroundColor Green
npm run typecheck
npm run test
npm run build
Write-Host "SysCanvas production static build is ready!" -ForegroundColor Green
