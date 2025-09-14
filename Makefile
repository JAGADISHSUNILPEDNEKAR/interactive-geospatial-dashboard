# Enterprise Multi-Tenant SaaS Platform Makefile
# Version: 1.0.0

.PHONY: help
help: ## Show this help message
	@echo "Enterprise SaaS Platform - Available Commands"
	@echo "============================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_DEV = $(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
DOCKER_COMPOSE_TEST = $(DOCKER_COMPOSE) -f docker-compose.test.yml
KUBECTL = kubectl
TERRAFORM = terraform
SERVICES = user-management inventory-management financial-analytics document-management communication-hub audit-logging workflow-engine reporting-service notification-service integration-hub

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

# Development Commands
.PHONY: install-deps
install-deps: ## Install all dependencies for local development
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Installing dependencies for $$service...$(NC)"; \
		$(MAKE) -C services/$$service install || true; \
	done
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

.PHONY: dev
dev: ## Start all services in development mode
	@echo "$(GREEN)Starting development environment...$(NC)"
	$(DOCKER_COMPOSE_DEV) up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "Services available at:"
	@echo "  - API Gateway: http://localhost:8000"
	@echo "  - User Management: http://localhost:8010"
	@echo "  - Inventory Management: http://localhost:8020"
	@echo "  - Financial Analytics: http://localhost:8030"
	@echo "  - Document Management: http://localhost:8040"
	@echo "  - Communication Hub: http://localhost:8050"
	@echo "  - Audit Logging: http://localhost:8060"
	@echo "  - Workflow Engine: http://localhost:8070"
	@echo "  - Reporting Service: http://localhost:8080"
	@echo "  - Notification Service: http://localhost:8090"
	@echo "  - Integration Hub: http://localhost:8100"
	@echo "  - Grafana: http://localhost:3000"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Jaeger: http://localhost:16686"
	@echo "  - Kibana: http://localhost:5601"

.PHONY: dev-stop
dev-stop: ## Stop development environment
	@echo "$(YELLOW)Stopping development environment...$(NC)"
	$(DOCKER_COMPOSE_DEV) down
	@echo "$(GREEN)Development environment stopped!$(NC)"

.PHONY: dev-clean
dev-clean: ## Stop and clean development environment
	@echo "$(RED)Cleaning development environment...$(NC)"
	$(DOCKER_COMPOSE_DEV) down -v --remove-orphans
	@echo "$(GREEN)Development environment cleaned!$(NC)"

.PHONY: dev-logs
dev-logs: ## Show logs from all services
	$(DOCKER_COMPOSE_DEV) logs -f

.PHONY: dev-logs-%
dev-logs-%: ## Show logs for specific service (e.g., make dev-logs-user-management)
	$(DOCKER_COMPOSE_DEV) logs -f $*

.PHONY: dev-restart-%
dev-restart-%: ## Restart specific service (e.g., make dev-restart-user-management)
	@echo "$(YELLOW)Restarting $*...$(NC)"
	$(DOCKER_COMPOSE_DEV) restart $*
	@echo "$(GREEN)$* restarted!$(NC)"

# Database Commands
.PHONY: db-migrate
db-migrate: ## Run database migrations for all services
	@echo "$(GREEN)Running database migrations...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec user-management python manage.py migrate
	$(DOCKER_COMPOSE_DEV) exec inventory-management mvn flyway:migrate
	$(DOCKER_COMPOSE_DEV) exec workflow-engine rails db:migrate
	$(DOCKER_COMPOSE_DEV) exec reporting-service php artisan migrate
	@echo "$(GREEN)Migrations completed!$(NC)"

.PHONY: db-seed
db-seed: ## Seed databases with test data
	@echo "$(GREEN)Seeding databases...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec user-management python manage.py loaddata fixtures/initial_data.json
	$(DOCKER_COMPOSE_DEV) exec inventory-management mvn exec:java -Dexec.mainClass="com.enterprise.inventory.DataSeeder"
	$(DOCKER_COMPOSE_DEV) exec workflow-engine rails db:seed
	$(DOCKER_COMPOSE_DEV) exec reporting-service php artisan db:seed
	@echo "$(GREEN)Database seeding completed!$(NC)"

.PHONY: db-reset
db-reset: ## Reset all databases
	@echo "$(RED)Resetting databases...$(NC)"
	$(DOCKER_COMPOSE_DEV) exec user-management python manage.py flush --no-input
	$(DOCKER_COMPOSE_DEV) exec user-management python manage.py migrate
	$(MAKE) db-seed
	@echo "$(GREEN)Databases reset!$(NC)"

# Testing Commands
.PHONY: test
test: test-unit test-integration ## Run all tests

.PHONY: test-unit
test-unit: ## Run unit tests for all services
	@echo "$(GREEN)Running unit tests...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Testing $service...$(NC)"; \
		$(MAKE) test-unit-$service || exit 1; \
	done
	@echo "$(GREEN)All unit tests passed!$(NC)"

.PHONY: test-unit-user-management
test-unit-user-management: ## Run unit tests for user management service
	$(DOCKER_COMPOSE_TEST) run --rm user-management pytest --cov=. --cov-report=term-missing

.PHONY: test-unit-inventory-management
test-unit-inventory-management: ## Run unit tests for inventory management service
	$(DOCKER_COMPOSE_TEST) run --rm inventory-management mvn test

.PHONY: test-unit-financial-analytics
test-unit-financial-analytics: ## Run unit tests for financial analytics service
	$(DOCKER_COMPOSE_TEST) run --rm financial-analytics pytest --cov=. --cov-report=term-missing

.PHONY: test-unit-document-management
test-unit-document-management: ## Run unit tests for document management service
	$(DOCKER_COMPOSE_TEST) run --rm document-management dotnet test

.PHONY: test-unit-workflow-engine
test-unit-workflow-engine: ## Run unit tests for workflow engine service
	$(DOCKER_COMPOSE_TEST) run --rm workflow-engine bundle exec rspec

.PHONY: test-unit-reporting-service
test-unit-reporting-service: ## Run unit tests for reporting service
	$(DOCKER_COMPOSE_TEST) run --rm reporting-service ./vendor/bin/phpunit

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	$(DOCKER_COMPOSE_TEST) up -d
	sleep 30 # Wait for services to be ready
	cd tests/integration && npm test
	$(DOCKER_COMPOSE_TEST) down
	@echo "$(GREEN)Integration tests completed!$(NC)"

.PHONY: test-load
test-load: ## Run load tests
	@echo "$(GREEN)Running load tests...$(NC)"
	k6 run tests/load/k6-scripts/baseline.js
	k6 run tests/load/k6-scripts/stress.js
	@echo "$(GREEN)Load tests completed!$(NC)"

.PHONY: test-security
test-security: ## Run security tests
	@echo "$(GREEN)Running security scans...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Scanning $service...$(NC)"; \
		trivy fs services/$service; \
	done
	@echo "$(GREEN)Security scans completed!$(NC)"

.PHONY: test-coverage
test-coverage: ## Generate test coverage report
	@echo "$(GREEN)Generating coverage reports...$(NC)"
	@mkdir -p coverage
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Coverage for $service...$(NC)"; \
		$(MAKE) coverage-$service || true; \
	done
	@echo "$(GREEN)Coverage reports generated in ./coverage/$(NC)"

# Build Commands
.PHONY: build
build: ## Build all Docker images
	@echo "$(GREEN)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --parallel
	@echo "$(GREEN)Docker images built successfully!$(NC)"

.PHONY: build-%
build-%: ## Build specific service Docker image (e.g., make build-user-management)
	@echo "$(GREEN)Building $* image...$(NC)"
	$(DOCKER_COMPOSE) build $*
	@echo "$(GREEN)$* image built successfully!$(NC)"

.PHONY: push
push: ## Push Docker images to registry
	@echo "$(GREEN)Pushing Docker images to registry...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Pushing $service...$(NC)"; \
		docker tag enterprise-saas-$service:latest $(REGISTRY)/enterprise-saas-$service:latest; \
		docker push $(REGISTRY)/enterprise-saas-$service:latest; \
	done
	@echo "$(GREEN)Images pushed successfully!$(NC)"

# Infrastructure Commands
.PHONY: infra-init
infra-init: ## Initialize Terraform
	@echo "$(GREEN)Initializing Terraform...$(NC)"
	cd infrastructure/terraform && $(TERRAFORM) init
	@echo "$(GREEN)Terraform initialized!$(NC)"

.PHONY: infra-plan
infra-plan: ## Plan infrastructure changes
	@echo "$(GREEN)Planning infrastructure changes...$(NC)"
	cd infrastructure/terraform && $(TERRAFORM) plan -var-file=environments/$(ENV)/terraform.tfvars
	@echo "$(GREEN)Infrastructure plan ready!$(NC)"

.PHONY: infra-apply
infra-apply: ## Apply infrastructure changes
	@echo "$(YELLOW)Applying infrastructure changes...$(NC)"
	cd infrastructure/terraform && $(TERRAFORM) apply -var-file=environments/$(ENV)/terraform.tfvars
	@echo "$(GREEN)Infrastructure changes applied!$(NC)"

.PHONY: infra-destroy
infra-destroy: ## Destroy infrastructure
	@echo "$(RED)Destroying infrastructure...$(NC)"
	@read -p "Are you sure? This will destroy all resources! [y/N] " confirm; \
	if [ "$confirm" = "y" ]; then \
		cd infrastructure/terraform && $(TERRAFORM) destroy -var-file=environments/$(ENV)/terraform.tfvars; \
		echo "$(GREEN)Infrastructure destroyed!$(NC)"; \
	else \
		echo "$(YELLOW)Destruction cancelled.$(NC)"; \
	fi

# Kubernetes Commands
.PHONY: k8s-deploy
k8s-deploy: ## Deploy to Kubernetes
	@echo "$(GREEN)Deploying to Kubernetes...$(NC)"
	$(KUBECTL) apply -f infrastructure/kubernetes/namespaces/
	$(KUBECTL) apply -f infrastructure/kubernetes/configmaps/
	$(KUBECTL) apply -f infrastructure/kubernetes/secrets/
	$(KUBECTL) apply -f infrastructure/kubernetes/deployments/
	$(KUBECTL) apply -f infrastructure/kubernetes/services/
	$(KUBECTL) apply -f infrastructure/kubernetes/ingress/
	@echo "$(GREEN)Deployment complete!$(NC)"

.PHONY: k8s-status
k8s-status: ## Check Kubernetes deployment status
	@echo "$(GREEN)Checking deployment status...$(NC)"
	$(KUBECTL) get deployments -n saas-platform
	$(KUBECTL) get pods -n saas-platform
	$(KUBECTL) get services -n saas-platform

.PHONY: k8s-logs-%
k8s-logs-%: ## Get logs for specific service in Kubernetes (e.g., make k8s-logs-user-management)
	$(KUBECTL) logs -f deployment/$* -n saas-platform

.PHONY: k8s-scale-%
k8s-scale-%: ## Scale deployment (e.g., make k8s-scale-user-management REPLICAS=5)
	$(KUBECTL) scale deployment/$* --replicas=$(REPLICAS) -n saas-platform

.PHONY: k8s-rollback-%
k8s-rollback-%: ## Rollback deployment (e.g., make k8s-rollback-user-management)
	$(KUBECTL) rollout undo deployment/$* -n saas-platform

# Monitoring Commands
.PHONY: monitoring-start
monitoring-start: ## Start monitoring stack
	@echo "$(GREEN)Starting monitoring stack...$(NC)"
	$(DOCKER_COMPOSE) -f infrastructure/docker/docker-compose.monitoring.yml up -d
	@echo "$(GREEN)Monitoring stack started!$(NC)"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Grafana: http://localhost:3000 (admin/admin)"
	@echo "  - Jaeger: http://localhost:16686"
	@echo "  - Elasticsearch: http://localhost:9200"
	@echo "  - Kibana: http://localhost:5601"

.PHONY: monitoring-stop
monitoring-stop: ## Stop monitoring stack
	@echo "$(YELLOW)Stopping monitoring stack...$(NC)"
	$(DOCKER_COMPOSE) -f infrastructure/docker/docker-compose.monitoring.yml down
	@echo "$(GREEN)Monitoring stack stopped!$(NC)"

# Utility Commands
.PHONY: clean
clean: ## Clean up generated files and caches
	@echo "$(YELLOW)Cleaning up...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "target" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "bin" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "obj" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name ".coverage" -delete
	@echo "$(GREEN)Cleanup complete!$(NC)"

.PHONY: lint
lint: ## Run linters for all services
	@echo "$(GREEN)Running linters...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Linting $service...$(NC)"; \
		$(MAKE) lint-$service || true; \
	done
	@echo "$(GREEN)Linting complete!$(NC)"

.PHONY: fmt
fmt: ## Format code for all services
	@echo "$(GREEN)Formatting code...$(NC)"
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Formatting $service...$(NC)"; \
		$(MAKE) fmt-$service || true; \
	done
	@echo "$(GREEN)Code formatting complete!$(NC)"

.PHONY: docs
docs: ## Generate documentation
	@echo "$(GREEN)Generating documentation...$(NC)"
	@mkdir -p docs/api
	@for service in $(SERVICES); do \
		echo "$(YELLOW)Generating docs for $service...$(NC)"; \
		$(MAKE) docs-$service || true; \
	done
	@echo "$(GREEN)Documentation generated in ./docs/$(NC)"

.PHONY: setup
setup: install-deps infra-init ## Initial project setup
	@echo "$(GREEN)Setting up project...$(NC)"
	cp .env.example .env
	@echo "$(GREEN)Project setup complete!$(NC)"
	@echo "$(YELLOW)Please edit .env file with your configuration$(NC)"
	@echo "$(YELLOW)Then run 'make dev' to start development environment$(NC)"

.PHONY: health
health: ## Check health of all services
	@echo "$(GREEN)Checking service health...$(NC)"
	@for port in 8010 8020 8030 8040 8050 8060 8070 8080 8090 8100; do \
		curl -f http://localhost:$port/health 2>/dev/null && echo "$(GREEN)✓ Service on port $port is healthy$(NC)" || echo "$(RED)✗ Service on port $port is not responding$(NC)"; \
	done

.PHONY: backup
backup: ## Backup databases
	@echo "$(GREEN)Backing up databases...$(NC)"
	@mkdir -p backups/$(shell date +%Y%m%d)
	$(DOCKER_COMPOSE_DEV) exec user-management-db pg_dump -U userdb user_management > backups/$(shell date +%Y%m%d)/user_management.sql
	$(DOCKER_COMPOSE_DEV) exec inventory-db mysqldump -u inventorydb -pinventorypass inventory > backups/$(shell date +%Y%m%d)/inventory.sql
	$(DOCKER_COMPOSE_DEV) exec financial-db pg_dump -U financedb financial_analytics > backups/$(shell date +%Y%m%d)/financial_analytics.sql
	@echo "$(GREEN)Backup complete! Files saved in ./backups/$(shell date +%Y%m%d)/$(NC)"

.PHONY: restore
restore: ## Restore databases from backup
	@echo "$(YELLOW)Restoring databases from backup...$(NC)"
	@read -p "Enter backup date (YYYYMMDD): " backup_date; \
	$(DOCKER_COMPOSE_DEV) exec -T user-management-db psql -U userdb user_management < backups/$backup_date/user_management.sql; \
	$(DOCKER_COMPOSE_DEV) exec -T inventory-db mysql -u inventorydb -pinventorypass inventory < backups/$backup_date/inventory.sql; \
	$(DOCKER_COMPOSE_DEV) exec -T financial-db psql -U financedb financial_analytics < backups/$backup_date/financial_analytics.sql
	@echo "$(GREEN)Database restore complete!$(NC)"

.PHONY: version
version: ## Show version information
	@echo "Enterprise Multi-Tenant SaaS Platform"
	@echo "Version: 1.0.0"
	@echo "Build Date: $(shell date)"
	@echo ""
	@echo "Service Versions:"
	@$(DOCKER_COMPOSE_DEV) exec user-management python --version 2>/dev/null || echo "User Management: Not running"
	@$(DOCKER_COMPOSE_DEV) exec inventory-management java -version 2>/dev/null || echo "Inventory Management: Not running"
	@$(DOCKER_COMPOSE_DEV) exec document-management dotnet --version 2>/dev/null || echo "Document Management: Not running"

# Default target
.DEFAULT_GOAL := help