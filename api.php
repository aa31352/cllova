<?php
// Smart Trash Bin API
// ------------------------------------------------------------
// This PHP script provides two main capabilities for your frontend:
// 1) GET /api.php?action=bins      -> Returns all bins with computed status_color
// 2) POST /api.php?action=report   -> Creates a new report { bin_id, issue_description }
//
// Database schema (expected):
// - bin(id INT PK, location VARCHAR(...), fill_percentage DECIMAL/INT)
// - report(id INT PK, bin_id INT(FK -> bin.id), issue_description TEXT, report_time DATETIME)
//
// Notes for frontend integration:
// - Responses are JSON with appropriate HTTP status codes.
// - Supports CORS for ease of development; adjust origins as needed for production.
// - For POST /report, send either JSON (application/json) or form-encoded (application/x-www-form-urlencoded).
// ------------------------------------------------------------

// ----------------------
// Configuration (edit me)
// ----------------------
$DB_HOST = 'YOUR_DB_HOST';       // e.g., '127.0.0.1'
$DB_NAME = 'YOUR_DB_NAME';       // e.g., 'smart_trash_bin'
$DB_USER = 'YOUR_DB_USER';       // e.g., 'root'
$DB_PASS = 'YOUR_DB_PASSWORD';   // e.g., 'password'
$DB_DSN  = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";

// ----------------------
// CORS + JSON headers
// ----------------------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // Adjust for production (e.g., https://yourdomain.com)
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----------------------
// Utility: JSON response
// ----------------------
function respond_json($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ----------------------
// Utility: Connect to DB
// ----------------------
function get_db_connection(string $dsn, string $user, string $pass): PDO {
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    return new PDO($dsn, $user, $pass, $options);
}

// -------------------------------------
// Utility: Compute status color by fill
// -------------------------------------
// Rules:
// - Green   when fill_percentage < 30
// - Yellow  when 30 <= fill_percentage <= 80
// - Red     when fill_percentage > 80
function compute_status_color($fillPercentage): string {
    // Normalize to a float within [0, 100] for safety
    $p = max(0.0, min(100.0, (float)$fillPercentage));

    if ($p < 30.0) {
        return 'green';
    }
    if ($p <= 80.0) {
        return 'yellow';
    }
    return 'red';
}

// ----------------------
// Handler: GET /bins
// ----------------------
function handle_get_bins(PDO $pdo): void {
    $sql = 'SELECT id, location, fill_percentage FROM bin ORDER BY id ASC';
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    $bins = [];
    foreach ($rows as $row) {
        $fill = isset($row['fill_percentage']) ? (float)$row['fill_percentage'] : 0.0;
        $bins[] = [
            'id' => (int)$row['id'],
            'location' => $row['location'],
            'fill_percentage' => $fill,
            'status_color' => compute_status_color($fill),
        ];
    }

    respond_json([ 'bins' => $bins ]);
}

// ---------------------------------------
// Handler: POST /report (create a report)
// ---------------------------------------
function handle_post_report(PDO $pdo): void {
    // Accept both JSON and form-encoded bodies
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $isJson = stripos($contentType, 'application/json') !== false;

    if ($isJson) {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            respond_json([ 'error' => 'Invalid JSON body' ], 400);
        }
        $binId = $payload['bin_id'] ?? null;
        $issueDescription = $payload['issue_description'] ?? null;
    } else {
        $binId = $_POST['bin_id'] ?? null;
        $issueDescription = $_POST['issue_description'] ?? null;
    }

    // Basic validation
    if ($binId === null || $issueDescription === null) {
        respond_json([ 'error' => 'Missing required fields: bin_id, issue_description' ], 400);
    }

    $binId = filter_var($binId, FILTER_VALIDATE_INT);
    $issueDescription = trim((string)$issueDescription);

    if ($binId === false || $binId <= 0) {
        respond_json([ 'error' => 'bin_id must be a positive integer' ], 400);
    }
    if ($issueDescription === '') {
        respond_json([ 'error' => 'issue_description cannot be empty' ], 400);
    }

    // Optional: verify that bin exists (helps catch bad input early)
    $check = $pdo->prepare('SELECT 1 FROM bin WHERE id = :id');
    $check->execute([ ':id' => $binId ]);
    if ($check->fetchColumn() === false) {
        respond_json([ 'error' => 'Referenced bin not found' ], 404);
    }

    // Insert report using prepared statement
    $insert = $pdo->prepare(
        'INSERT INTO report (bin_id, issue_description, report_time) VALUES (:bin_id, :issue_description, NOW())'
    );

    $insert->execute([
        ':bin_id' => $binId,
        ':issue_description' => $issueDescription,
    ]);

    $newId = (int)$pdo->lastInsertId();

    respond_json([
        'message' => 'Report created successfully',
        'report' => [
            'id' => $newId,
            'bin_id' => $binId,
            'issue_description' => $issueDescription,
            // report_time is set by DB; if needed, fetch it back with a SELECT
        ],
    ], 201);
}

// ----------------------
// Router
// ----------------------
$action = $_GET['action'] ?? ($_POST['action'] ?? '');

try {
    $pdo = get_db_connection($DB_DSN, $DB_USER, $DB_PASS);

    // Route based on method + action
    switch (strtoupper($_SERVER['REQUEST_METHOD'])) {
        case 'GET':
            if ($action === 'bins') {
                handle_get_bins($pdo);
            }
            // Unknown or missing action
            respond_json([ 'error' => 'Unknown GET action. Try action=bins' ], 400);
            break;

        case 'POST':
            if ($action === 'report') {
                handle_post_report($pdo);
            }
            respond_json([ 'error' => 'Unknown POST action. Try action=report' ], 400);
            break;

        default:
            respond_json([ 'error' => 'Method not allowed' ], 405);
    }
} catch (PDOException $e) {
    // Database-related errors
    respond_json([ 'error' => 'Database error', 'details' => $e->getMessage() ], 500);
} catch (Throwable $t) {
    // Any other errors
    respond_json([ 'error' => 'Server error', 'details' => $t->getMessage() ], 500);
}