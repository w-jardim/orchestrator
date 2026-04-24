-- Create tenants table
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `plan` ENUM('FREE', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'FREE',
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN_MASTER', 'ADMIN', 'OPERATOR', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
  `tenant_id` INT,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  KEY `idx_email` (`email`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create projetos table
CREATE TABLE IF NOT EXISTS `projetos` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `descricao` TEXT,
  `slug` VARCHAR(100) NOT NULL,
  `status` ENUM('criacao', 'configuracao', 'ativo', 'pausado', 'deletado') NOT NULL DEFAULT 'criacao',
  `tipo` ENUM('nodejs', 'python', 'docker', 'static', 'custom') NOT NULL DEFAULT 'custom',
  `created_by` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_tenant_slug` (`tenant_id`, `slug`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ambientes table
CREATE TABLE IF NOT EXISTS `ambientes` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projeto_id` INT NOT NULL,
  `tenant_id` INT NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `tipo` ENUM('desenvolvimento', 'staging', 'producao') NOT NULL,
  `porta` INT,
  `dominio` VARCHAR(255),
  `status` ENUM('ativo', 'pausado', 'deletado') NOT NULL DEFAULT 'ativo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_projeto_slug` (`projeto_id`, `slug`),
  FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  KEY `idx_projeto_id` (`projeto_id`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create componentes table
CREATE TABLE IF NOT EXISTS `componentes` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projeto_id` INT NOT NULL,
  `tenant_id` INT NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `configuracao` JSON,
  `status` ENUM('ativo', 'inativo', 'erro') NOT NULL DEFAULT 'inativo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_projeto_slug` (`projeto_id`, `slug`),
  FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  KEY `idx_projeto_id` (`projeto_id`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create deploys table
CREATE TABLE IF NOT EXISTS `deploys` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projeto_id` INT NOT NULL,
  `ambiente_id` INT,
  `tenant_id` INT NOT NULL,
  `versao` VARCHAR(50),
  `status` ENUM('pendente', 'em_progresso', 'sucesso', 'falha', 'cancelado') NOT NULL DEFAULT 'pendente',
  `mensagem` TEXT,
  `created_by` INT,
  `started_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ambiente_id`) REFERENCES `ambientes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_projeto_id` (`projeto_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `user_id` INT,
  `role` VARCHAR(50),
  `action` VARCHAR(100) NOT NULL,
  `container` VARCHAR(255),
  `resource` VARCHAR(255),
  `payload` JSON,
  `status` ENUM('success', 'failure') NOT NULL DEFAULT 'success',
  `ip_address` VARCHAR(45),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
