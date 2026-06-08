
<?php

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────
function setCors(): void
{
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");

    // Handle preflight requests
    if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
        http_response_code(204);
        exit;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON RESPONSE
// ─────────────────────────────────────────────────────────────────────────────
function json($data, int $status = 200): void
{
    http_response_code($status);

    header("Content-Type: application/json");

    echo json_encode($data);

    exit;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON ERROR RESPONSE
// ─────────────────────────────────────────────────────────────────────────────
function jsonError(string $detail, int $status = 400): void
{
    json([
        "detail" => $detail
    ], $status);
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST BODY
// ─────────────────────────────────────────────────────────────────────────────
function body(): array
{
    $raw = file_get_contents("php://input");

    return json_decode($raw, true) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST METHOD
// ─────────────────────────────────────────────────────────────────────────────
function method(): string
{
    return $_SERVER["REQUEST_METHOD"];
}
