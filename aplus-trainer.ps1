Write-Host "Clonie's A+ CLI Trainer"
Write-Host "------------------------"

# 1. Define paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$questionsPath = Join-Path $scriptDir "questions.json"

# --- START DEBUGGING ---
Write-Host "DEBUG: Expecting JSON file at: $questionsPath"

if (-not (Test-Path $questionsPath)) {
    Write-Host "DEBUG: FATAL ERROR - File not found at the expected path." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    return # Stop the script
}

Write-Host "DEBUG: File found! Reading raw content..."
$rawContent = Get-Content $questionsPath -Raw
# --- END DEBUGGING ---

# Attempt to parse the JSON
$questions = $rawContent | ConvertFrom-Json

# --- FINAL CHECK ---
if ($null -eq $questions -or $questions.Count -eq 0) {
    Write-Host "DEBUG: FATAL ERROR - JSON conversion failed or the file is empty. The `$questions variable is null or empty." -ForegroundColor Red
    Write-Host "DEBUG: Please ensure the JSON file is not empty and is a valid JSON array (starts with '[' and ends with ']')."
    Read-Host "Press Enter to exit"
    return # Stop the script
}

Write-Host "DEBUG: Success! Loaded $($questions.Count) questions." -ForegroundColor Green
Read-Host "DEBUG: Pausing before quiz. Press Enter to start."
# --------------------


while ($true) {
    Clear-Host
    Write-Host "Clonie's A+ CLI Trainer"
    Write-Host "------------------------"
    Write-Host ""

    # This should now work correctly
    $q = Get-Random -InputObject $questions

    Write-Host "Core: $($q.core)"
    Write-Host "Domain: $($q.domain)"
    Write-Host ""
    Write-Host $q.question
    Write-Host ""
    Write-Host "A) $($q.choices.A)"
    Write-Host "B) $($q.choices.B)"
    Write-Host "C) $($q.choices.C)"
    Write-Host "D) $($q.choices.D)"
    Write-Host ""
    $answer = Read-Host "Your answer (A/B/C/D) or Q to quit"
    
    # Check for null before calling methods on it
    if ($null -ne $answer) {
        $answer = $answer.Trim().ToUpper()
    }

    if ($answer -eq "Q") { break }

    if ($answer -eq $q.answer.ToUpper()) {
        Write-Host ""
        Write-Host "Correct! ✅" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Incorrect ❌  Correct answer: $($q.answer)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Explanation:"
    Write-Host $q.explanation
    Write-Host ""
    Read-Host "Press Enter for next question"
}
