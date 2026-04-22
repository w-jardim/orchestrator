SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

CREATE TABLE IF NOT EXISTS `deploys` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL,
  `image` VARCHAR(255) NOT NULL,
  `status` ENUM('pending','running','success','failed') NOT NULL DEFAULT 'pending',
  `container_id` VARCHAR(128) DEFAULT NULL,
  `ports` JSON DEFAULT NULL,
  `env` JSON DEFAULT NULL,
  `logs` TEXT DEFAULT NULL,
  `error` TEXT DEFAULT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deploys_status` (`status`),
  KEY `idx_deploys_created_by` (`created_by`),
  CONSTRAINT `fk_deploys_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
