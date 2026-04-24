SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE `audit_logs`
  ADD COLUMN `role` VARCHAR(32) DEFAULT NULL AFTER `user_id`,
  ADD COLUMN `container` VARCHAR(128) DEFAULT NULL AFTER `action`;

ALTER TABLE `audit_logs`
  ADD KEY `idx_audit_role` (`role`),
  ADD KEY `idx_audit_container` (`container`);
