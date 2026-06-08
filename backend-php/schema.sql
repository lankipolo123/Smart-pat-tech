-- ============================================================
-- SmartPat — MySQL schema
-- Run this in phpMyAdmin (SQL tab) or via MySQL CLI.
-- ============================================================

CREATE DATABASE IF NOT EXISTS smartpat
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE smartpat;

-- ── Users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name          VARCHAR(255)    NOT NULL,
    email         VARCHAR(255)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    avatar_url    VARCHAR(512)        NULL DEFAULT NULL,
    is_active     TINYINT(1)      NOT NULL DEFAULT 1,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME            NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Cameras ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cameras (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255)    NOT NULL,
    camera_type VARCHAR(50)     NOT NULL COMMENT 'rtsp | ip_camera | usb | video_file',
    config      JSON            NOT NULL,
    is_active   TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Parking Zones ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
    id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    camera_id  INT UNSIGNED        NULL DEFAULT NULL,
    slot       VARCHAR(50)     NOT NULL COMMENT 'e.g. A1, B3',
    points     JSON            NOT NULL COMMENT '[[x,y],[x,y],...]',
    zone_type  VARCHAR(50)     NOT NULL DEFAULT 'parking',
    occupied   TINYINT(1)      NOT NULL DEFAULT 0,
    entry_time DATETIME            NULL DEFAULT NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_zones_camera_slot (camera_id, slot),
    INDEX idx_zones_camera_id (camera_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Parking Sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_sessions (
    id      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    slot    VARCHAR(50)     NOT NULL,
    plate   VARCHAR(30)     NOT NULL,
    status  ENUM('available','occupied','reserved') NOT NULL DEFAULT 'occupied',
    `entry` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `exit`  DATETIME            NULL DEFAULT NULL,
    bill    DECIMAL(10, 2)      NULL DEFAULT NULL,
    PRIMARY KEY (id),
    INDEX idx_ps_slot  (slot),
    INDEX idx_ps_entry (`entry`),
    INDEX idx_ps_exit  (`exit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Video Sources ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_sources (
    id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    camera_id  INT UNSIGNED        NULL DEFAULT NULL,
    name       VARCHAR(255)        NULL DEFAULT NULL,
    type       VARCHAR(50)     NOT NULL COMMENT 'webcam | rtsp | mjpeg | mp4',
    url        VARCHAR(512)        NULL DEFAULT NULL,
    label      VARCHAR(255)        NULL DEFAULT NULL,
    active     TINYINT(1)      NOT NULL DEFAULT 0,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_video_sources_camera_id (camera_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
