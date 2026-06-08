<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/helpers.php";

setCors();

$action = $_GET["action"] ?? "";
$db     = getDb();

match ($action) {
    "stats"    => handleStats($db),
    "revenue"  => handleRevenue($db),
    "vehicles" => handleVehicles($db),
    "activity" => handleActivity($db),
    default    => jsonError("Not found", 404),
};

// ── GET /analytics/stats ──────────────────────────────────────────────────
function handleStats(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    // All-time totals
    $totals = $db->query("
        SELECT
            COALESCE(SUM(bill), 0) AS totalRevenue,
            COUNT(*)               AS totalVehicles,
            COALESCE(AVG(bill), 0) AS avgSessionBill
        FROM parking_sessions
    ")->fetch();

    // Average daily revenue over the last 30 days
    $avgDailyRevenue = (float) $db->query("
        SELECT COALESCE(AVG(day_rev), 0)
        FROM (
            SELECT DATE(entry) AS d, SUM(bill) AS day_rev
            FROM parking_sessions
            WHERE entry >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(entry)
        ) t
    ")->fetchColumn();

    // Peak hour (all-time)
    $peakRow = $db->query("
        SELECT HOUR(entry) AS hr, COUNT(*) AS cnt
        FROM parking_sessions
        GROUP BY HOUR(entry)
        ORDER BY cnt DESC
        LIMIT 1
    ")->fetch();
    $peakHour = $peakRow ? sprintf("%02d:00", (int) $peakRow["hr"]) : "N/A";

    // Revenue growth: this month vs last month
    $thisMonth = (float) $db->query("
        SELECT COALESCE(SUM(bill), 0)
        FROM parking_sessions
        WHERE MONTH(entry) = MONTH(NOW())
          AND YEAR(entry)  = YEAR(NOW())
    ")->fetchColumn();

    $lastMonth = (float) $db->query("
        SELECT COALESCE(SUM(bill), 0)
        FROM parking_sessions
        WHERE MONTH(entry) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
          AND YEAR(entry)  = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
    ")->fetchColumn();

    $revenueGrowthPct = $lastMonth > 0
        ? round((($thisMonth - $lastMonth) / $lastMonth) * 100, 2)
        : 0.0;

    json([
        "totalRevenue"     => (float) $totals["totalRevenue"],
        "totalVehicles"    => (int)   $totals["totalVehicles"],
        "avgDailyRevenue"  => round($avgDailyRevenue, 2),
        "avgSessionBill"   => round((float) $totals["avgSessionBill"], 2),
        "peakHour"         => $peakHour,
        "revenueGrowthPct" => $revenueGrowthPct,
    ]);
}

// ── GET /analytics/revenue ────────────────────────────────────────────────
// Returns daily revenue for the past 30 days.
function handleRevenue(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    $rows = $db->query("
        SELECT
            DATE(entry)         AS date,
            COALESCE(SUM(bill), 0) AS revenue
        FROM parking_sessions
        WHERE entry >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(entry)
        ORDER BY DATE(entry) ASC
    ")->fetchAll();

    json(array_map(fn($r) => [
        "date"    => $r["date"],
        "revenue" => (float) $r["revenue"],
    ], $rows));
}

// ── GET /analytics/vehicles ───────────────────────────────────────────────
// Returns daily vehicle count for the past 30 days.
function handleVehicles(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    $rows = $db->query("
        SELECT
            DATE(entry) AS date,
            COUNT(*)    AS vehicles
        FROM parking_sessions
        WHERE entry >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(entry)
        ORDER BY DATE(entry) ASC
    ")->fetchAll();

    json(array_map(fn($r) => [
        "date"     => $r["date"],
        "vehicles" => (int) $r["vehicles"],
    ], $rows));
}

// ── GET /analytics/activity ───────────────────────────────────────────────
// Returns vehicle count per hour for today (hourly activity heatmap).
function handleActivity(PDO $db): void {
    if (method() !== "GET") jsonError("Method not allowed", 405);

    $rows = $db->query("
        SELECT
            CONCAT(LPAD(HOUR(entry), 2, '0'), ':00') AS label,
            COUNT(*) AS vehicles
        FROM parking_sessions
        WHERE DATE(entry) = CURDATE()
        GROUP BY HOUR(entry)
        ORDER BY HOUR(entry) ASC
    ")->fetchAll();

    json(array_map(fn($r) => [
        "label"    => $r["label"],
        "vehicles" => (int) $r["vehicles"],
    ], $rows));
}
