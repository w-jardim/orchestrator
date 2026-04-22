SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET @db_name = DATABASE();

SET @default_tenant_id = (
  SELECT `id` FROM `tenants` WHERE `slug` = 'local-default' LIMIT 1
);

SET @add_users_tenant_column = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'users'
        AND column_name = 'tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `tenant_id` BIGINT UNSIGNED DEFAULT NULL AFTER `role`'
  )
);
PREPARE stmt FROM @add_users_tenant_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `users`
SET `tenant_id` = @default_tenant_id
WHERE `role` <> 'ADMIN_MASTER'
  AND `tenant_id` IS NULL;

SET @add_users_tenant_index = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'users'
        AND index_name = 'idx_users_tenant_id'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD KEY `idx_users_tenant_id` (`tenant_id`)'
  )
);
PREPARE stmt FROM @add_users_tenant_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_users_tenant_fk = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.referential_constraints
      WHERE constraint_schema = @db_name
        AND table_name = 'users'
        AND constraint_name = 'fk_users_tenant'
    ),
    'SELECT 1',
    'ALTER TABLE `users` ADD CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL'
  )
);
PREPARE stmt FROM @add_users_tenant_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
