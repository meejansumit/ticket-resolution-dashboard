@echo off
echo ===================================================
echo   KPI Ticket Resolution Dashboard Auto-Update
echo ===================================================
echo.
echo Step 1: Exporting raw data from Excel...
python export_all_months.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to export data from KPI Ticket Resolution.xlsx
    echo Please make sure the Excel file is not locked or has changed format.
    pause
    exit /b %errorlevel%
)
echo.
echo Step 2: Compiling template to dashboard.html and dist\index.html...
python build_dashboard.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to compile dashboard files from template.
    pause
    exit /b %errorlevel%
)
echo.
echo [SUCCESS] Dashboard has been updated successfully!
echo Opening dashboard.html...
start "" "dashboard.html"
echo.
echo You can close this window now.
timeout /t 3
