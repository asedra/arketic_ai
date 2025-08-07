#!/bin/bash

# Arketic Monitoring Setup Script
# Comprehensive monitoring, logging, and alerting setup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Install Prometheus and Grafana
install_prometheus_stack() {
    log_info "Installing Prometheus monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl label namespace monitoring name=monitoring --overwrite
    
    # Add Prometheus Helm repo
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    # Install kube-prometheus-stack
    helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --values "$PROJECT_ROOT/monitoring/prometheus-values.yaml" \
        --wait --timeout 600s
    
    log_success "Prometheus stack installed"
}

# Install ELK Stack
install_elk_stack() {
    log_info "Installing ELK logging stack..."
    
    # Create logging namespace
    kubectl create namespace logging --dry-run=client -o yaml | kubectl apply -f -
    
    # Add Elastic Helm repo
    helm repo add elastic https://helm.elastic.co
    helm repo update
    
    # Install Elasticsearch
    helm upgrade --install elasticsearch elastic/elasticsearch \
        --namespace logging \
        --values "$PROJECT_ROOT/monitoring/elasticsearch-values.yaml" \
        --wait --timeout 600s
    
    # Install Kibana
    helm upgrade --install kibana elastic/kibana \
        --namespace logging \
        --set elasticsearchHosts="http://elasticsearch-master:9200" \
        --wait --timeout 300s
    
    # Install Fluentd (or Fluent Bit)
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>
    
    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>
    
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch-master
      port 9200
      logstash_format true
      logstash_prefix arketic
      include_tag_key true
      type_name _doc
      tag_key @log_name
      <buffer>
        @type memory
        flush_interval 1s
      </buffer>
    </match>
EOF
    
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch7-1
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch-master"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        resources:
          limits:
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 256Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: config
          mountPath: /fluentd/etc/fluent.conf
          subPath: fluent.conf
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: config
        configMap:
          name: fluentd-config
EOF
    
    log_success "ELK stack installed"
}

# Install Falco for security monitoring
install_falco() {
    log_info "Installing Falco security monitoring..."
    
    # Create falco namespace
    kubectl create namespace falco-system --dry-run=client -o yaml | kubectl apply -f -
    
    # Add Falco Helm repo
    helm repo add falco-security https://falcosecurity.github.io/charts
    helm repo update
    
    # Install Falco
    helm upgrade --install falco falco-security/falco \
        --namespace falco-system \
        --values "$PROJECT_ROOT/security/falco-values.yaml" \
        --wait --timeout 300s
    
    log_success "Falco security monitoring installed"
}

# Setup Grafana dashboards
setup_grafana_dashboards() {
    log_info "Setting up Grafana dashboards..."
    
    # Wait for Grafana to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n monitoring --timeout=300s
    
    # Get Grafana admin password
    GRAFANA_PASSWORD=$(kubectl get secret --namespace monitoring kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 --decode)
    
    log_info "Grafana admin password: $GRAFANA_PASSWORD"
    
    # Port forward to access Grafana
    kubectl port-forward svc/kube-prometheus-stack-grafana -n monitoring 3000:80 &
    GRAFANA_PID=$!
    
    sleep 10
    
    # Import custom dashboards via API
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @"$PROJECT_ROOT/monitoring/arketic-dashboard.json" \
        http://admin:$GRAFANA_PASSWORD@localhost:3000/api/dashboards/db
    
    # Kill port forward
    kill $GRAFANA_PID 2>/dev/null || true
    
    log_success "Grafana dashboards configured"
}

# Create custom alerts
create_custom_alerts() {
    log_info "Creating custom alerting rules..."
    
    kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: arketic-custom-alerts
  namespace: monitoring
  labels:
    app: arketic
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: arketic.application
    rules:
    - alert: ArketicFrontendDown
      expr: up{job="arketic-frontend"} == 0
      for: 1m
      labels:
        severity: critical
        service: frontend
      annotations:
        summary: "Arketic frontend is down"
        description: "Arketic frontend has been down for more than 1 minute"
    
    - alert: ArketicBackendDown
      expr: up{job="arketic-backend"} == 0
      for: 1m
      labels:
        severity: critical
        service: backend
      annotations:
        summary: "Arketic backend is down"
        description: "Arketic backend has been down for more than 1 minute"
    
    - alert: ArketicDatabaseDown
      expr: up{job="postgres"} == 0
      for: 1m
      labels:
        severity: critical
        service: database
      annotations:
        summary: "Arketic database is down"
        description: "PostgreSQL database has been down for more than 1 minute"
    
    - alert: ArketicHighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 2m
      labels:
        severity: warning
        service: application
      annotations:
        summary: "High error rate detected"
        description: "Error rate is above 10% for the last 5 minutes"
    
    - alert: ArketicHighLatency
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
      for: 5m
      labels:
        severity: warning
        service: application
      annotations:
        summary: "High latency detected"
        description: "95th percentile latency is above 1 second"
    
    - alert: ArketicDiskSpaceHigh
      expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.8
      for: 5m
      labels:
        severity: warning
        service: infrastructure
      annotations:
        summary: "Disk space usage high"
        description: "Disk space usage is above 80%"
    
    - alert: ArketicMemoryHigh
      expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9
      for: 5m
      labels:
        severity: warning
        service: infrastructure
      annotations:
        summary: "Memory usage high"
        description: "Memory usage is above 90%"
    
  - name: arketic.security
    rules:
    - alert: ArketicSecurityViolation
      expr: increase(falco_events_total[5m]) > 0
      for: 0m
      labels:
        severity: critical
        service: security
      annotations:
        summary: "Security violation detected"
        description: "Falco detected {{ \$value }} security events in the last 5 minutes"
    
    - alert: ArketicUnauthorizedAccess
      expr: rate(http_requests_total{status="401"}[5m]) > 0.1
      for: 2m
      labels:
        severity: warning
        service: security
      annotations:
        summary: "High unauthorized access rate"
        description: "Unauthorized access attempts above 10% for the last 5 minutes"
EOF
    
    log_success "Custom alerts created"
}

# Setup log aggregation and analysis
setup_log_analysis() {
    log_info "Setting up log analysis and aggregation..."
    
    # Create index patterns and visualizations in Kibana
    kubectl port-forward svc/kibana-kibana -n logging 5601:5601 &
    KIBANA_PID=$!
    
    sleep 30
    
    # Create index pattern
    curl -X POST "localhost:5601/api/saved_objects/index-pattern/arketic-*" \
        -H "Content-Type: application/json" \
        -H "kbn-xsrf: true" \
        -d '{
          "attributes": {
            "title": "arketic-*",
            "timeFieldName": "@timestamp"
          }
        }'
    
    # Kill port forward
    kill $KIBANA_PID 2>/dev/null || true
    
    log_success "Log analysis configured"
}

# Main function
main() {
    case "${1:-all}" in
        "prometheus")
            install_prometheus_stack
            setup_grafana_dashboards
            ;;
        "elk")
            install_elk_stack
            setup_log_analysis
            ;;
        "security")
            install_falco
            ;;
        "alerts")
            create_custom_alerts
            ;;
        "all")
            install_prometheus_stack
            install_elk_stack
            install_falco
            setup_grafana_dashboards
            create_custom_alerts
            setup_log_analysis
            ;;
        *)
            echo "Usage: $0 {prometheus|elk|security|alerts|all}"
            echo ""
            echo "Commands:"
            echo "  prometheus  - Install Prometheus and Grafana"
            echo "  elk         - Install Elasticsearch, Logstash, Kibana"
            echo "  security    - Install Falco security monitoring"
            echo "  alerts      - Create custom alerting rules"
            echo "  all         - Install complete monitoring stack"
            exit 1
            ;;
    esac
    
    log_success "Monitoring setup completed!"
    
    echo ""
    echo "Access URLs:"
    echo "Grafana:    kubectl port-forward svc/kube-prometheus-stack-grafana -n monitoring 3000:80"
    echo "Prometheus: kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090"
    echo "Kibana:     kubectl port-forward svc/kibana-kibana -n logging 5601:5601"
    echo ""
}

main "$@"