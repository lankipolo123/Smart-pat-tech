<?php
function loadEnv(string $path): void {
    if (!file_exists($path)) return;

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === "" || str_starts_with($line, "#")) continue;
        if (!str_contains($line, "=")) continue;

        [$key, $value] = explode("=", $line, 2);
        $key   = trim($key);
        $value = trim($value, " \t\"'");

        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}

// Load .env from project root (one level up from config/)
loadEnv(__DIR__ . "/../.env");

function getDb(): PDO {
    $host   = $_ENV["DB_HOST"]   ?? "localhost";
    $dbname = $_ENV["DB_NAME"]   ?? "smartpat";
    $user   = $_ENV["DB_USER"]   ?? "root";
    $pass   = $_ENV["DB_PASS"]   ?? "";
    $dsn    = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    ensureSmartPatSchema($pdo, $dbname);
    return $pdo;
}

function ensureSmartPatSchema(PDO $db, string $dbname): void {
    ensureColumn($db, $dbname, "zones", "camera_id", "INT UNSIGNED NULL DEFAULT NULL");
    ensureColumn($db, $dbname, "zones", "occupied", "TINYINT(1) NOT NULL DEFAULT 0");
    ensureColumn($db, $dbname, "zones", "entry_time", "DATETIME NULL DEFAULT NULL");
    dropSlotOnlyUniqueIndex($db, $dbname);
    ensureIndex($db, $dbname, "zones", "idx_zones_camera_id", "(camera_id)");

    ensureColumn($db, $dbname, "video_sources", "camera_id", "INT UNSIGNED NULL DEFAULT NULL");
    ensureColumn($db, $dbname, "video_sources", "name", "VARCHAR(255) NULL DEFAULT NULL");
    ensureIndex($db, $dbname, "video_sources", "idx_video_sources_camera_id", "(camera_id)");
}

function ensureColumn(PDO $db, string $dbname, string $table, string $column, string $definition): void {
    $stmt = $db->prepare("
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        LIMIT 1
    ");
    $stmt->execute([$dbname, $table, $column]);
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
    }
}

function ensureIndex(PDO $db, string $dbname, string $table, string $index, string $definition): void {
    $stmt = $db->prepare("
        SELECT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?
        LIMIT 1
    ");
    $stmt->execute([$dbname, $table, $index]);
    if (!$stmt->fetch()) {
        $db->exec("ALTER TABLE `{$table}` ADD INDEX `{$index}` {$definition}");
    }
}

function dropSlotOnlyUniqueIndex(PDO $db, string $dbname): void {
    $stmt = $db->prepare("
        SELECT
            INDEX_NAME,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_csv,
            MAX(NON_UNIQUE) AS non_unique
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'zones'
          AND INDEX_NAME <> 'PRIMARY'
        GROUP BY INDEX_NAME
    ");
    $stmt->execute([$dbname]);
    foreach ($stmt->fetchAll() as $idx) {
        if ((int) $idx["non_unique"] === 0 && $idx["columns_csv"] === "slot") {
            $db->exec("ALTER TABLE zones DROP INDEX `{$idx["INDEX_NAME"]}`");
        }
    }
}
