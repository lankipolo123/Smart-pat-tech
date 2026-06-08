<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/helpers.php";
require_once __DIR__ . "/../config/auth.php";

setCors();

$method = method();
$id     = isset($_GET["id"])     ? (int) $_GET["id"] : null;
$action = $_GET["action"] ?? null;
$db     = getDb();

// ── Router ─────────────────────────────────────────────────────────────────
if ($id && $action === "activate") {
    activateCamera($db, $id);
} elseif ($id) {
    match ($method) {
        "GET"    => getCamera($db, $id),
        "PUT"    => updateCamera($db, $id),
        "DELETE" => deleteCamera($db, $id),
        default  => jsonError("Method not allowed", 405),
    };
} else {
    match ($method) {
        "GET"  => listCameras($db),
        "POST" => createCamera($db),
        default => jsonError("Method not allowed", 405),
    };
}

// ── GET /cameras ───────────────────────────────────────────────────────────
function listCameras(PDO $db): void {
    $rows = $db->query("SELECT * FROM cameras ORDER BY created_at DESC")->fetchAll();

    foreach ($rows as &$row) {
        $row["id"]        = (int) $row["id"];
        $row["is_active"] = (int) $row["is_active"];
        $row["config"]    = json_decode($row["config"] ?? "{}", true);
    }

    json($rows);
}

// ── GET /cameras/{id} ─────────────────────────────────────────────────────
function getCamera(PDO $db, int $id): void {
    $stmt = $db->prepare("SELECT * FROM cameras WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row) jsonError("Camera not found", 404);

    $row["id"]        = (int) $row["id"];
    $row["is_active"] = (int) $row["is_active"];
    $row["config"]    = json_decode($row["config"] ?? "{}", true);

    json($row);
}

// ── POST /cameras ──────────────────────────────────────────────────────────
function createCamera(PDO $db): void {
    $b    = body();
    $name = trim($b["name"]        ?? "");
    $type = trim($b["camera_type"] ?? "");
    $conf = $b["config"] ?? [];

    if (!$name) jsonError("name is required");
    if (!$type) jsonError("camera_type is required");

    $validTypes = ["rtsp", "ip_camera", "usb", "video_file"];
    if (!in_array($type, $validTypes)) {
        jsonError("camera_type must be one of: " . implode(", ", $validTypes));
    }

    $stmt = $db->prepare(
        "INSERT INTO cameras (name, camera_type, config, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 0, NOW(), NOW())"
    );
    $stmt->execute([$name, $type, json_encode($conf)]);
    $cameraId = (int) $db->lastInsertId();
    upsertVideoSource($db, $cameraId, $name, $type, $conf, 0);

    json(["id" => $cameraId, "message" => "Camera created"], 201);
}

// ── PUT /cameras/{id} ─────────────────────────────────────────────────────
function updateCamera(PDO $db, int $id): void {
    $b    = body();
    $name = trim($b["name"]        ?? "");
    $type = trim($b["camera_type"] ?? "");
    $conf = $b["config"] ?? [];

    if (!$name) jsonError("name is required");
    if (!$type) jsonError("camera_type is required");

    $stmt = $db->prepare(
        "UPDATE cameras
         SET name = ?, camera_type = ?, config = ?, updated_at = NOW()
         WHERE id = ?"
    );
    $stmt->execute([$name, $type, json_encode($conf), $id]);

    if ($stmt->rowCount() === 0) jsonError("Camera not found", 404);

    $active = (int) $db->query("SELECT is_active FROM cameras WHERE id = " . (int) $id)->fetchColumn();
    upsertVideoSource($db, $id, $name, $type, $conf, $active);

    json(["message" => "Camera updated"]);
}

// ── DELETE /cameras/{id} ──────────────────────────────────────────────────
function deleteCamera(PDO $db, int $id): void {
    $stmt = $db->prepare("DELETE FROM cameras WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) jsonError("Camera not found", 404);

    $db->prepare("DELETE FROM video_sources WHERE camera_id = ?")->execute([$id]);

    json(["message" => "Camera deleted"]);
}

// ── POST /cameras/{id}/activate ───────────────────────────────────────────
function activateCamera(PDO $db, int $id): void {
    if (method() !== "POST") jsonError("Method not allowed", 405);

    $check = $db->prepare("SELECT * FROM cameras WHERE id = ? LIMIT 1");
    $check->execute([$id]);
    $camera = $check->fetch();
    if (!$camera) jsonError("Camera not found", 404);

    // Deactivate all, then activate this one
    $db->exec("UPDATE cameras SET is_active = 0");
    $db->prepare("UPDATE cameras SET is_active = 1, updated_at = NOW() WHERE id = ?")
       ->execute([$id]);
    $db->exec("UPDATE video_sources SET active = 0");

    $config = json_decode($camera["config"] ?? "{}", true) ?: [];
    upsertVideoSource($db, $id, $camera["name"], $camera["camera_type"], $config, 1);
    notifyFastAPICamera($id, $camera["camera_type"], $config);

    json(["ok" => true, "message" => "Camera activated"]);
}

function cameraSwitchPayload(string $type, array $config): ?array {
    if ($type === "usb") {
        $index = $config["usbDevice"] ?? "0";
        $index = str_replace("/dev/video", "", (string) $index);
        return ["type" => "webcam", "url" => $index !== "" ? $index : "0"];
    }

    if ($type === "video_file" && !empty($config["videoFile"])) {
        return ["type" => "mp4", "url" => $config["videoFile"]];
    }

    if ($type === "rtsp" && !empty($config["rtspUrl"])) {
        return ["type" => "rtsp", "url" => $config["rtspUrl"]];
    }

    if ($type === "ip_camera" && !empty($config["cameraIp"])) {
        $user = $config["rtspUser"] ?? "";
        $pass = $config["rtspPassword"] ?? "";
        $port = $config["rtspPort"] ?? "554";
        $path = trim(explode(",", $config["rtspPaths"] ?? "stream1")[0]);
        $creds = $user !== "" ? rawurlencode($user) . ":" . rawurlencode($pass) . "@" : "";
        return ["type" => "rtsp", "url" => "rtsp://{$creds}{$config["cameraIp"]}:{$port}/{$path}"];
    }

    return null;
}

function upsertVideoSource(PDO $db, int $cameraId, string $name, string $type, array $config, int $active): void {
    $payload = cameraSwitchPayload($type, $config);
    if (!$payload) return;

    $existing = $db->prepare("SELECT id FROM video_sources WHERE camera_id = ? LIMIT 1");
    $existing->execute([$cameraId]);

    if ($existing->fetch()) {
        $stmt = $db->prepare(
            "UPDATE video_sources SET name = ?, label = ?, type = ?, url = ?, active = ? WHERE camera_id = ?"
        );
        $stmt->execute([$name, $name, $payload["type"], $payload["url"], $active, $cameraId]);
    } else {
        $stmt = $db->prepare(
            "INSERT INTO video_sources (camera_id, name, label, type, url, active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([$cameraId, $name, $name, $payload["type"], $payload["url"], $active]);
    }
}

function notifyFastAPICamera(int $cameraId, string $cameraType, array $config): void {
    $payload = [
        "camera_id" => $cameraId,
        "camera_type" => $cameraType,
        "config" => $config,
    ];

    $ch = curl_init("http://localhost:8000/camera/activate-config");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 2,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("FastAPI camera activation failed: HTTP $httpCode - $response");
    }
}
