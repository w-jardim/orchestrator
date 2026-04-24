-- Migration 008: Projetos, Ambientes e Componentes
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ─── PROJETOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `projetos` (
  `id`          BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `tenant_id`   BIGINT UNSIGNED   NOT NULL,
  `nome`        VARCHAR(255)      NOT NULL,
  `descricao`   TEXT,
  `slug`        VARCHAR(255)      NOT NULL,
  `status`      ENUM('criacao','configuracao','ativo','pausado','deletado')
                                  NOT NULL DEFAULT 'criacao',
  `tipo`        ENUM('nodejs','python','docker','static','custom')
                                  NOT NULL DEFAULT 'custom',
  `created_by`  BIGINT UNSIGNED,
  `created_at`  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projetos_tenant_slug` (`tenant_id`, `slug`),
  KEY `idx_projetos_status` (`status`),
  KEY `idx_projetos_tipo` (`tipo`),
  CONSTRAINT `fk_projetos_tenant`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_projetos_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AMBIENTES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ambientes` (
  `id`            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `projeto_id`    BIGINT UNSIGNED   NOT NULL,
  `nome`          VARCHAR(120)      NOT NULL,
  `slug`          VARCHAR(120)      NOT NULL,
  `tipo`          ENUM('development','staging','production')
                                    NOT NULL,
  `porta`         INT UNSIGNED,
  `dominio`       VARCHAR(255),
  `created_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ambientes_projeto_slug` (`projeto_id`, `slug`),
  CONSTRAINT `fk_ambientes_projeto`
    FOREIGN KEY (`projeto_id`) REFERENCES `projetos` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── COMPONENTES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `componentes` (
  `id`            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `projeto_id`    BIGINT UNSIGNED   NOT NULL,
  `nome`          VARCHAR(120)      NOT NULL,
  `slug`          VARCHAR(120)      NOT NULL,
  `tipo`          ENUM('frontend','backend','worker','database','cache','other')
                                    NOT NULL,
  `status`        ENUM('planejado','ativo','pausado','deletado')
                                    NOT NULL DEFAULT 'planejado',
  `created_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_componentes_projeto_slug` (`projeto_id`, `slug`),
  CONSTRAINT `fk_componentes_projeto`
    FOREIGN KEY (`projeto_id`) REFERENCES `projetos` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
