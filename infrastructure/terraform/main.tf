# Enterprise Multi-Tenant SaaS Platform - Main Terraform Configuration
# Version: 1.0.0
# Provider: AWS (configurable for Azure/GCP)

terraform {
  required_version = ">= 1.3.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  
  backend "s3" {
    bucket         = "enterprise-saas-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Provider Configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "enterprise-saas-platform"
      ManagedBy   = "terraform"
      CostCenter  = var.cost_center
    }
  }
}

# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  environment             = var.environment
  vpc_cidr               = var.vpc_cidr
  availability_zones     = data.aws_availability_zones.available.names
  private_subnet_cidrs   = var.private_subnet_cidrs
  public_subnet_cidrs    = var.public_subnet_cidrs
  database_subnet_cidrs  = var.database_subnet_cidrs
  enable_nat_gateway     = var.enable_nat_gateway
  single_nat_gateway     = var.environment != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true
  
  tags = {
    Name = "${var.environment}-vpc"
  }
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"
  
  cluster_name        = "${var.environment}-saas-cluster"
  cluster_version     = var.kubernetes_version
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  
  # Node Groups
  node_groups = {
    general = {
      desired_capacity = var.environment == "production" ? 5 : 3
      max_capacity     = var.environment == "production" ? 10 : 5
      min_capacity     = var.environment == "production" ? 3 : 2
      instance_types   = ["t3.xlarge", "t3a.xlarge"]
      
      labels = {
        Environment = var.environment
        NodeType    = "general"
      }
      
      taints = []
    }
    
    compute = {
      desired_capacity = var.environment == "production" ? 3 : 2
      max_capacity     = var.environment == "production" ? 6 : 3
      min_capacity     = var.environment == "production" ? 2 : 1
      instance_types   = ["c5.2xlarge", "c5a.2xlarge"]
      
      labels = {
        Environment = var.environment
        NodeType    = "compute"
      }
      
      taints = [
        {
          key    = "compute"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }
  
  # OIDC Provider for IRSA
  enable_irsa = true
  
  # Cluster Addons
  cluster_addons = {
    coredns = {
      addon_version = "v1.10.1-eksbuild.1"
    }
    kube-proxy = {
      addon_version = "v1.27.1-eksbuild.1"
    }
    vpc-cni = {
      addon_version = "v1.12.6-eksbuild.2"
    }
    aws-ebs-csi-driver = {
      addon_version = "v1.19.0-eksbuild.2"
    }
  }
}

# RDS PostgreSQL Instances
module "rds_user_management" {
  source = "./modules/rds"
  
  identifier     = "${var.environment}-user-management-db"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = var.environment == "production" ? "db.r6g.xlarge" : "db.t3.medium"
  
  allocated_storage     = var.environment == "production" ? 100 : 20
  max_allocated_storage = var.environment == "production" ? 1000 : 100
  storage_encrypted     = true
  storage_type          = "gp3"
  
  database_name = "user_management"
  username      = "dbadmin"
  port          = 5432
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  
  multi_az               = var.environment == "production"
  create_read_replica    = var.environment == "production"
  read_replica_count     = var.environment == "production" ? 2 : 0
  
  performance_insights_enabled = var.environment == "production"
  monitoring_interval         = var.environment == "production" ? 60 : 0
  
  tags = {
    Service = "user-management"
  }
}

module "rds_financial_analytics" {
  source = "./modules/rds"
  
  identifier     = "${var.environment}-financial-analytics-db"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = var.environment == "production" ? "db.r6g.2xlarge" : "db.t3.large"
  
  allocated_storage     = var.environment == "production" ? 200 : 50
  max_allocated_storage = var.environment == "production" ? 2000 : 200
  storage_encrypted     = true
  storage_type          = "gp3"
  
  database_name = "financial_analytics"
  username      = "dbadmin"
  port          = 5432
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  deletion_protection     = var.environment == "production"
  multi_az               = var.environment == "production"
  
  tags = {
    Service = "financial-analytics"
  }
}

# MySQL for Inventory Management
module "mysql_inventory" {
  source = "./modules/rds"
  
  identifier     = "${var.environment}-inventory-db"
  engine         = "mysql"
  engine_version = "8.0.35"
  instance_class = var.environment == "production" ? "db.r6g.large" : "db.t3.medium"
  
  allocated_storage = var.environment == "production" ? 100 : 20
  storage_encrypted = true
  
  database_name = "inventory"
  username      = "dbadmin"
  port          = 3306
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  multi_az               = var.environment == "production"
  
  tags = {
    Service = "inventory-management"
  }
}

# DocumentDB (MongoDB) for Document Management
module "documentdb" {
  source = "./modules/documentdb"
  
  cluster_identifier = "${var.environment}-document-db"
  engine_version     = "5.0.0"
  instance_class     = var.environment == "production" ? "db.r6g.large" : "db.t3.medium"
  instance_count     = var.environment == "production" ? 3 : 1
  
  master_username = "docdbadmin"
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  preferred_backup_window = "03:00-04:00"
  
  tls_enabled = true
  
  tags = {
    Service = "document-management"
  }
}

# ElastiCache Redis for Communication Hub & Caching
module "redis" {
  source = "./modules/redis"
  
  cluster_id           = "${var.environment}-redis-cluster"
  engine_version       = "7.0"
  node_type           = var.environment == "production" ? "cache.r6g.xlarge" : "cache.t3.medium"
  num_cache_nodes     = var.environment == "production" ? 3 : 1
  parameter_group_family = "redis7"
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-04:00"
  
  tags = {
    Service = "communication-hub"
  }
}

# ClickHouse for Audit Logging (using EC2)
module "clickhouse" {
  source = "./modules/clickhouse"
  
  cluster_name    = "${var.environment}-clickhouse"
  instance_type   = var.environment == "production" ? "r6i.2xlarge" : "t3.large"
  instance_count  = var.environment == "production" ? 3 : 1
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  volume_size = var.environment == "production" ? 500 : 100
  volume_type = "gp3"
  
  enable_monitoring = var.environment == "production"
  
  tags = {
    Service = "audit-logging"
  }
}

# Cassandra for Integration Hub (using AWS Keyspaces)
resource "aws_keyspaces_keyspace" "integration_hub" {
  name = "${var.environment}_integration_hub"
  
  tags = {
    Service = "integration-hub"
  }
}

resource "aws_keyspaces_table" "integrations" {
  keyspace_name = aws_keyspaces_keyspace.integration_hub.name
  table_name    = "integrations"
  
  schema_definition {
    column {
      name = "tenant_id"
      type = "text"
    }
    column {
      name = "integration_id"
      type = "uuid"
    }
    column {
      name = "data"
      type = "text"
    }
    column {
      name = "created_at"
      type = "timestamp"
    }
    
    partition_key {
      name = "tenant_id"
    }
    
    clustering_key {
      name     = "integration_id"
      order_by = "ASC"
    }
  }
  
  ttl {
    status = "ENABLED"
  }
  
  point_in_time_recovery {
    status = "ENABLED"
  }
  
  encryption_specification {
    type = "AWS_OWNED_KMS_KEY"
  }
  
  capacity_specification {
    throughput_mode = var.environment == "production" ? "PAY_PER_REQUEST" : "PROVISIONED"
    
    read_capacity_units  = var.environment == "production" ? 0 : 10
    write_capacity_units = var.environment == "production" ? 0 : 10
  }
  
  tags = {
    Service = "integration-hub"
  }
}

# S3 Buckets
module "s3_buckets" {
  source = "./modules/s3"
  
  environment = var.environment
  
  buckets = {
    documents = {
      name = "${var.environment}-saas-documents"
      versioning = true
      lifecycle_rules = [
        {
          id      = "archive-old-documents"
          enabled = true
          transition = [
            {
              days          = 90
              storage_class = "STANDARD_IA"
            },
            {
              days          = 365
              storage_class = "GLACIER"
            }
          ]
        }
      ]
    }
    
    backups = {
      name = "${var.environment}-saas-backups"
      versioning = true
      lifecycle_rules = [
        {
          id      = "delete-old-backups"
          enabled = true
          expiration = {
            days = var.environment == "production" ? 90 : 30
          }
        }
      ]
    }
    
    logs = {
      name = "${var.environment}-saas-logs"
      lifecycle_rules = [
        {
          id      = "delete-old-logs"
          enabled = true
          expiration = {
            days = var.environment == "production" ? 30 : 7
          }
        }
      ]
    }
    
    ml_models = {
      name = "${var.environment}-saas-ml-models"
      versioning = true
    }
  }
  
  enable_encryption = true
  enable_logging    = true
  
  tags = {
    Purpose = "storage"
  }
}

# Kafka MSK Cluster
module "kafka" {
  source = "./modules/msk"
  
  cluster_name    = "${var.environment}-saas-kafka"
  kafka_version   = "3.4.0"
  instance_type   = var.environment == "production" ? "kafka.m5.xlarge" : "kafka.t3.small"
  number_of_nodes = var.environment == "production" ? 3 : 1
  
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.cluster_security_group_id]
  
  ebs_volume_size = var.environment == "production" ? 100 : 10
  
  encryption_in_transit = {
    client_broker = "TLS"
    in_cluster    = true
  }
  
  server_properties = {
    "auto.create.topics.enable"  = true
    "default.replication.factor" = var.environment == "production" ? 3 : 1
    "min.insync.replicas"        = var.environment == "production" ? 2 : 1
    "num.partitions"              = var.environment == "production" ? 3 : 1
  }
  
  tags = {
    Purpose = "event-streaming"
  }
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  name               = "${var.environment}-saas-alb"
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.public_subnet_ids
  
  enable_deletion_protection = var.environment == "production"
  enable_http2              = true
  enable_cross_zone_load_balancing = true
  
  access_logs = {
    bucket  = module.s3_buckets.log_bucket_name
    enabled = true
    prefix  = "alb"
  }
  
  ssl_policy      = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn = var.certificate_arn
  
  tags = {
    Purpose = "ingress"
  }
}

# WAF for API Protection
module "waf" {
  source = "./modules/waf"
  
  name        = "${var.environment}-saas-waf"
  environment = var.environment
  
  alb_arn = module.alb.arn
  
  rate_limit = var.environment == "production" ? 2000 : 1000
  
  ip_rate_based_rule = {
    name     = "RateLimitRule"
    priority = 1
    limit    = 2000
    action   = "BLOCK"
  }
  
  managed_rules = [
    {
      name            = "AWSManagedRulesCommonRuleSet"
      priority        = 10
      override_action = "NONE"
    },
    {
      name            = "AWSManagedRulesKnownBadInputsRuleSet"
      priority        = 20
      override_action = "NONE"
    },
    {
      name            = "AWSManagedRulesSQLiRuleSet"
      priority        = 30
      override_action = "NONE"
    }
  ]
  
  tags = {
    Purpose = "security"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  for_each = toset([
    "user-management",
    "inventory-management",
    "financial-analytics",
    "document-management",
    "communication-hub",
    "audit-logging",
    "workflow-engine",
    "reporting-service",
    "notification-service",
    "integration-hub"
  ])
  
  name              = "/aws/saas/${var.environment}/${each.key}"
  retention_in_days = var.environment == "production" ? 30 : 7
  
  kms_key_id = aws_kms_key.logs.arn
  
  tags = {
    Service = each.key
  }
}

# KMS Keys
resource "aws_kms_key" "master" {
  description             = "Master KMS key for ${var.environment} SaaS platform"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = {
    Purpose = "encryption"
  }
}

resource "aws_kms_key" "logs" {
  description             = "KMS key for CloudWatch logs encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Purpose = "log-encryption"
  }
}

# Secrets Manager for Database Passwords
resource "aws_secretsmanager_secret" "db_passwords" {
  for_each = {
    user_management     = module.rds_user_management.db_password
    financial_analytics = module.rds_financial_analytics.db_password
    inventory          = module.mysql_inventory.db_password
    document_db        = module.documentdb.master_password
  }
  
  name = "${var.environment}-${replace(each.key, "_", "-")}-db-password"
  
  rotation_rules {
    automatically_after_days = 30
  }
  
  tags = {
    Service = each.key
  }
}

# Outputs
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC ID"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS cluster endpoint"
  sensitive   = true
}

output "eks_cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS cluster name"
}

output "alb_dns_name" {
  value       = module.alb.dns_name
  description = "ALB DNS name"
}

output "database_endpoints" {
  value = {
    user_management     = module.rds_user_management.endpoint
    financial_analytics = module.rds_financial_analytics.endpoint
    inventory          = module.mysql_inventory.endpoint
    document_db        = module.documentdb.endpoint
    redis              = module.redis.endpoint
    clickhouse         = module.clickhouse.endpoints
  }
  description = "Database endpoints"
  sensitive   = true
}

output "s3_buckets" {
  value = {
    documents = module.s3_buckets.document_bucket_name
    backups   = module.s3_buckets.backup_bucket_name
    logs      = module.s3_buckets.log_bucket_name
    ml_models = module.s3_buckets.ml_model_bucket_name
  }
  description = "S3 bucket names"
}

output "kafka_bootstrap_servers" {
  value       = module.kafka.bootstrap_servers
  description = "Kafka bootstrap servers"
  sensitive   = true
}