<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Сървърна валидация на изпратените данни спрямо дефиницията на формата.
 * (Клиентската валидация в браузъра е само за удобство — тази е задължителната.)
 * Проверяват се само избраните формуляри и само видимите полета (show_if).
 */
final class Validator
{
    private const MIME = [
        'pdf' => ['application/pdf'],
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'gif' => ['image/gif'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
        'doc' => ['application/msword', 'application/CDF-V2', 'application/vnd.ms-office', 'application/octet-stream'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
        'pps' => ['application/vnd.ms-powerpoint', 'application/CDF-V2', 'application/vnd.ms-office', 'application/octet-stream'],
        'ppsx' => ['application/vnd.openxmlformats-officedocument.presentationml.slideshow', 'application/zip', 'application/octet-stream'],
    ];

    public array $values = [];
    /** @var array<string, list<array{name:string,tmp:string,size:int,type:string}>> */
    public array $files = [];
    public array $errors = [];
    /** @var list<string> */
    public array $parts = [];

    public function __construct(
        private readonly int $maxFileBytes,
        private readonly array $allowedExt,
    ) {
    }

    public function validate(array $form, array $post, array $files): bool
    {
        // Скритите полета (show_if) и полетата от неизбрани формуляри се третират като празни,
        // за да не влияят на други условия — точно както в браузъра.
        $post = self::effective($form, $post);
        $this->parts = Conditions::selectedParts($form, $post);
        $this->values['_parts'] = $this->parts;

        foreach ($this->parts as $pid) {
            foreach ($form['parts'][$pid]['sections'] as $section) {
                if (!Conditions::match($section['show_if'], $post)) {
                    continue;
                }
                foreach ($section['fields'] as $f) {
                    if ($f['type'] === 'note' || !Conditions::match($f['show_if'], $post)) {
                        continue;
                    }
                    $name = $f['name'];
                    if ($f['type'] === 'file') {
                        $this->validateFiles($f, self::normalizeFiles($files[$name] ?? null));
                    } elseif ($f['type'] === 'repeater') {
                        $this->validateRepeater($f, $post[$name] ?? null);
                    } elseif ($f['type'] === 'qty_table') {
                        $this->validateQtyTable($f, $post[$name] ?? null);
                    } else {
                        [$value, $error] = $this->check($f, $post[$name] ?? null, $post);
                        $this->values[$name] = $value;
                        if ($error !== null) {
                            $this->errors[$name] = $error;
                        }
                    }
                }
            }
        }
        return $this->errors === [];
    }

    /** Премахва стойностите на невидимите полета (два прохода заради вериги от условия). */
    public static function effective(array $form, array $raw): array
    {
        for ($pass = 0; $pass < 2; $pass++) {
            $selected = Conditions::selectedParts($form, $raw);
            foreach ($form['parts'] as $pid => $part) {
                $partOn = in_array($pid, $selected, true);
                foreach ($part['sections'] as $section) {
                    $sectionOn = $partOn && Conditions::match($section['show_if'], $raw);
                    foreach ($section['fields'] as $f) {
                        if ($f['type'] !== 'note' && (!$sectionOn || !Conditions::match($f['show_if'], $raw))) {
                            unset($raw[$f['name']]);
                        }
                    }
                }
            }
        }
        return $raw;
    }

    /** @return array{0:mixed,1:?string} [нормализирана стойност, грешка] */
    private function check(array $f, mixed $raw, array $context): array
    {
        if ($f['type'] === 'checkboxes') {
            $vals = array_values(array_filter(array_map(fn($x) => is_scalar($x) ? (string)$x : '', (array)($raw ?? [])), 'strlen'));
            $vals = array_values(array_intersect($vals, array_column($f['options'] ?? [], 'value')));
            return [$vals, $f['required'] && !$vals ? 'Изберете поне една опция.' : null];
        }

        if ($f['type'] === 'checkbox') {
            return [!empty($raw) ? 'Да' : '', $f['required'] && empty($raw) ? 'Необходимо е потвърждение.' : null];
        }

        $value = is_string($raw) ? trim(str_replace("\r\n", "\n", $raw)) : '';
        $maxLen = $f['maxlength'] ?? ($f['type'] === 'textarea' ? 5000 : 300);
        if (mb_strlen($value) > $maxLen) {
            return [$value, 'Максимум ' . $maxLen . ' знака.'];
        }

        if ($value === '') {
            return ['', $f['required'] ? (in_array($f['type'], ['radio', 'select'], true) ? 'Изберете опция.' : 'Полето е задължително.') : null];
        }

        switch ($f['type']) {
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    return [$value, 'Невалиден имейл адрес.'];
                }
                break;
            case 'tel':
                $digits = preg_replace('/\D/', '', $value);
                if (!preg_match('/^\+?[0-9\s()\-\/.]+$/', $value) || strlen($digits) < 6 || strlen($digits) > 15) {
                    return [$value, 'Невалиден телефонен номер.'];
                }
                break;
            case 'eik':
                if (!Eik::isValid($value)) {
                    return [$value, 'Невалиден ЕИК/БУЛСТАТ (проверете цифрите).'];
                }
                break;
            case 'number':
                $num = str_replace([',', ' '], ['.', ''], $value);
                $min = $f['min'] ?? null;
                if (isset($f['min_by'])) {
                    $min = $f['min_by']['map'][(string)($context[$f['min_by']['field']] ?? '')] ?? $min;
                }
                if (!is_numeric($num)) {
                    return [$value, 'Въведете число.'];
                }
                if ($min !== null && (float)$num < $min) {
                    return [$value, 'Минималната стойност е ' . $min . (isset($f['unit']) ? ' ' . $f['unit'] : '') . '.'];
                }
                if (isset($f['max']) && (float)$num > $f['max']) {
                    return [$value, 'Максималната стойност е ' . $f['max'] . '.'];
                }
                $value = $num;
                break;
            case 'date':
                $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
                if (!$d || $d->format('Y-m-d') !== $value) {
                    return [$value, 'Невалидна дата.'];
                }
                break;
            case 'select':
            case 'radio':
                if (!in_array($value, array_column($f['options'] ?? [], 'value'), true)) {
                    return [$value, 'Изберете валидна опция.'];
                }
                break;
        }

        if (!empty($f['pattern']) && !preg_match('/^(?:' . str_replace('/', '\/', $f['pattern']) . ')$/u', $value)) {
            return [$value, $f['pattern_message'] ?? 'Невалиден формат.'];
        }
        return [$value, null];
    }

    private function validateRepeater(array $f, mixed $raw): void
    {
        $name = $f['name'];
        $rows = [];
        foreach (is_array($raw) ? array_values($raw) : [] as $rowRaw) {
            if (!is_array($rowRaw)) {
                continue;
            }
            $filled = false;
            foreach ($f['fields'] as $sub) {
                $v = $rowRaw[$sub['name'] ?? ''] ?? '';
                if ($sub['type'] !== 'note' && (is_array($v) ? array_filter($v, 'strlen') : trim((string)$v) !== '')) {
                    $filled = true;
                }
            }
            if ($filled) {
                $rows[] = $rowRaw;
            }
        }
        if (count($rows) > $f['max']) {
            $rows = array_slice($rows, 0, $f['max']);
        }

        $values = [];
        foreach ($rows as $i => $rowRaw) {
            $row = [];
            foreach ($f['fields'] as $sub) {
                if ($sub['type'] === 'note' || !Conditions::match($sub['show_if'], $rowRaw)) {
                    continue;
                }
                [$value, $error] = $this->check($sub, $rowRaw[$sub['name']] ?? null, $rowRaw);
                $row[$sub['name']] = $value;
                if ($error !== null) {
                    $this->errors[$name . '.' . $i . '.' . $sub['name']] = $error;
                }
            }
            $values[] = $row;
        }
        $this->values[$name] = $values;
        if (count($values) < $f['min']) {
            $this->errors[$name] = $f['min'] === 1 ? 'Добавете поне един запис.' : 'Добавете поне ' . $f['min'] . ' записа.';
        }
    }

    private function validateQtyTable(array $f, mixed $raw): void
    {
        $raw = is_array($raw) ? $raw : [];
        $out = [];
        foreach ($f['rows'] as $row) {
            if (isset($row['group'])) {
                continue;
            }
            $v = trim((string)(is_scalar($raw[$row['id']] ?? null) ? $raw[$row['id']] : ''));
            if ($v === '' || $v === '0') {
                continue;
            }
            $v = str_replace(',', '.', $v);
            if (!is_numeric($v) || (float)$v < 0 || (float)$v > $f['max_qty']) {
                $this->errors[$f['name']] = sprintf('Невалидно количество за „%s“.', $row['label']);
                continue;
            }
            $out[$row['id']] = $v + 0;
        }
        $this->values[$f['name']] = $out;
        if ($f['required'] && !$out && !isset($this->errors[$f['name']])) {
            $this->errors[$f['name']] = 'Посочете количество поне за една услуга.';
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
                $this->errors[$name] = sprintf('Файлът „%s“ е по-голям от %s MB.', $u['name'], rtrim(rtrim(number_format($maxBytes / 1048576, 1), '0'), '.'));
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
