<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Прост админ панел: преглед на заявките, изтегляне на файлове,
 * повторно изпращане на имейл, CSV експорт и смяна на получателите за всяка форма.
 */
final class Admin
{
    public function __construct(private readonly App $app)
    {
    }

    public function handle(string $path, string $method): void
    {
        session_name('panair_admin');
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
            'path' => $this->app->path('admin'),
        ]);
        session_start();
        header('X-Frame-Options: DENY');
        header('Cache-Control: no-store');

        $sub = substr($path, strlen('/admin')) ?: '/';

        if ($sub === '/logout') {
            $_SESSION = [];
            session_destroy();
            $this->redirect('admin');
        }

        if (empty($_SESSION['admin'])) {
            $this->login($method);
            return;
        }

        if ($method === 'POST' && !hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['_csrf'] ?? ''))) {
            http_response_code(400);
            $this->page('Грешка', '<p>Невалиден токен. Презаредете страницата.</p>');
            return;
        }

        $store = $this->app->store();
        $forms = $this->app->forms();

        if ($sub === '/') {
            $slug = (string)($_GET['form'] ?? '') ?: null;
            $page = max(1, (int)($_GET['page'] ?? 1));
            $this->page('Заявки', $this->app->render('admin/list', [
                'rows' => $store->list($slug, 50, ($page - 1) * 50),
                'total' => $store->count($slug),
                'page' => $page,
                'forms' => $forms->all(),
                'current' => $slug,
            ]));
            return;
        }

        if ($sub === '/export') {
            $this->export($store, $forms, (string)($_GET['form'] ?? ''));
            return;
        }

        if ($sub === '/forms') {
            $this->formsPage($forms, $method);
            return;
        }

        if (preg_match('#^/submission/([A-Z0-9-]+)(?:/(resend)|/file/(.+))?$#', $sub, $m)) {
            $record = $store->find($m[1]);
            if (!$record) {
                http_response_code(404);
                $this->page('Не е намерена', '<p>Заявката не е намерена.</p>');
                return;
            }
            $form = $forms->get($record['form_slug']);

            if (!empty($m[3])) {
                $file = $store->file($record, $m[3]);
                if (!$file) {
                    http_response_code(404);
                    exit('Файлът липсва.');
                }
                header('Content-Type: application/octet-stream');
                header('Content-Length: ' . filesize($file['path']));
                header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($file['name']));
                readfile($file['path']);
                exit;
            }

            if (($m[2] ?? '') === 'resend' && $method === 'POST' && $form) {
                $error = $this->app->mailer()->sendToOrganizer($form, $record);
                $store->markMail($record['reference'], $error === null, $error);
                $_SESSION['flash'] = $error === null ? 'Имейлът е изпратен повторно.' : 'Грешка при изпращане: ' . $error;
                $this->redirect('admin/submission/' . rawurlencode($record['reference']));
            }

            $this->page('Заявка ' . $record['reference'], $this->app->render('admin/show', [
                'record' => $record,
                'form' => $form,
                'rows' => $form ? $this->app->mailer()->rows($form, $record) : [],
            ]));
            return;
        }

        http_response_code(404);
        $this->page('Не е намерена', '<p>Страницата не съществува.</p>');
    }

    private function login(string $method): void
    {
        $hash = (string)$this->app->get('admin.password_hash', '');
        $error = null;
        if ($hash === '') {
            $error = 'Админ панелът не е конфигуриран (задайте admin.password_hash в config/config.php).';
        } elseif ($method === 'POST') {
            if (password_verify((string)($_POST['password'] ?? ''), $hash)) {
                session_regenerate_id(true);
                $_SESSION['admin'] = true;
                $_SESSION['csrf'] = bin2hex(random_bytes(16));
                $this->redirect('admin');
            }
            sleep(1);
            $error = 'Грешна парола.';
        }
        $this->page('Вход', $this->app->render('admin/login', ['error' => $error]), false);
    }

    private function formsPage(FormRepository $forms, string $method): void
    {
        $settings = new Settings($this->app->storagePath('settings.json'));
        $errors = [];
        if ($method === 'POST') {
            $slug = (string)($_POST['slug'] ?? '');
            if ($forms->get($slug)) {
                $recipients = self::parseEmails((string)($_POST['recipients'] ?? ''), $errors, 'recipients');
                $cc = self::parseEmails((string)($_POST['cc'] ?? ''), $errors, 'cc');
                if (!$recipients) {
                    $errors['recipients'] = 'Въведете поне един имейл адрес.';
                }
                if (!$errors) {
                    $settings->setForm($slug, [
                        'recipients' => $recipients,
                        'cc' => $cc,
                        'send_confirmation' => !empty($_POST['send_confirmation']),
                        'active' => !empty($_POST['active']),
                    ]);
                    $_SESSION['flash'] = 'Настройките на „' . $forms->get($slug)['title'] . '“ са запазени.';
                    $this->redirect('admin/forms');
                }
                $_SESSION['flash'] = 'Грешка: ' . implode(' ', $errors);
                $this->redirect('admin/forms');
            }
        }
        $this->page('Форми и получатели', $this->app->render('admin/forms', [
            'forms' => $forms->all(),
            'counts' => array_map(fn($f) => $this->app->store()->count($f['slug']), $forms->all()),
        ]));
    }

    private static function parseEmails(string $input, array &$errors, string $key): array
    {
        $list = array_values(array_unique(array_filter(array_map('trim', preg_split('/[\s,;]+/', $input)))));
        foreach ($list as $email) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[$key] = "Невалиден имейл: {$email}.";
            }
        }
        return $list;
    }

    private function export(SubmissionStore $store, FormRepository $forms, string $slug): void
    {
        $form = $forms->get($slug);
        if (!$form) {
            http_response_code(404);
            exit('Изберете форма.');
        }
        $fields = $forms->fields($form);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $slug . '-' . date('Ymd') . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // BOM, за да се отваря правилно в Excel
        fputcsv($out, array_merge(['Номер', 'Дата', 'Имейл статус'], array_map(fn($f) => strip_tags($f['label']), $fields)), ';');
        $offset = 0;
        while ($rows = $store->list($slug, 500, $offset)) {
            foreach ($rows as $r) {
                $line = [$r['reference'], $r['created_at'], $r['mail_status']];
                foreach ($fields as $f) {
                    $line[] = self::csvSafe(Mailer::display($f, $r['values'][$f['name']] ?? ''));
                }
                fputcsv($out, $line, ';');
            }
            $offset += 500;
        }
        fclose($out);
        exit;
    }

    /** Предпазва от CSV/формула инжекция в Excel. */
    private static function csvSafe(string $v): string
    {
        return $v !== '' && in_array($v[0], ['=', '+', '-', '@', "\t", "\r"], true) && !is_numeric($v) ? "'" . $v : $v;
    }

    private function page(string $title, string $content, bool $nav = true): void
    {
        $flash = $_SESSION['flash'] ?? null;
        unset($_SESSION['flash']);
        echo $this->app->render('admin/layout', [
            'title' => $title, 'content' => $content, 'nav' => $nav, 'flash' => $flash,
            'csrf' => $_SESSION['csrf'] ?? '',
        ]);
    }

    private function redirect(string $to): never
    {
        header('Location: ' . $this->app->path($to), true, 303);
        exit;
    }
}
