SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET @db_name = DATABASE();

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `plan` ENUM('FREE','PRO','ENTERPRISE') NOT NULL DEFAULT 'FREE',
  `status` ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenants_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tenants` (`name`, `slug`, `plan`, `status`)
SELECT 'Local Default', 'local-default', 'ENTERPRISE', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM `tenants` WHERE `slug` = 'local-default'
);

SET @add_audit_tenant_column = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'audit_logs'
        AND column_name = 'tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE `audit_logs` ADD COLUMN `tenant_id` BIGINT UNSIGNED DEFAULT NULL AFTER `user_id`'
  )
);
PREPARE stmt FROM @add_audit_tenant_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_audit_role_column = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'audit_logs'
        AND column_name = 'role'
    ),
    'SELECT 1',
    'ALTER TABLE `audit_logs` ADD COLUMN `role` VARCHAR(32) DEFAULT NULL AFTER `tenant_id`'
  )
);
PREPARE stmt FROM @add_audit_role_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_audit_container_column = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'audit_logs'
        AND column_name = 'container'
    ),
    'SELECT 1',
    'ALTER TABLE `audit_logs` ADD COLUMN `container` VARCHAR(128) DEFAULT NULL AFTER `action`'
  )
);
PREPARE stmt FROM @add_audit_container_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_idx_audit_tenant = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'audit_logs'
        AND index_name = 'idx_audit_tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE `audit_logs` ADD KEY `idx_audit_tenant_id` (`tenant_id`)'
  )
);
PREPARE stmt FROM @add_idx_audit_tenant;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_idx_audit_role = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'audit_logs'
        AND index_name = 'idx_audit_role'
    ),
    'SELECT 1',
    'ALTER TABLE `audit_logs` ADD KEY `idx_audit_role` (`role`)'
  )
);
PREPARE stmt FROM @add_idx_audit_role;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_idx_audit_container = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'audit_logs'
        AND index_name = 'idx_audit_container'
    ),
    'SELECT 1',
    'ALTER TABLE `audit_logs` ADD KEY `idx_audit_container` (`container`)'
  )
);
PREPARE stmt FROM @add_idx_audit_container;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
