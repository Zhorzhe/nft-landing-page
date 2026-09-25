<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Настройки, редактирани от админ панела (напр. получатели на имейл).
 * Пазят се в storage/settings.json и имат предимство пред JSON файла на формата.
 */
final class Settings
{
    private ?array $data = null;

    public function __construct(private readonly string $file)
    {
    }

    public function all(): array
    {
        if ($this->data === null) {
            $this->data = is_file($this->file)
                ? (json_decode((string)file_get_contents($this->file), true) ?: [])
                : [];
        }
        return $this->data;
    }

    public function form(string $slug): array
    {
        return $this->all()['forms'][$slug] ?? [];
    }

    public function setForm(string $slug, array $values): void
    {
        $data = $this->all();
        $data['forms'][$slug] = array_replace_recursive($data['forms'][$slug] ?? [], $values);
        foreach (['recipients', 'cc'] as $k) {
            if (array_key_exists($k, $values)) {
                $data['forms'][$slug][$k] = $values[$k]; // списъците се заменят изцяло
            }
        }
        foreach ($values['parts'] ?? [] as $pid => $p) {
            $data['forms'][$slug]['parts'][$pid]['recipients'] = $p['recipients'];
        }
        $dir = dirname($this->file);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $tmp = $this->file . '.tmp';
        file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        rename($tmp, $this->file);
        $this->data = $data;
    }
}
