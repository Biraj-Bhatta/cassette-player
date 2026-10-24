#Requires -Version 5.1
<#
.SYNOPSIS
Installs the dependencies, builds Cassette Player, and installs it for the current user.
.PARAMETER Uninstall
Removes the installed app and its shortcuts. Your library and settings are kept.
#>
param(
        [switch]$Uninstall
     )

    $ErrorActionPreference = "Stop"

    $AppName      = "Cassette Player"
    $ExeName      = "cassette-player.exe"
    $WailsVersion = "v2.16.0"
    $Root         = Split-Path -Parent $PSScriptRoot
    $InstallDir   = Join-Path $env:LOCALAPPDATA "Programs\Cassette Player"
    $StartMenuLnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Cassette Player.lnk"
    $DesktopLnk   = Join-Path ([Environment]::GetFolderPath("Desktop")) "Cassette Player.lnk"

    function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
    function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
    function Write-Note($msg) { Write-Host "    $msg" -ForegroundColor Yellow }

    function Test-Cmd($name) {
        [bool](Get-Command $name -ErrorAction SilentlyContinue)
    }

# Reloads PATH from the registry, so tools installed in this session are found.
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
        $user    = [Environment]::GetEnvironmentVariable("Path", "User")
        $env:Path = "$machine;$user"
}

function Install-WingetPackage($id, $cmd, $label) {
    if (Test-Cmd $cmd) {
        Write-Ok "$label is already installed"
            return
    }
    Write-Note "Installing $label..."
        winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
        Update-SessionPath
        if (-not (Test-Cmd $cmd)) {
            throw "$label was installed, but '$cmd' is not visible yet. Close this window, open a new one, and run the script again."
        }
    Write-Ok "$label installed"
}

function Test-WebView2 {
    $keys = @(
            "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
            )
        foreach ($k in $keys) { if (Test-Path $k) { return $true } }
    return $false
}

function New-Shortcut($path, $target, $workDir) {
    $shell = New-Object -ComObject WScript.Shell
        $lnk = $shell.CreateShortcut($path)
        $lnk.TargetPath       = $target
        $lnk.WorkingDirectory = $workDir
        $lnk.IconLocation     = "$target,0"
        $lnk.Description      = "Local music player"
        $lnk.Save()
}

# ---------------------------------------------------------------- Uninstall
if ($Uninstall) {
    Write-Step "Uninstalling $AppName"
        Get-Process -Name "cassette-player" -ErrorAction SilentlyContinue | Stop-Process -Force
        foreach ($p in @($InstallDir, $StartMenuLnk, $DesktopLnk)) {
            if (Test-Path $p) {
                Remove-Item $p -Recurse -Force
                    Write-Ok "Removed $p"
            }
        }
    Write-Ok "Done. Your library and settings were kept in $env:APPDATA\cassette-player"
        Write-Ok "Delete that folder yourself if you want a full reset."
        exit 0
}

# ---------------------------------------------------------------- Dependencies
Write-Step "Checking dependencies"

if (-not (Test-Cmd winget)) {
    throw "winget was not found. Install 'App Installer' from the Microsoft Store, then run this script again."
}

Install-WingetPackage "GoLang.Go"         "go"      "Go"
Install-WingetPackage "OpenJS.NodeJS.LTS" "node"    "Node.js"
Install-WingetPackage "Gyan.FFmpeg"       "ffprobe" "ffmpeg (includes ffprobe)"

if (Test-WebView2) {
    Write-Ok "WebView2 runtime is already installed"
} else {
    Write-Note "Installing WebView2 runtime..."
        winget install --id Microsoft.EdgeWebView2Runtime -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
        Update-SessionPath
        Write-Ok "WebView2 runtime installed"
}

if (Test-Cmd wails) {
    Write-Ok "Wails CLI is already installed"
} else {
    Write-Note "Installing Wails CLI $WailsVersion..."
        go install "github.com/wailsapp/wails/v2/cmd/wails@$WailsVersion"
        if ($LASTEXITCODE -ne 0) { throw "go install of the Wails CLI failed." }

    $gobin = Join-Path (go env GOPATH) "bin"
        $env:Path = "$gobin;$env:Path"

# Keep the Go bin folder on the user PATH so future terminals find wails.
        $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($userPath -notlike "*$gobin*") {
            [Environment]::SetEnvironmentVariable("Path", "$userPath;$gobin", "User")
        }
    Write-Ok "Wails CLI installed"
}

# ---------------------------------------------------------------- Build
Write-Step "Preparing the project"
Set-Location $Root

Write-Note "Downloading Go modules..."
go mod tidy
if ($LASTEXITCODE -ne 0) { throw "go mod tidy failed." }

Write-Note "Installing frontend packages..."
Push-Location (Join-Path $Root "frontend")
try {
    npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
    npm rebuild esbuild | Out-Null
} finally {
    Pop-Location
}

Write-Step "Building $AppName"
wails build -clean -platform windows/amd64
if ($LASTEXITCODE -ne 0) { throw "wails build failed. Check the output above." }

$builtExe = Join-Path $Root "build\bin\$ExeName"
if (-not (Test-Path $builtExe)) {
    $found = Get-ChildItem (Join-Path $Root "build\bin") -Filter *.exe | Select-Object -First 1
        if (-not $found) { throw "No .exe was produced in build\bin." }
    $builtExe = $found.FullName
}
Write-Ok "Built $builtExe"

# ---------------------------------------------------------------- Install
Write-Step "Installing to $InstallDir"

Get-Process -Name "cassette-player" -ErrorAction SilentlyContinue | Stop-Process -Force
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$installedExe = Join-Path $InstallDir $ExeName
Copy-Item $builtExe $installedExe -Force
Write-Ok "Copied the application"

New-Item -ItemType Directory -Force -Path (Split-Path $StartMenuLnk) | Out-Null
New-Shortcut $StartMenuLnk $installedExe $InstallDir
Write-Ok "Added a Start Menu shortcut"

$answer = Read-Host "    Create a desktop shortcut too? (y/N)"
if ($answer -match '^(y|yes)$') {
    New-Shortcut $DesktopLnk $installedExe $InstallDir
        Write-Ok "Added a desktop shortcut"
}

Write-Step "Finished"
Write-Ok "$AppName is installed. Search for it in the Start Menu."
Write-Ok "To uninstall later, run: install.bat -Uninstall"
Write-Note "ffmpeg is needed to scan music. If scanning fails, open a new terminal and run: ffprobe -version"
