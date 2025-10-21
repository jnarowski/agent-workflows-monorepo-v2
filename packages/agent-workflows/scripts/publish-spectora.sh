#!/bin/bash
set -euo pipefail

# Check if SPECTORA_NPM_TOKEN is set
if [[ -z "${SPECTORA_NPM_TOKEN:-}" ]]; then
  echo "❌ Error: SPECTORA_NPM_TOKEN environment variable is not set"
  exit 1
fi

echo "🔨 Building package..."
pnpm build

echo ""
echo "📦 Publishing @spectora/agent-workflows to Spectora registry..."

# Backup original package.json
cp package.json package.json.backup

# Temporarily change package name to @spectora
cat package.json | jq '.name = "@spectora/agent-workflows"' > package.json.tmp
mv package.json.tmp package.json

# Create temporary .npmrc with Spectora token
cat > .npmrc.tmp << EOF
//registry.npmjs.org/:_authToken=${SPECTORA_NPM_TOKEN}
EOF

# Publish with Spectora scope
npm publish --registry=https://registry.npmjs.org --access=restricted --userconfig=.npmrc.tmp

# Restore original package.json
rm package.json
mv package.json.backup package.json

# Clean up
rm .npmrc.tmp

echo ""
echo "✅ Successfully published to Spectora registry!"
