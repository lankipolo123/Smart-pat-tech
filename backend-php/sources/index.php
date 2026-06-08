<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/helpers.php";

setCors();

$method = method();
$id     = isset($_GET["id"])     ? (int) $_GET["id"] : null;
$action = $_GET["action"] ?? null;
$db     = getDb();

if ($id && $action === "activate") {
    activateSource($db, $id);
} elseif ($id) {
    match ($method) {
        "GET"    => getSource($db, $id),
        "DELETE" => deleteSource($db, $id),
        default  => jsonError("Method not allowed", 405),
    };
} else {
    match ($method) {
        "GET"  => listSources($db),
        "POST" => createSource($db),
        default => jsonError("Method not allowed", 405),
    };
}

// ── GET /sources ───────────────────────────────────────────────────────────
function listSources(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    $rows = $db->query("SELECT * FROM video_sources ORDER BY created_at DESC")->fetchAll();

    foreach ($rows as &$row) {
        $row["id"]        = (int) $row["id"];
        $row["active"]    = (int) $row["active"];
        $row["camera_id"] = $row["camera_id"] !== null ? (int) $row["camera_id"] : null;
        $row["name"]      = $row["name"] ?: ($row["label"] ?: ucfirst($row["type"]));
    }

    json($rows);
}

// ── GET /sources/{id} ─────────────────────────────────────────────────────
function getSource(PDO $db, int $id): void {
    $stmt = $db->prepare("SELECT * FROM video_sources WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row) jsonError("Source not found", 404);

    $row["id"]        = (int) $row["id"];
    $row["active"]    = (int) $row["active"];
    $row["camera_id"] = $row["camera_id"] !== null ? (int) $row["camera_id"] : null;
    $row["name"]      = $row["name"] ?: ($row["label"] ?: ucfirst($row["type"]));

    json($row);
}

// ── POST /sources ──────────────────────────────────────────────────────────
function createSource(PDO $db): void {
    $b     = body();
    $name  = trim($b["name"]  ?? ($b["label"] ?? ""));
    $type  = trim($b["type"]  ?? "");
    $url   = trim($b["url"]   ?? "") ?: null;
    $label = trim($b["label"] ?? $name) ?: null;
    $camera_id = isset($b["camera_id"]) ? (int) $b["camera_id"] : null;

    if (!$type) jsonError("type is required");
    if (!$name) $name = ucfirst($type);

    $validTypes = ["webcam", "rtsp", "mjpeg", "mp4"];
    if (!in_array($type, $validTypes)) {
        jsonError("type must be one of: " . implode(", ", $validTypes));
    }

    $stmt = $db->prepare(
        "INSERT INTO video_sources (camera_id, name, type, url, label, active, created_at)
         VALUES (?, ?, ?, ?, ?, 0, NOW())"
    );
    $stmt->execute([$camera_id, $name, $type, $url, $label]);

    json(["id" => (int) $db->lastInsertId(), "message" => "Source created"], 201);
}

// ── DELETE /sources/{id} ──────────────────────────────────────────────────
function deleteSource(PDO $db, int $id): void {
    $stmt = $db->prepare("DELETE FROM video_sources WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) jsonError("Source not found", 404);

    json(["message" => "Source deleted"]);
}

// ── POST /sources/{id}/activate ───────────────────────────────────────────
function activateSource(PDO $db, int $id): void {
    if (method() !== "POST") jsonError("Method not allowed", 405);

    $check = $db->prepare("SELECT * FROM video_sources WHERE id = ? LIMIT 1");
    $check->execute([$id]);
    $source = $check->fetch();
    if (!$source) jsonError("Source not found", 404);

    $db->exec("UPDATE video_sources SET active = 0");
    $db->prepare("UPDATE video_sources SET active = 1 WHERE id = ?")
       ->execute([$id]);
    if ($source["camera_id"] !== null) {
        $db->exec("UPDATE cameras SET is_active = 0");
        $db->prepare("UPDATE cameras SET is_active = 1, updated_at = NOW() WHERE id = ?")
           ->execute([(int) $source["camera_id"]]);
    }

    // Notify FastAPI
    notifyFastAPISource($source);

    json(["ok" => true, "message" => "Source activated"]);
}

// ── Helper: Notify FastAPI ────────────────────────────────────────────────
function notifyFastAPISource(array $source): void {
    $payload = [
        "source_id" => (int) $source["id"],
        "camera_id" => $source["camera_id"] !== null ? (int) $source["camera_id"] : null,
        "type" => $source["type"],
        "url" => $source["url"],
        "label" => $source["label"] ?? ($source["name"] ?? null)
    ];

    $ch = curl_init("http://localhost:8000/source/activate");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 2,
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("FastAPI notification failed: HTTP $httpCode - $response");
    }
}
