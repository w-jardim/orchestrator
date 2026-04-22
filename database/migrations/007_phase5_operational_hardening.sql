SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @db_name = DATABASE();

SET @add_deploys_queued_at = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'queued_at'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `queued_at` DATETIME NULL AFTER `updated_at`'
  )
);
PREPARE stmt FROM @add_deploys_queued_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_started_at = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'started_at'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `started_at` DATETIME NULL AFTER `queued_at`'
  )
);
PREPARE stmt FROM @add_deploys_started_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_finished_at = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'finished_at'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `finished_at` DATETIME NULL AFTER `started_at`'
  )
);
PREPARE stmt FROM @add_deploys_finished_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_execution_duration_ms = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'execution_duration_ms'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `execution_duration_ms` BIGINT DEFAULT NULL AFTER `finished_at`'
  )
);
PREPARE stmt FROM @add_deploys_execution_duration_ms;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_last_error_code = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'last_error_code'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `last_error_code` VARCHAR(64) DEFAULT NULL AFTER `error`'
  )
);
PREPARE stmt FROM @add_deploys_last_error_code;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_last_error_details = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'last_error_details'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `last_error_details` JSON DEFAULT NULL AFTER `last_error_code`'
  )
);
PREPARE stmt FROM @add_deploys_last_error_details;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_status_history = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'status_history'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `status_history` JSON DEFAULT NULL AFTER `last_error_details`'
  )
);
PREPARE stmt FROM @add_deploys_status_history;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_reconciled_at = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'reconciled_at'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `reconciled_at` DATETIME NULL AFTER `status_history`'
  )
);
PREPARE stmt FROM @add_deploys_reconciled_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_deploys_retention_until = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND column_name = 'retention_until'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD COLUMN `retention_until` DATETIME NULL AFTER `reconciled_at`'
  )
);
PREPARE stmt FROM @add_deploys_retention_until;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_idx_deploys_finished_at = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND index_name = 'idx_deploys_finished_at'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD KEY `idx_deploys_finished_at` (`finished_at`)'
  )
);
PREPARE stmt FROM @add_idx_deploys_finished_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_idx_deploys_retention_until = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND index_name = 'idx_deploys_retention_until'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD KEY `idx_deploys_retention_until` (`retention_until`)'
  )
);
PREPARE stmt FROM @add_idx_deploys_retention_until;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_idx_deploys_reconciled_at = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db_name
        AND table_name = 'deploys'
        AND index_name = 'idx_deploys_reconciled_at'
    ),
    'SELECT 1',
    'ALTER TABLE `deploys` ADD KEY `idx_deploys_reconciled_at` (`reconciled_at`)'
  )
);
PREPARE stmt FROM @add_idx_deploys_reconciled_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `deploys`
SET
  `queued_at` = COALESCE(`queued_at`, `created_at`),
  `status_history` = COALESCE(
    `status_history`,
    JSON_ARRAY(
      JSON_OBJECT(
        'stage', `status`,
        'timestamp', DATE_FORMAT(COALESCE(`updated_at`, `created_at`), '%Y-%m-%dT%H:%i:%s.000Z'),
        'source', 'migration'
      )
    )
  )
WHERE `queued_at` IS NULL
   OR `status_history` IS NULL;
