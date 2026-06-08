<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/helpers.php";

setCors();

$action = $_GET["action"] ?? "";
$db     = getDb();

match ($action) {
    "slots"    => handleSlots($db),
    "sessions" => handleSessions($db),
    "stats"    => handleStats($db),
    default    => jsonError("Not found", 404),
};

function handleSlots(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    $rows = $db->query("
        SELECT
            z.id,
            z.slot,
            COALESCE(ps.status, 'available') AS status,
            ps.plate,
            ps.`entry` AS since
        FROM zones z
        LEFT JOIN parking_sessions ps
            ON  ps.slot = z.slot
            AND ps.`exit` IS NULL
        ORDER BY z.slot ASC
    ")->fetchAll();

    foreach ($rows as &$row) {
        $row["id"] = (int) $row["id"];
    }

    json($rows);
}

function handleSessions(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    $range       = $_GET["range"] ?? "today";
    [$from, $to] = rangeToDatetime($range);

    $stmt = $db->prepare("
        SELECT
            id,
            slot,
            plate,
            status,
            `entry`,
            `exit`,
            TIMESTAMPDIFF(MINUTE, `entry`, COALESCE(`exit`, NOW())) AS duration_min,
            bill
        FROM parking_sessions
        WHERE `entry` >= ? AND `entry` <= ?
        ORDER BY `entry` DESC
    ");
    $stmt->execute([$from, $to]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row["id"]          = (int)   $row["id"];
        $row["durationMin"] = $row["duration_min"] !== null ? (int) $row["duration_min"] : null;
        $row["bill"]        = $row["bill"]         !== null ? (float) $row["bill"]       : null;
        unset($row["duration_min"]);
    }

    json($rows);
}

function handleStats(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    $range       = $_GET["range"] ?? "today";
    [$from, $to] = rangeToDatetime($range);

    $stmt = $db->prepare("
        SELECT
            COUNT(*) AS totalSessions,
            COALESCE(SUM(bill), 0) AS totalRevenue,
            COALESCE(AVG(TIMESTAMPDIFF(MINUTE, `entry`, COALESCE(`exit`, NOW()))), 0) AS avgDuration,
            COALESCE(AVG(bill), 0) AS avgCharge
        FROM parking_sessions
        WHERE `entry` >= ? AND `entry` <= ?
    ");
    $stmt->execute([$from, $to]);
    $agg = $stmt->fetch();

    $occupancyCurrent = (int) $db->query(
        "SELECT COUNT(*) FROM parking_sessions WHERE `exit` IS NULL"
    )->fetchColumn();

    $occupancyTotal = (int) $db->query(
        "SELECT COUNT(*) FROM zones"
    )->fetchColumn();

    $vehicleTurnover = $occupancyTotal > 0
        ? round((int) $agg["totalSessions"] / $occupancyTotal, 2)
        : 0;

    json([
        "totalSessions"    => (int)   $agg["totalSessions"],
        "totalRevenue"     => (float) $agg["totalRevenue"],
        "avgDuration"      => round((float) $agg["avgDuration"], 2),
        "avgCharge"        => round((float) $agg["avgCharge"],   2),
        "occupancyCurrent" => $occupancyCurrent,
        "occupancyTotal"   => $occupancyTotal,
        "vehicleTurnover"  => $vehicleTurnover,
    ]);
}

function rangeToDatetime(string $range): array {
    $now = new DateTime();

    return match ($range) {
        "today"      => [
            $now->format("Y-m-d 00:00:00"),
            $now->format("Y-m-d 23:59:59"),
        ],
        "yesterday"  => [
            (clone $now)->modify("-1 day")->format("Y-m-d 00:00:00"),
            (clone $now)->modify("-1 day")->format("Y-m-d 23:59:59"),
        ],
        "week"       => [
            (clone $now)->modify("-7 days")->format("Y-m-d 00:00:00"),
            $now->format("Y-m-d 23:59:59"),
        ],
        "month"      => [
            (clone $now)->modify("-30 days")->format("Y-m-d 00:00:00"),
            $now->format("Y-m-d 23:59:59"),
        ],
        "this_week"  => [
            (clone $now)->modify("monday this week")->format("Y-m-d 00:00:00"),
            $now->format("Y-m-d 23:59:59"),
        ],
        "this_month" => [
            $now->format("Y-m-01 00:00:00"),
            $now->format("Y-m-d 23:59:59"),
        ],
        "last_month" => [
            (clone $now)->modify("first day of last month")->format("Y-m-d 00:00:00"),
            (clone $now)->modify("last day of last month")->format("Y-m-d 23:59:59"),
        ],
        "this_year"  => [
            $now->format("Y-01-01 00:00:00"),
            $now->format("Y-m-d 23:59:59"),
        ],
        "all"        => [
            "2000-01-01 00:00:00",
            "2099-12-31 23:59:59",
        ],
        default      => [
            $now->format("Y-m-d 00:00:00"),
            $now->format("Y-m-d 23:59:59"),
        ],
    };
}