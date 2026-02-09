#!/bin/bash
set -e

# --- Configuration ---
DEV_PROJECT="cocrm-dev"
PROD_PROJECT="cocrm-prod"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# --- Helper Functions ---

log_info() {
    echo -e "${GREEN}[INFO] $1${RESET}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${RESET}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${RESET}"
}

check_dependencies() {
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI is not installed. Please install it first."
        exit 1
    fi
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
}

bump_version() {
    local bump_type=$1
    
    if [ "$bump_type" == "none" ]; then
        return
    fi

    log_info "Bumping $bump_type version..."
    
    # Bump version in root package.json if it exists, or create a dummy one for tracking
    if [ ! -f package.json ]; then
        echo '{"version": "0.0.0"}' > package.json
    fi
    
    npm version $bump_type --no-git-tag-version
    
    local new_version=$(node -p "require('./package.json').version")
    log_info "New version: $new_version"
}

sync_version() {
    local target_env=$1
    local current_version=$(node -p "require('./package.json').version")
    
    log_info "Syncing version $current_version to .env for $target_env..."

    if [ "$target_env" == "dev" ]; then
        if [ -f apps/web/.env ]; then
            sed -i '' "s/VITE_APP_VERSION=.*/VITE_APP_VERSION=$current_version/" apps/web/.env
        else
            log_warn "apps/web/.env not found, skipping version sync."
        fi
    else
        if [ -f apps/web/.env.production ]; then
            sed -i '' "s/VITE_APP_VERSION=.*/VITE_APP_VERSION=$current_version/" apps/web/.env.production
        else
            log_warn "apps/web/.env.production not found, skipping version sync."
        fi
    fi
}

deploy_dev() {
    log_info "Deploying to DEVELOPMENT ($DEV_PROJECT)..."
    
    # 1. Build Web App
    log_info "Building Web App (Mode: development)..."
    cd apps/web
    npm install
    npm run build -- --mode development
    cd ../..
    
    # 2. Build Functions
    log_info "Building Functions..."
    cd functions
    npm install
    npm run build
    cd ..
    
    # 3. Deploy to Firebase
    log_info "Deploying to Firebase (Hosting: dev, Functions, Firestore, Storage)..."
    # Note: We deploy to the 'dev' hosting target which maps to the dev site
    firebase deploy --project $DEV_PROJECT --only hosting:dev,functions,firestore,storage
    
    log_info "Deployment to DEV complete!"
    local current_version=$(node -p "require('./package.json').version")
    log_info "Deployed Version: v$current_version"
}

deploy_prod() {
    log_info "Deploying to PRODUCTION ($PROD_PROJECT)..."
    
    echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION. Are you sure? (y/N)${RESET}"
    read -r confirmation
    if [[ "$confirmation" != "y" ]] && [[ "$confirmation" != "Y" ]]; then
        log_info "Deployment cancelled."
        exit 0
    fi

    # 1. Build Web App
    log_info "Building Web App (Mode: production)..."
    cd apps/web
    npm install
    npm run build -- --mode production
    cd ../..
    
    # 2. Build Functions
    log_info "Building Functions..."
    cd functions
    npm install
    npm run build
    cd ..
    
    # 3. Deploy to Firebase
    log_info "Deploying to Firebase (Hosting: prod, Functions, Firestore, Storage)..."
    firebase deploy --project $PROD_PROJECT --only hosting:prod,functions,firestore,storage
    
    log_info "Deployment to PROD complete!"
    local current_version=$(node -p "require('./package.json').version")
    log_info "Deployed Version: v$current_version"
}

# --- Main Script ---

check_dependencies

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <environment> [version_bump]"
    echo "Environments: dev, prod"
    echo "Version Bump (Optional): patch, minor, major, none (default: none)"
    exit 1
fi

ENV_TARGET=$1
BUMP_TYPE=${2:-none}

# Validate Environment
if [[ "$ENV_TARGET" != "dev" && "$ENV_TARGET" != "prod" ]]; then
    log_error "Invalid environment: $ENV_TARGET. Must be 'dev' or 'prod'."
    exit 1
fi

# Validate Bump Type
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" && "$BUMP_TYPE" != "none" ]]; then
    log_error "Invalid version bump type: $BUMP_TYPE. Must be 'patch', 'minor', 'major', or 'none'."
    exit 1
fi

# Execute Version Bump
bump_version $BUMP_TYPE

# Sync Version to Target Env
sync_version $ENV_TARGET

# Execute Deployment
if [ "$ENV_TARGET" == "dev" ]; then
    deploy_dev
elif [ "$ENV_TARGET" == "prod" ]; then
    deploy_prod
fi
