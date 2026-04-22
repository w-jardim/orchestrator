-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: Schema inicial do Plagard Orchestrator
-- ─────────────────────────────────────────────────────────────────────────────

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(120)      NOT NULL,
  `email`         VARCHAR(255)      NOT NULL,
  `password_hash` VARCHAR(255)      NOT NULL,
  `role`          ENUM('ADMIN_MASTER','ADMIN','OPERATOR','VIEWER')
                                    NOT NULL DEFAULT 'VIEWER',
  `active`        TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED          DEFAULT NULL,
  `action`     VARCHAR(120)    NOT NULL,
  `resource`   VARCHAR(120)             DEFAULT NULL,
  `payload`    JSON                     DEFAULT NULL,
  `status`     ENUM('success','failure','pending')
                               NOT NULL DEFAULT 'success',
  `ip_address` VARCHAR(45)              DEFAULT NULL,
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user_id` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created_at` (`created_at`),
  CONSTRAINT `fk_audit_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SEED: admin master padrão ────────────────────────────────────────────────
-- Senha padrão: Admin@1234 (troque imediatamente em produção)
-- Hash gerado com bcrypt rounds=12
INSERT IGNORE INTO `users` (`name`, `email`, `password_hash`, `role`) VALUES
(
  'Admin Master',
  'admin@plagard.local',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR4q4c4zvQ/O2',
  'ADMIN_MASTER'
);

SET foreign_key_checks = 1;
