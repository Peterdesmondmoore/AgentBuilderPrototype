#requires -Version 5.1

# Prepares image-delivery prototype artifacts by capturing, validating, and building them.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$demoDirectory = Join-Path $repositoryRoot "demo"
$packageLockPath = Join-Path $demoDirectory "package-lock.json"

if (-not (Test-Path -LiteralPath $packageLockPath -PathType Leaf)) {
    throw "The starter is incomplete: demo/package-lock.json was not found."
}

$npmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if ($null -eq $npmCommand) {
    $npmCommand = Get-Command "npm" -ErrorAction SilentlyContinue
}
if ($null -eq $npmCommand) {
    throw "npm was not found. Install Node.js and npm, then run this script again."
}

$gitCommand = Get-Command "git.exe" -ErrorAction SilentlyContinue
if ($null -eq $gitCommand) {
    $gitCommand = Get-Command "git" -ErrorAction SilentlyContinue
}
if ($null -eq $gitCommand) {
    throw "Git was not found. Install Git, then run this script again."
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.CommandInfo]$Command,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $Command.Source @Arguments
    if ($LASTEXITCODE -ne 0) {
        $displayCommand = "$($Command.Name) $($Arguments -join ' ')"
        throw "$displayCommand failed with exit code $LASTEXITCODE."
    }
}

Push-Location -LiteralPath $demoDirectory
try {
    Invoke-CheckedCommand -Command $npmCommand -Arguments @("ci")
    Invoke-CheckedCommand -Command $npmCommand -Arguments @("run", "capture:screenshots")
    Invoke-CheckedCommand -Command $npmCommand -Arguments @("run", "validate")
    Invoke-CheckedCommand -Command $npmCommand -Arguments @("run", "validate:screenshots")
    Invoke-CheckedCommand -Command $npmCommand -Arguments @("run", "build")
}
finally {
    Pop-Location
}

Push-Location -LiteralPath $repositoryRoot
try {
    Invoke-CheckedCommand -Command $gitCommand -Arguments @("status", "--short")
}
finally {
    Pop-Location
}
