# Terraform Variables for Enterprise SaaS Platform

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.27"
}

variable "node_group_desired_capacity" {
  description = "Desired number of nodes"
  type        = map(number)
  default = {
    dev        = 3
    staging    = 5
    production = 10
  }
}

variable "node_group_max_capacity" {
  description = "Maximum number of nodes"
  type        = map(number)
  default = {
    dev        = 5
    staging    = 10
    production = 20
  }
}

variable "node_group_min_capacity" {
  description = "Minimum number of nodes"
  type        = map(number)
  default = {
    dev        = 2
    staging    = 3
    production = 5
  }
}

variable "node_instance_types" {
  description = "EC2 instance types for nodes"
  type        = list(string)
  default     = ["t3.xlarge", "t3a.xlarge"]
}

# Database Configuration
variable "rds_instance_class" {
  description = "RDS instance class by environment"
  type        = map(string)
  default = {
    dev        = "db.t3.medium"
    staging    = "db.t3.large"
    production = "db.r6g.xlarge"
  }
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = map(number)
  default = {
    dev        = 20
    staging    = 50
    production = 100
  }
}

variable "rds_max_allocated_storage" {
  description = "RDS max allocated storage in GB"
  type        = map(number)
  default = {
    dev        = 100
    staging    = 500
    production = 1000
  }
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = map(number)
  default = {
    dev        = 7
    staging    = 14
    production = 30
  }
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = map(string)
  default = {
    dev        = "cache.t3.medium"
    staging    = "cache.r6g.large"
    production = "cache.r6g.xlarge"
  }
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = map(number)
  default = {
    dev        = 1
    staging    = 2
    production = 3
  }
}

# MongoDB/DocumentDB Configuration
variable "documentdb_instance_class" {
  description = "DocumentDB instance class"
  type        = map(string)
  default = {
    dev        = "db.t3.medium"
    staging    = "db.r6g.large"
    production = "db.r6g.xlarge"
  }
}

variable "documentdb_instance_count" {
  description = "Number of DocumentDB instances"
  type        = map(number)
  default = {
    dev        = 1
    staging    = 2
    production = 3
  }
}

# Kafka Configuration
variable "kafka_instance_type" {
  description = "MSK Kafka instance type"
  type        = map(string)
  default = {
    dev        = "kafka.t3.small"
    staging    = "kafka.m5.large"
    production = "kafka.m5.xlarge"
  }
}

variable "kafka_number_of_nodes" {
  description = "Number of Kafka broker nodes"
  type        = map(number)
  default = {
    dev        = 1
    staging    = 3
    production = 3
  }
}

variable "kafka_ebs_volume_size" {
  description = "EBS volume size for Kafka in GB"
  type        = map(number)
  default = {
    dev        = 10
    staging    = 50
    production = 100
  }
}

# ClickHouse Configuration
variable "clickhouse_instance_type" {
  description = "ClickHouse EC2 instance type"
  type        = map(string)
  default = {
    dev        = "t3.large"
    staging    = "r6i.xlarge"
    production = "r6i.2xlarge"
  }
}

variable "clickhouse_instance_count" {
  description = "Number of ClickHouse instances"
  type        = map(number)
  default = {
    dev        = 1
    staging    = 2
    production = 3
  }
}

variable "clickhouse_volume_size" {
  description = "ClickHouse EBS volume size in GB"
  type        = map(number)
  default = {
    dev        = 100
    staging    = 250
    production = 500
  }
}

# Security Configuration
variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

variable "allowed_ip_ranges" {
  description = "IP ranges allowed to access the platform"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = false
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = map(number)
  default = {
    dev        = 7
    staging    = 14
    production = 30
  }
}

# WAF Configuration
variable "waf_rate_limit" {
  description = "WAF rate limit per IP"
  type        = map(number)
  default = {
    dev        = 1000
    staging    = 1500
    production = 2000
  }
}

# Auto Scaling Configuration
variable "enable_autoscaling" {
  description = "Enable auto scaling for services"
  type        = bool
  default     = true
}

variable "autoscaling_target_cpu" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "autoscaling_target_memory" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80
}

# Disaster Recovery Configuration
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "Region for cross-region backups"
  type        = string
  default     = "us-west-2"
}

# Tags
variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "enterprise-saas-platform"
    ManagedBy   = "terraform"
    Team        = "platform-engineering"
  }
}

variable "service_tags" {
  description = "Service-specific tags"
  type        = map(map(string))
  default = {
    user_management = {
      Service = "user-management"
      Stack   = "django"
    }
    inventory_management = {
      Service = "inventory-management"
      Stack   = "spring-boot"
    }
    financial_analytics = {
      Service = "financial-analytics"
      Stack   = "flask"
    }
    document_management = {
      Service = "document-management"
      Stack   = "dotnet"
    }
    communication_hub = {
      Service = "communication-hub"
      Stack   = "phoenix"
    }
    audit_logging = {
      Service = "audit-logging"
      Stack   = "rocket"
    }
    workflow_engine = {
      Service = "workflow-engine"
      Stack   = "rails"
    }
    reporting_service = {
      Service = "reporting-service"
      Stack   = "laravel"
    }
    notification_service = {
      Service = "notification-service"
      Stack   = "cakephp"
    }
    integration_hub = {
      Service = "integration-hub"
      Stack   = "play"
    }
  }
}