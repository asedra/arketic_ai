#!/bin/bash

# Arketic Rollback Script
# Quick rollback mechanism for production deployments

set -euo pipefail

NAMESPACE="${NAMESPACE:-arketic}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

rollback_deployment() {
    local deployment=$1
    local revision=${2:-}
    
    log_info "Rolling back deployment: $deployment"
    
    if [ -n "$revision" ]; then
        kubectl rollout undo deployment/$deployment -n $NAMESPACE --to-revision=$revision
    else
        kubectl rollout undo deployment/$deployment -n $NAMESPACE
    fi
    
    kubectl rollout status deployment/$deployment -n $NAMESPACE --timeout=300s
    log_success "Rollback completed for $deployment"
}

rollback_all() {
    log_info "Rolling back all Arketic deployments..."
    
    # Get deployments
    deployments=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    
    for deployment in $deployments; do
        if [[ $deployment == arketic-* ]]; then
            rollback_deployment $deployment
        fi
    done
}

show_rollout_history() {
    local deployment=$1
    log_info "Rollout history for $deployment:"
    kubectl rollout history deployment/$deployment -n $NAMESPACE
}

main() {
    case "${1:-help}" in
        "frontend")
            rollback_deployment "arketic-frontend" "${2:-}"
            ;;
        "backend")
            rollback_deployment "arketic-backend" "${2:-}"
            ;;
        "all")
            rollback_all
            ;;
        "history")
            if [ -n "${2:-}" ]; then
                show_rollout_history "$2"
            else
                log_error "Please specify deployment name"
                exit 1
            fi
            ;;
        "help"|*)
            echo "Usage: $0 {frontend|backend|all|history} [revision]"
            echo ""
            echo "Commands:"
            echo "  frontend [revision]  - Rollback frontend deployment"
            echo "  backend [revision]   - Rollback backend deployment"
            echo "  all                  - Rollback all deployments"
            echo "  history <deployment> - Show rollout history"
            echo ""
            echo "Examples:"
            echo "  $0 frontend          - Rollback frontend to previous version"
            echo "  $0 backend 3         - Rollback backend to revision 3"
            echo "  $0 history arketic-frontend - Show frontend rollout history"
            exit 1
            ;;
    esac
}

main "$@"