-- SP-Manager Remote Printing v2: Received status, Retry / Reprint, device status, configurable waiting time.
-- BACK UP THE DATABASE FIRST. Additive only: no table, column or record is removed or renamed.
-- Safe to run more than once (MariaDB 10.5+). Needs remote-printing-v1.sql to be installed.

-- New status RECEIVED (the print PC has the job, printing not started). Existing values keep their meaning.
ALTER TABLE `sp_print_jobs`
  MODIFY COLUMN `status` enum('QUEUED','PRINTING','PRINTED','FAILED','CANCELLED','EXPIRED','RECEIVED') NOT NULL DEFAULT 'QUEUED';

-- Retry / Reprint: link to the original job, and a key that stops the same request being sent twice.
ALTER TABLE `sp_print_jobs`
  ADD COLUMN IF NOT EXISTS `retry_of_job_id` bigint(20) UNSIGNED DEFAULT NULL AFTER `requested_by`,
  ADD COLUMN IF NOT EXISTS `request_key` char(64) DEFAULT NULL AFTER `retry_of_job_id`;
ALTER TABLE `sp_print_jobs`
  ADD UNIQUE KEY IF NOT EXISTS `uq_print_job_request` (`request_key`),
  ADD KEY IF NOT EXISTS `idx_print_job_document` (`outlet_id`,`document_type`,`document_id`,`status`);

-- Device status reported by the Local Agent 1.4+ (Windows version, uptime, CPU, RAM, Print Spooler),
-- and the PC's name in Chrome Remote Desktop (Remote PC tab).
ALTER TABLE `sp_print_agents`
  ADD COLUMN IF NOT EXISTS `device_json` longtext DEFAULT NULL AFTER `printers_json`,
  ADD COLUMN IF NOT EXISTS `remote_name` varchar(120) DEFAULT NULL AFTER `device_json`;
