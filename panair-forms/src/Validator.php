<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Сървърна валидация на изпратените данни спрямо дефиницията на формата.
 * (Клиентската валидация в браузъра е само за удобство — тази е задължителната.)
 */
final class Validator
{
    private const MIME = [
        'pdf' => ['application/pdf'],
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
        'doc' => ['application/msword', 'application/CDF-V2', 'application/vnd.ms-office', 'application/octet-stream'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
    ];

    public array $values = [];
    /** @var array<string, list<array{name:string,tmp:string,size:int,type:string}>> */
    public array $files = [];
    public array $errors = [];

    public function __construct(
        private readonly array $fields,
        private readonly int $maxFileBytes,
        private readonly array $allowedExt,
    ) {
    }

    public function validate(array $post, array $files): bool
    {
        foreach ($this->fields as $field) {
            $name = $field['name'];
            if ($field['type'] === 'file') {
                $this->validateFiles($field, self::normalizeFiles($files[$name] ?? null));
                continue;
            }
            $raw = $post[$name] ?? null;
            $this->validateValue($field, $raw);
        }
        return $this->errors === [];
    }

    private function validateValue(array $f, mixed $raw): void
    {
        $name = $f['name'];

        if ($f['type'] === 'checkboxes') {
            $vals = array_values(array_filter(array_map('strval', (array)($raw ?? [])), 'strlen'));
            $allowed = array_column($f['options'] ?? [], 'value');
            $vals = array_values(array_intersect($vals, $allowed));
            $this->values[$name] = $vals;
            if ($f['required'] && !$vals) {
                $this->errors[$name] = 'Изберете поне една опция.';
            }
            return;
        }

        if ($f['type'] === 'checkbox') {
            $this->values[$name] = !empty($raw) ? 'Да' : '';
            if ($f['required'] && empty($raw)) {
                $this->errors[$name] = 'Необходимо е потвърждение.';
            }
            return;
        }

        $value = is_string($raw) ? trim(str_replace("\r\n", "\n", $raw)) : '';
        $maxLen = $f['maxlength'] ?? ($f['type'] === 'textarea' ? 5000 : 300);
        if (mb_strlen($value) > $maxLen) {
            $value = mb_substr($value, 0, $maxLen);
        }
        $this->values[$name] = $value;

        if ($value === '') {
            if ($f['required']) {
                $this->errors[$name] = 'Полето е задължително.';
            }
            return;
        }

        switch ($f['type']) {
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->errors[$name] = 'Невалиден имейл адрес.';
                }
                break;
            case 'tel':
                $digits = preg_replace('/\D/', '', $value);
                if (!preg_match('/^\+?[0-9\s()\-\/.]+$/', $value) || strlen($digits) < 6 || strlen($digits) > 15) {
                    $this->errors[$name] = 'Невалиден телефонен номер.';
                }
                break;
            case 'eik':
                if (!Eik::isValid($value)) {
                    $this->errors[$name] = 'Невалиден ЕИК/БУЛСТАТ (проверете цифрите).';
                }
                break;
            case 'number':
                $num = str_replace([',', ' '], ['.', ''], $value);
                if (!is_numeric($num)) {
                    $this->errors[$name] = 'Въведете число.';
                } elseif (isset($f['min']) && (float)$num < $f['min']) {
                    $this->errors[$name] = 'Минималната стойност е ' . $f['min'] . '.';
                } elseif (isset($f['max']) && (float)$num > $f['max']) {
                    $this->errors[$name] = 'Максималната стойност е ' . $f['max'] . '.';
                } else {
                    $this->values[$name] = $num;
                }
                break;
            case 'date':
                $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
                if (!$d || $d->format('Y-m-d') !== $value) {
                    $this->errors[$name] = 'Невалидна дата.';
                }
                break;
            case 'select':
            case 'radio':
                if (!in_array($value, array_column($f['options'] ?? [], 'value'), true)) {
                    $this->errors[$name] = 'Изберете валидна опция.';
                }
                break;
        }

        if (!isset($this->errors[$name]) && !empty($f['pattern']) && !preg_match('/^(?:' . $f['pattern'] . ')$/u', $value)) {
            $this->errors[$name] = $f['pattern_message'] ?? 'Невалиден формат.';
        }
    }

    private function validateFiles(array $f, array $uploads): void
    {
        $name = $f['name'];
        $allowed = array_map('strtolower', $f['accept'] ?? $this->allowedExt);
        $maxBytes = isset($f['max_mb']) ? (int)($f['max_mb'] * 1048576) : $this->maxFileBytes;
        $ok = [];

        foreach ($uploads as $u) {
            if ($u['error'] === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if ($u['error'] === UPLOAD_ERR_INI_SIZE || $u['error'] === UPLOAD_ERR_FORM_SIZE || $u['size'] > $maxBytes) {
                $this->errors[$name] = sprintf('Файлът „%s“ е по-голям от %d MB.', $u['name'], $maxBytes / 1048576);
                return;
            }
            if ($u['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($u['tmp_name'])) {
                $this->errors[$name] = sprintf('Файлът „%s“ не беше качен успешно. Опитайте отново.', $u['name']);
                return;
            }
            $ext = strtolower(pathinfo($u['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowed, true)) {
                $this->errors[$name] = sprintf('Файлът „%s“ е в неразрешен формат. Разрешени: %s.', $u['name'], strtoupper(implode(', ', $allowed)));
                return;
            }
            $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($u['tmp_name']) ?: '';
            if (isset(self::MIME[$ext]) && !in_array($mime, self::MIME[$ext], true)) {
                $this->errors[$name] = sprintf('Съдържанието на „%s“ не отговаря на разширението .%s.', $u['name'], $ext);
                return;
            }
            $ok[] = ['name' => self::safeName($u['name']), 'tmp' => $u['tmp_name'], 'size' => (int)$u['size'], 'type' => $mime];
        }

        if (count($ok) > $f['max_files']) {
            $this->errors[$name] = 'Може да прикачите най-много ' . $f['max_files'] . ' файла.';
            return;
        }
        if ($f['required'] && !$ok) {
            $this->errors[$name] = 'Прикачете файл.';
            return;
        }
        $this->files[$name] = $ok;
        $this->values[$name] = array_column($ok, 'name');
    }

    /** Превръща $_FILES[x] (единичен или масив) в списък от файлове. */
    public static function normalizeFiles(?array $entry): array
    {
        if (!$entry || !isset($entry['name'])) {
            return [];
        }
        if (!is_array($entry['name'])) {
            return [$entry];
        }
        $out = [];
        foreach ($entry['name'] as $i => $n) {
            $out[] = [
                'name' => $n,
                'type' => $entry['type'][$i] ?? '',
                'tmp_name' => $entry['tmp_name'][$i] ?? '',
                'error' => $entry['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                'size' => $entry['size'][$i] ?? 0,
            ];
        }
        return $out;
    }

    public static function safeName(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[^\p{L}\p{N}._ -]+/u', '_', $name);
        $name = trim($name, ' .');
        return $name === '' ? 'file' : mb_substr($name, -120);
    }
}
