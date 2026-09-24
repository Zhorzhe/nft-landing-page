<?php

declare(strict_types=1);

use PanairForms\App;
use PanairForms\Validator;

// Вграден PHP сървър (локален тест): статичните файлове се сервират директно.
if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/helpers.php';

$app = new App(dirname(__DIR__));

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$base = rtrim((string)$app->get('base_path', ''), '/');
if ($base !== '' && str_starts_with($path, $base)) {
    $path = substr($path, strlen($base)) ?: '/';
}
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

try {
    if (str_starts_with($path, '/admin')) {
        (new PanairForms\Admin($app))->handle($path, $method);
        exit;
    }

    if ($path === '/') {
        if (!$app->get('show_index', true)) {
            not_found($app);
        }
        $forms = array_filter($app->forms()->all(), fn($f) => $app->forms()->isOpen($f));
        echo $app->render('layout', ['title' => 'Онлайн заявки за участие', 'content' => $app->render('index', ['forms' => $forms])]);
        exit;
    }

    if (preg_match('#^/forms/([a-z0-9-]+)(/thanks)?$#', $path, $m)) {
        $repo = $app->forms();
        $form = $repo->get($m[1]);
        if (!$form) {
            not_found($app);
        }

        if (!empty($m[2])) {
            $ref = preg_replace('/[^A-Z0-9-]/', '', (string)($_GET['ref'] ?? ''));
            echo $app->render('layout', ['title' => $form['title'], 'form' => $form, 'content' => $app->render('thanks', ['form' => $form, 'reference' => $ref])]);
            exit;
        }

        if (!$repo->isOpen($form)) {
            echo $app->render('layout', ['title' => $form['title'], 'form' => $form, 'content' => $app->render('closed', ['form' => $form])]);
            exit;
        }

        $values = [];
        $errors = [];

        if ($method === 'POST') {
            [$values, $errors, $reference] = handle_submit($app, $form);
            if ($reference !== null) {
                header('Location: ' . $app->path('forms/' . $form['slug'] . '/thanks') . '?ref=' . rawurlencode($reference), true, 303);
                exit;
            }
            http_response_code(422);
        }

        echo $app->render('layout', [
            'title' => $form['title'] . ' – ' . $form['subtitle'],
            'form' => $form,
            'content' => $app->render('form', [
                'form' => $form, 'values' => $values, 'errors' => $errors,
                'token' => form_token($app, $form['slug']),
                'maxFileMb' => (int)$app->get('upload.max_file_mb', 10),
                'allowedExt' => $app->get('upload.allowed', ['pdf', 'jpg', 'jpeg', 'png', 'docx']),
            ]),
        ]);
        exit;
    }

    not_found($app);
} catch (Throwable $e) {
    error_log('[panair-forms] ' . $e);
    http_response_code(500);
    echo $app->render('layout', ['title' => 'Грешка', 'content' => $app->render('error', [
        'message' => $app->get('debug') ? $e->getMessage() : null,
    ])]);
}

/** @return array{0: array, 1: array, 2: ?string} [стойности, грешки, номер на заявката при успех] */
function handle_submit(App $app, array $form): array
{
    // Прекалено голяма заявка: PHP изпразва $_POST и $_FILES.
    if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        return [[], ['_form' => 'Общият размер на прикачените файлове е твърде голям. Намалете броя или размера им.'], null];
    }

    // Защита от спам: скрито поле (honeypot) + подписан времеви маркер.
    if (!empty($_POST['website']) || !check_token($app, $form['slug'], (string)($_POST['_token'] ?? ''))) {
        return [$_POST, ['_form' => 'Сесията изтече или формата е изпратена твърде бързо. Моля, опитайте отново.'], null];
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $store = $app->store();
    if ($store->recentFromIp($ip, 10) >= (int)$app->get('rate_limit_per_10min', 10)) {
        return [$_POST, ['_form' => 'Твърде много заявки от Вашия адрес. Опитайте отново след няколко минути.'], null];
    }

    $validator = new Validator(
        $app->forms()->fields($form),
        (int)($app->get('upload.max_file_mb', 10) * 1048576),
        $app->get('upload.allowed', ['pdf', 'jpg', 'jpeg', 'png', 'docx']),
    );
    if (!$validator->validate($_POST, $_FILES)) {
        return [$validator->values, $validator->errors, null];
    }

    // 1) Първо записваме заявката (лог), 2) после изпращаме имейлите.
    $record = $store->create($form, $validator->values, $validator->files, [
        'ip' => $ip, 'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ]);

    $mailer = $app->mailer();
    $error = $mailer->sendToOrganizer($form, $record);
    $store->markMail($record['reference'], $error === null, $error);
    if ($error !== null) {
        error_log("[panair-forms] Имейлът за {$record['reference']} не е изпратен: {$error}");
    }

    if ($form['send_confirmation']) {
        $cErr = $mailer->sendConfirmation($form, $record);
        $store->markConfirmation($record['reference'], $cErr === null ? 'sent' : 'failed: ' . $cErr);
    }

    return [[], [], $record['reference']];
}

function form_token(App $app, string $slug): string
{
    $t = (string)time();
    return $t . '.' . $app->sign($slug . '|' . $t);
}

function check_token(App $app, string $slug, string $token): bool
{
    [$t, $sig] = array_pad(explode('.', $token, 2), 2, '');
    if (!ctype_digit($t) || !hash_equals($app->sign($slug . '|' . $t), $sig)) {
        return false;
    }
    $age = time() - (int)$t;
    return $age >= (int)$app->get('min_fill_seconds', 3) && $age <= 86400;
}

function not_found(App $app): never
{
    http_response_code(404);
    echo $app->render('layout', ['title' => 'Страницата не е намерена', 'content' => $app->render('error', ['notFound' => true])]);
    exit;
}
