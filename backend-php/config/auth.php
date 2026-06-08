<?php

require_once __DIR__ . "/db.php";

function jwtIssue(array $payload): string
{
    $header  = base64UrlEncode(json_encode(["alg" => "HS256", "typ" => "JWT"]));
    $payload = base64UrlEncode(json_encode($payload));
    $sig     = base64UrlEncode(hash_hmac("sha256", "{$header}.{$payload}", jwtSecret(), true));
    return "{$header}.{$payload}.{$sig}";
}

function jwtVerify(string $token): array
{
    [$header, $payload, $sig] = explode(".", $token) + [null, null, null];
    if (!$header || !$payload || !$sig) jsonError("Invalid token", 401);

    $expected = base64UrlEncode(hash_hmac("sha256", "{$header}.{$payload}", jwtSecret(), true));
    if (!hash_equals($expected, $sig)) jsonError("Invalid token signature", 401);

    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data) jsonError("Invalid token payload", 401);

    return $data;
}

function requireAuth(): int
{
    $header = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
    if (!str_starts_with($header, "Bearer ")) jsonError("Unauthorized", 401);

    $token = substr($header, 7);
    $data  = jwtVerify($token);

    return (int) ($data["sub"] ?? 0);
}

function jwtSecret(): string
{
    return $_ENV["JWT_SECRET"] ?? "changeme";
}

function base64UrlEncode(string $data): string
{
    return rtrim(strtr(base64_encode($data), "+/", "-_"), "=");
}

function base64UrlDecode(string $data): string
{
    return base64_decode(strtr($data, "-_", "+/"));
}