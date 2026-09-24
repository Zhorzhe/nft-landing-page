<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Зарежда конфигурацията и дава общи помощни функции.
 */
final class App
{
    public readonly string $root;
    public readonly array $config;

    public function __construct(string $root)
    {
        $this->root = rtrim($root, '/');
        $file = $this->root . '/config/config.php';
        if (!is_file($file)) {
            throw new \RuntimeException('Липсва config/config.php — копирайте config/config.example.php като config/config.php.');
        }
        $this->config = require $file;
        date_default_timezone_set($this->config['timezone'] ?? 'Europe/Sofia');
    }

    public function get(string $path, mixed $default = null): mixed
    {
        $value = $this->config;
        foreach (explode('.', $path) as $key) {
            if (!is_array($value) || !array_key_exists($key, $value)) {
                return $default;
            }
            $value = $value[$key];
        }
        return $value;
    }

    public function storagePath(string $sub = ''): string
    {
        $base = $this->get('storage_path') ?: $this->root . '/storage';
        return rtrim($base, '/') . ($sub !== '' ? '/' . ltrim($sub, '/') : '');
    }

    public function forms(): FormRepository
    {
        return new FormRepository($this->root . '/config/forms', new Settings($this->storagePath('settings.json')));
    }

    public function store(): SubmissionStore
    {
        return new SubmissionStore($this->storagePath());
    }

    public function mailer(): Mailer
    {
        return new Mailer($this);
    }

    /** Абсолютен URL спрямо app_url (или текущия хост). */
    public function url(string $path = ''): string
    {
        $base = rtrim((string)$this->get('app_url', ''), '/');
        return $base . '/' . ltrim($path, '/');
    }

    /** Относителен път за линкове в страниците (поддържа инсталация в подпапка). */
    public function path(string $path = ''): string
    {
        $base = rtrim((string)$this->get('base_path', ''), '/');
        return $base . '/' . ltrim($path, '/');
    }

    public function render(string $template, array $vars = []): string
    {
        $app = $this;
        extract($vars, EXTR_SKIP);
        ob_start();
        require $this->root . '/templates/' . $template . '.php';
        return (string)ob_get_clean();
    }

    public function sign(string $data): string
    {
        return hash_hmac('sha256', $data, (string)$this->get('secret'));
    }
}
