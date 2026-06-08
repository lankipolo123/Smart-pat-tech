<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/helpers.php";
require_once __DIR__ . "/../config/auth.php";

setCors();

// Routed via .htaccess ?action=
$seg = $_GET["action"] ?? "";

match ($seg) {
    "login"      => handleLogin(),
    "register"   => handleRegister(),
    "profile"    => handleProfile(),
    "email"      => handleEmail(),
    "password"   => handlePassword(),
    "deactivate" => handleDeactivate(),
    "account"    => handleAccount(),
    "avatar"     => handleAvatar(),
    default      => jsonError("Not found", 404),
};

// ── POST /auth/login ───────────────────────────────────────────────────────
function handleLogin(): void {
    if (method() !== "POST") jsonError("Method not allowed", 405);

    $b        = body();
    $email    = trim($b["email"]    ?? "");
    $password = $b["password"] ?? "";

    if (!$email || !$password) jsonError("Email and password are required");

    $db   = getDb();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user["password_hash"])) {
        jsonError("Invalid email or password", 401);
    }

    $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user["id"]]);

    $token = jwtIssue(["sub" => $user["id"], "email" => $user["email"]]);

    json([
        "access_token" => $token,
        "name"         => $user["name"],
        "email"        => $user["email"],
        "joined_at"    => $user["created_at"],
        "last_login"   => date("c"),
        "avatar_url"   => $user["avatar_url"] ?? null,
    ]);
}

// ── POST /auth/register ────────────────────────────────────────────────────
function handleRegister(): void {
    if (method() !== "POST") jsonError("Method not allowed", 405);

    $b        = body();
    $name     = trim($b["name"]     ?? "");
    $email    = trim($b["email"]    ?? "");
    $password = $b["password"] ?? "";

    if (!$name || !$email || !$password) jsonError("name, email, and password are required");
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))  jsonError("Invalid email address");
    if (strlen($password) < 6) jsonError("Password must be at least 6 characters");

    $db    = getDb();
    $check = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $check->execute([$email]);
    if ($check->fetch()) jsonError("Email is already in use", 409);

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $db->prepare(
        "INSERT INTO users (name, email, password_hash, created_at, last_login, is_active)
         VALUES (?, ?, ?, NOW(), NOW(), 1)"
    )->execute([$name, $email, $hash]);

    $id    = (int) $db->lastInsertId();
    $token = jwtIssue(["sub" => $id, "email" => $email]);

    json([
        "access_token" => $token,
        "name"         => $name,
        "email"        => $email,
        "joined_at"    => date("c"),
        "last_login"   => date("c"),
        "avatar_url"   => null,
    ], 201);
}

// ── PATCH /auth/profile ────────────────────────────────────────────────────
function handleProfile(): void {
    if (method() !== "PATCH") jsonError("Method not allowed", 405);

    $uid       = requireAuth();
    $b         = body();
    $firstName = trim($b["firstName"] ?? "");
    $lastName  = trim($b["lastName"]  ?? "");
    $email     = trim($b["email"]     ?? "");

    if (!$firstName || !$lastName || !$email) {
        jsonError("firstName, lastName, and email are required");
    }

    $name = "{$firstName} {$lastName}";
    getDb()->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?")
           ->execute([$name, $email, $uid]);

    json(["firstName" => $firstName, "lastName" => $lastName, "email" => $email]);
}

// ── PATCH /auth/email ──────────────────────────────────────────────────────
function handleEmail(): void {
    if (method() !== "PATCH") jsonError("Method not allowed", 405);

    $uid      = requireAuth();
    $b        = body();
    $newEmail = trim($b["newEmail"] ?? "");
    $password = $b["password"] ?? "";

    if (!$newEmail || !$password) jsonError("newEmail and password are required");

    $db   = getDb();
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$uid]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user["password_hash"])) {
        jsonError("Incorrect password", 401);
    }

    $db->prepare("UPDATE users SET email = ? WHERE id = ?")->execute([$newEmail, $uid]);
    json(["email" => $newEmail]);
}

// ── PATCH /auth/password ───────────────────────────────────────────────────
function handlePassword(): void {
    if (method() !== "PATCH") jsonError("Method not allowed", 405);

    $uid     = requireAuth();
    $b       = body();
    $current = $b["currentPassword"] ?? "";
    $new     = $b["newPassword"]     ?? "";

    if (!$current || !$new) jsonError("currentPassword and newPassword are required");
    if (strlen($new) < 6)   jsonError("New password must be at least 6 characters");

    $db   = getDb();
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$uid]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($current, $user["password_hash"])) {
        jsonError("Current password is incorrect", 401);
    }

    $hash = password_hash($new, PASSWORD_BCRYPT);
    $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $uid]);
    json(["message" => "Password updated successfully"]);
}

// ── POST /auth/deactivate ──────────────────────────────────────────────────
function handleDeactivate(): void {
    if (method() !== "POST") jsonError("Method not allowed", 405);

    $uid = requireAuth();
    getDb()->prepare("UPDATE users SET is_active = 0 WHERE id = ?")->execute([$uid]);
    json(["message" => "Account deactivated"]);
}

// ── DELETE /auth/account ───────────────────────────────────────────────────
function handleAccount(): void {
    if (method() !== "DELETE") jsonError("Method not allowed", 405);

    $uid = requireAuth();
    getDb()->prepare("DELETE FROM users WHERE id = ?")->execute([$uid]);
    json(["message" => "Account deleted"]);
}

// ── POST /auth/avatar ──────────────────────────────────────────────────────
function handleAvatar(): void {
    if (method() !== "POST") jsonError("Method not allowed", 405);

    $uid     = requireAuth();
    $allowed = ["jpg", "jpeg", "png", "webp", "gif"];

    if (empty($_FILES["file"])) jsonError("No file uploaded");

    $file = $_FILES["file"];
    $ext  = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));

    if (!in_array($ext, $allowed)) jsonError("File type not allowed. Use: jpg, jpeg, png, webp, gif");

    // Validate it's actually an image
    if (!getimagesize($file["tmp_name"])) jsonError("Uploaded file is not a valid image");

    $dir = __DIR__ . "/../uploads/avatars/";
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $filename = "avatar_{$uid}_" . time() . ".{$ext}";
    $dest     = $dir . $filename;

    if (!move_uploaded_file($file["tmp_name"], $dest)) {
        jsonError("Failed to save the uploaded file", 500);
    }

    $url = "/uploads/avatars/{$filename}";
    getDb()->prepare("UPDATE users SET avatar_url = ? WHERE id = ?")->execute([$url, $uid]);

    json(["photoURL" => $url]);
}
