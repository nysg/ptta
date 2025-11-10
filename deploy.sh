#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() {
    echo -e "${RED}Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if version type is provided
if [ -z "$1" ]; then
    print_error "Version type is required (patch/minor/major)"
    echo "Usage: ./deploy.sh <patch|minor|major>"
    exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    print_error "Invalid version type: $VERSION_TYPE"
    echo "Must be one of: patch, minor, major"
    exit 1
fi

print_info "Starting deployment process for version type: $VERSION_TYPE"
echo ""

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_error "Not on main branch (current: $CURRENT_BRANCH)"
    echo "Please switch to main branch before deploying"
    exit 1
fi
print_success "On main branch"

# Check if working directory is clean
if [[ -n $(git status -s) ]]; then
    print_error "Working directory is not clean"
    echo "Please commit or stash your changes before deploying"
    git status -s
    exit 1
fi
print_success "Working directory is clean"

# Pull latest changes
print_info "Pulling latest changes from origin..."
git pull origin main
print_success "Up to date with origin/main"

# Run tests
print_info "Running tests..."
if ! npm test; then
    print_error "Tests failed"
    exit 1
fi
print_success "All tests passed"

# Run build
print_info "Running build..."
if ! npm run build:all; then
    print_error "Build failed"
    exit 1
fi
print_success "Build succeeded"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Update version using npm version (this creates a commit and tag)
print_info "Updating version ($VERSION_TYPE)..."
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
NEW_VERSION=${NEW_VERSION#v} # Remove 'v' prefix
print_success "Version updated to: $NEW_VERSION"

# Show the diff
echo ""
print_info "Changes:"
git diff package.json
echo ""

# Commit version change
print_info "Committing version change..."
git add package.json
git commit -m "chore: バージョンを${NEW_VERSION}に更新

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
print_success "Version change committed"

# Create git tag
print_info "Creating git tag v${NEW_VERSION}..."
git tag "v${NEW_VERSION}"
print_success "Tag created: v${NEW_VERSION}"

# Publish to npm
print_info "Publishing to npm..."
if ! npm publish --access public; then
    print_error "npm publish failed"
    print_info "Rolling back git commit and tag..."
    git tag -d "v${NEW_VERSION}"
    git reset --hard HEAD~1
    exit 1
fi
print_success "Published to npm: @nysg/ptta@${NEW_VERSION}"

# Push to GitHub
print_info "Pushing to GitHub..."
git push origin main --tags
print_success "Pushed to GitHub with tags"

echo ""
print_success "Deployment completed successfully!"
echo ""
echo "Version: ${NEW_VERSION}"
echo "npm: https://www.npmjs.com/package/@nysg/ptta"
echo "GitHub: https://github.com/nysg/ptta/releases/tag/v${NEW_VERSION}"
echo ""
