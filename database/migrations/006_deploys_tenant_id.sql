SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET @db_name = DATABASE();

SET @default_tenant_id = (
  SELECT `id` FROM `tenants` WHERE `slug` = 'local-default' LIMIT 1
);

SET @add_deploys_tenant_column = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `tenant_id` BIGINT UNSIGNED DEFAULT NULL AFTER `id`'
  )
);
PREPARE stmt FROM @add_deploys_tenant_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_container_name = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'container_name'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `container_name` VARCHAR(191) DEFAULT NULL AFTER `container_id`'
  )
);
PREPARE stmt FROM @add_deploys_container_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_container_alias = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'container_alias'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `container_alias` VARCHAR(128) DEFAULT NULL AFTER `container_name`'
  )
);
PREPARE stmt FROM @add_deploys_container_alias;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `deploys` d
LEFT JOIN `users` u ON u.`id` = d.`created_by`
SET
  d.`tenant_id` = COALESCE(u.`tenant_id`, @default_tenant_id),
  d.`container_alias` = COALESCE(d.`container_alias`, d.`name`),
  d.`container_name` = COALESCE(
    d.`container_name`,
    CONCAT('plagard-', COALESCE(u.`tenant_id`, @default_tenant_id), '-', d.`name`)
  )
WHERE d.`tenant_id` IS NULL
   OR d.`container_name` IS NULL
   OR d.`container_alias` IS NULL;

SET @add_deploys_tenant_index = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND index_name = 'idx_deploys_tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD KEY `idx_deploys_tenant_id` (`tenant_id`)'
  )
);
PREPARE stmt FROM @add_deploys_tenant_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_tenant_name_unique = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND index_name = 'uq_deploys_tenant_name'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD CONSTRAINT `uq_deploys_tenant_name` UNIQUE (`tenant_id`, `name`)'
  )
);
PREPARE stmt FROM @add_deploys_tenant_name_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_tenant_fk = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.referential_constraints
      WHERE constraint_schema = @db_name
        AND table_name = 'deploys'
        AND constraint_name = 'fk_deploys_tenant'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD CONSTRAINT `fk_deploys_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE'
  )
);
PREPARE stmt FROM @add_deploys_tenant_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
