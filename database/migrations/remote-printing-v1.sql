-- SP-Manager Remote Printing (Phase 2): registered print PCs and the print job queue.
-- Back up the database first. Safe to run more than once; no existing table or record is changed.

-- One row per Windows PC that runs the SP-Manager Local Agent for remote printing.
-- status PENDING = pairing code issued, not yet used; ACTIVE = paired; REVOKED = removed by a manager.
-- Only SHA-256 hashes of the pairing code and the agent token are stored.
CREATE TABLE IF NOT EXISTS `sp_print_agents` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `agent_name` varchar(120) NOT NULL,
  `machine_name` varchar(120) DEFAULT NULL,
  `status` enum('PENDING','ACTIVE','REVOKED') NOT NULL DEFAULT 'PENDING',
  `pairing_code_hash` char(64) DEFAULT NULL,
  `pairing_expires_at` datetime DEFAULT NULL,
  `token_hash` char(64) DEFAULT NULL,
  `agent_version` varchar(30) DEFAULT NULL,
  `printers_json` longtext DEFAULT NULL,
  `last_seen_at` datetime DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_print_agent_token` (`token_hash`),
  UNIQUE KEY `uq_print_agent_pairing` (`pairing_code_hash`),
  KEY `idx_print_agent_outlet` (`outlet_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Print jobs. content_html is the document rendered with the same template as local printing;
-- it is cleared once the job finishes, so history keeps only the metadata.
CREATE TABLE IF NOT EXISTS `sp_print_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `agent_id` bigint(20) UNSIGNED NOT NULL,
  `printer_name` varchar(190) NOT NULL,
  `document_type` varchar(30) NOT NULL,
  `document_id` varchar(64) DEFAULT NULL,
  `document_no` varchar(80) DEFAULT NULL,
  `paper_size` enum('A4','A5') NOT NULL,
  `copies` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `content_html` mediumtext DEFAULT NULL,
  `status` enum('QUEUED','PRINTING','PRINTED','FAILED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'QUEUED',
  `error_message` varchar(500) DEFAULT NULL,
  `requested_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `claimed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_print_job_agent_queue` (`agent_id`,`status`,`id`),
  KEY `idx_print_job_outlet_history` (`outlet_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
