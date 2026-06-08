<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/helpers.php";
require_once __DIR__ . "/../config/auth.php";

setCors();

$method = method();
$id     = isset($_GET["id"]) ? (int) $_GET["id"] : null;
$db     = getDb();

if ($id) {
    match ($method) {
        "GET"    => getZone($db, $id),
        "PUT"    => updateZone($db, $id),
        "DELETE" => deleteZone($db, $id),
        default  => jsonError("Method not allowed", 405),
    };
} else {
    match ($method) {
        "GET"  => listZones($db),
        "POST" => createZone($db),
        default => jsonError("Method not allowed", 405),
    };
}

function listZones(PDO $db): void {
    $camera_id = isset($_GET["camera_id"]) ? (int) $_GET["camera_id"] : null;

    if ($camera_id) {
        $stmt = $db->prepare("SELECT * FROM zones WHERE camera_id = ? ORDER BY id ASC");
        $stmt->execute([$camera_id]);
        $rows = $stmt->fetchAll();
    } else {
        $rows = $db->query("SELECT * FROM zones ORDER BY id ASC")->fetchAll();
    }

    foreach ($rows as &$row) {
        $row["id"]        = (int) $row["id"];
        $row["camera_id"] = $row["camera_id"] !== null ? (int) $row["camera_id"] : null;
        $row["points"]    = json_decode($row["points"] ?? "[]", true);
        $row["occupied"]  = (bool) ($row["occupied"] ?? false);
        $row["entry_time"] = $row["entry_time"] ?? null;
    }

    json($rows);
}

function getZone(PDO $db, int $id): void {
    $stmt = $db->prepare("SELECT * FROM zones WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row) jsonError("Zone not found", 404);

    $row["id"]        = (int) $row["id"];
    $row["camera_id"] = $row["camera_id"] !== null ? (int) $row["camera_id"] : null;
    $row["points"]    = json_decode($row["points"] ?? "[]", true);
    $row["occupied"]  = (bool) ($row["occupied"] ?? false);
    $row["entry_time"] = $row["entry_time"] ?? null;

    json($row);
}

function createZone(PDO $db): void {
    $b         = body();
    $slot      = trim($b["slot"]      ?? "");
    $points    = $b["points"]    ?? [];
    $zone_type = trim($b["zone_type"] ?? "parking");
    $camera_id = isset($b["camera_id"]) ? (int) $b["camera_id"] : activeCameraId($db);

    if (!$slot)         jsonError("slot is required");
    if (empty($points)) jsonError("points array is required");

    $check = $db->prepare("SELECT id FROM zones WHERE slot = ? AND camera_id <=> ? LIMIT 1");
    $check->execute([$slot, $camera_id]);
    if ($check->fetch()) jsonError("Slot name '{$slot}' already exists for this camera", 409);

    $stmt = $db->prepare(
        "INSERT INTO zones (camera_id, slot, points, zone_type, created_at)
         VALUES (?, ?, ?, ?, NOW())"
    );
    $stmt->execute([$camera_id, $slot, json_encode($points), $zone_type]);

    json(["id" => (int) $db->lastInsertId()], 201);
}

function updateZone(PDO $db, int $id): void {
    $b         = body();
    $slot      = trim($b["slot"]      ?? "");
    $points    = $b["points"]    ?? [];
    $zone_type = trim($b["zone_type"] ?? "parking");
    $camera_id = isset($b["camera_id"]) ? (int) $b["camera_id"] : activeCameraId($db);

    if (!$slot)         jsonError("slot is required");
    if (empty($points)) jsonError("points array is required");

    $stmt = $db->prepare(
        "UPDATE zones SET camera_id = ?, slot = ?, points = ?, zone_type = ? WHERE id = ?"
    );
    $stmt->execute([$camera_id, $slot, json_encode($points), $zone_type, $id]);

    if ($stmt->rowCount() === 0) jsonError("Zone not found", 404);

    json(["message" => "Zone updated"]);
}

function deleteZone(PDO $db, int $id): void {
    $stmt = $db->prepare("DELETE FROM zones WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) jsonError("Zone not found", 404);

    json(["message" => "Zone deleted"]);
}

function activeCameraId(PDO $db): ?int {
    $row = $db->query("SELECT id FROM cameras WHERE is_active = 1 ORDER BY updated_at DESC, id DESC LIMIT 1")->fetch();
    return $row ? (int) $row["id"] : null;
}
