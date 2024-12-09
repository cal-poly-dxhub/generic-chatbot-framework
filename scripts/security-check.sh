#!/bin/bash
set -euo pipefail

echo "Running security checks..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}


# Check and run npm license check
if command_exists npx; then
    rm -rf reports/licence-check.txt

    echo "Running npm license check..."
    echo "# infra" > reports/license-check.txt
    npx license-checker --production --summary --start . >> reports/licence-check.txt

    echo "# frontend" > reports/license-check.txt
    npx license-checker --production --summary --start ./frontend >> reports/licence-check.txt
else
    echo "npx not found. Skipping license check."
fi

# Check and run pip-licenses
if command_exists pip-licenses; then
    echo "Running pip-licenses..."
    pip-licenses > reports/python-licenses.txt
else
    echo "pip-licenses not found. Skipping pip license check."
fi

# Check and run npm audit
if command_exists npm; then
    rm -rf reports/npm-audit.txt

    echo "Running npm audit on infra..."
    echo " infra" > reports/npm-audit.txt
    npm audit --omit=dev --summary --prefix . > reports/npm-audit.txt

    echo "Running npm audit on frontend..."
    echo " frontend" >> reports/npm-audit.txt
    npm audit --omit=dev --summary --prefix ./frontend >> reports/npm-audit.txt
else
    echo "npm not found. Skipping npm audit."
fi

# Check and run bandit
if command_exists bandit; then
    echo "Running bandit..."
    bandit -r ./lib/backend > reports/bandit.txt
else
    echo "bandit not found. Skipping bandit scan."
fi

# Check and run git-secret-scan.sh
if [ -f "./scripts/git-secrets-scan.sh" ]; then
    echo "Running git-secrets-scan..."
    bash ./scripts/git-secrets-scan.sh > reports/gitsecrets.txt
else
    echo "git-secrets-scan.sh not found. Skipping git secrets scan."
fi

echo "Security checks completed."