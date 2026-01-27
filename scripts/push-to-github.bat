@echo off
REM =============================================================================
REM ACE Governance Platform - Push to GitHub
REM =============================================================================
REM
REM Before running this script:
REM 1. Create a new repository on GitHub (don't initialize with README)
REM 2. Replace YOUR_USERNAME with your GitHub username
REM 3. Replace YOUR_REPO_NAME with your repository name
REM
REM =============================================================================

echo.
echo =============================================
echo   ACE Governance Platform - GitHub Setup
echo =============================================
echo.

REM Change to the project directory
cd /d "%~dp0.."

REM Initialize git repository
echo Initializing git repository...
git init

REM Add all files
echo Adding files...
git add .

REM Create initial commit
echo Creating initial commit...
git commit -m "Initial commit: ACE Governance Platform with enterprise security

Features:
- Multi-agent orchestration with MAI Runtime
- Hash-chained audit ledger
- JWT authentication with SOD enforcement
- Tenant isolation and rate limiting
- Break-glass emergency access
- FedRAMP-ready compliance modes
- Docker deployment ready

Co-Authored-By: Claude <noreply@anthropic.com>"

REM Instructions for remote
echo.
echo =============================================
echo   Next Steps:
echo =============================================
echo.
echo 1. Create a new repository on GitHub:
echo    https://github.com/new
echo.
echo 2. Run these commands (replace with your repo URL):
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo =============================================
echo.
pause
