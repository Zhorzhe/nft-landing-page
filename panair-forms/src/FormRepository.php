<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Зарежда дефинициите на формите от config/forms/<slug>.json.
 * Всеки файл = една страница = един URL (/forms/<slug>).
 *
 * Една страница може да събира няколко формуляра ("parts"), напр. Формуляр 1, 1В, 2, 10...
 * Всеки формуляр има свои секции, полета, получатели и ценови правила.
 * Файл без "parts" (само "sections") се третира като един формуляр.
 */
final class FormRepository
{
    public const FIELD_TYPES = [
        'text', 'email', 'tel', 'eik', 'number', 'date', 'textarea',
        'select', 'radio', 'checkboxes', 'checkbox', 'file', 'note',
        'qty_table', 'repeater',
    ];

    public function __construct(private readonly string $dir, private readonly Settings $settings)
    {
    }

    /** @return array<string, array> всички форми (без тези, започващи с "_") */
    public function all(): array
    {
        $forms = [];
        foreach (glob($this->dir . '/*.json') ?: [] as $file) {
            $slug = basename($file, '.json');
            if ($slug[0] === '_') {
                continue;
            }
            $forms[$slug] = $this->get($slug);
        }
        uasort($forms, fn($a, $b) => strcmp($a['title'], $b['title']));
        return $forms;
    }

    public function get(string $slug): ?array
    {
        if (!preg_match('/^[a-z0-9][a-z0-9-]*$/', $slug)) {
            return null;
        }
        $file = $this->dir . '/' . $slug . '.json';
        if (!is_file($file)) {
            return null;
        }
        $form = $this->readJson($file);
        $form['slug'] = $slug;
        $form += [
            'title' => $slug,
            'subtitle' => 'Заявка за участие',
            'active' => true,
            'draft' => false,
            'recipients' => [],
            'cc' => [],
            'send_confirmation' => true,
            'reply_to_field' => 'email',
            'company_field' => 'company_name',
            'reference_prefix' => strtoupper(str_replace('-', '', $slug)),
            'sections' => [],
            'documents' => [],
            'vat_rate' => 20,
            'currency' => 'EUR',
        ];

        $settings = $this->settings->form($slug);
        // Промени от админ панела имат предимство пред JSON файла.
        foreach ($settings as $key => $value) {
            if (in_array($key, ['recipients', 'cc', 'send_confirmation', 'active'], true)) {
                $form[$key] = $value;
            }
        }

        $form['multipart'] = isset($form['parts']);
        $parts = $form['multipart'] ? $form['parts'] : [[
            'id' => 'main',
            'title' => '',
            'required' => true,
            'sections' => $form['sections'],
        ]];
        unset($form['sections']);

        if (!empty($form['declaration'])) {
            $last = array_key_last($parts);
            $parts[$last]['sections'][] = [
                'title' => $form['declaration_title'] ?? 'Декларация',
                'fields' => [[
                    'name' => 'declaration',
                    'type' => 'checkbox',
                    'label' => $form['declaration'],
                    'short_label' => 'Съгласие с декларацията',
                    'required' => true,
                ]],
            ];
        }

        $form['parts'] = [];
        foreach ($parts as $part) {
            $part += [
                'code' => '',
                'title' => '',
                'en' => '',
                'description' => '',
                'required' => false,
                'auto_if' => null,
                'deadline' => '',
                'recipients' => [],
                'pricing' => [],
                'sections' => [],
            ];
            if (!preg_match('/^[a-z0-9_]+$/', (string)($part['id'] ?? ''))) {
                throw new \RuntimeException("Формата {$slug}: всеки формуляр трябва да има \"id\" (латиница, цифри, _).");
            }
            if ($part['id'] === 'main') {
                $part['recipients'] = $form['recipients'];
            } elseif (isset($settings['parts'][$part['id']]['recipients'])) {
                $part['recipients'] = $settings['parts'][$part['id']]['recipients'];
            }
            $sections = [];
            foreach ($part['sections'] as $section) {
                if (isset($section['use'])) {
                    $section = array_merge(
                        $this->readJson($this->dir . '/_sections/' . basename($section['use']) . '.json'),
                        array_diff_key($section, ['use' => 1])
                    );
                }
                $section += ['title' => '', 'en' => '', 'description' => '', 'show_if' => null];
                $section['fields'] = array_map(fn($f) => $this->normalizeField($f, $part['id']), $section['fields'] ?? []);
                $sections[] = $section;
            }
            $part['sections'] = $sections;
            $form['parts'][$part['id']] = $part;
        }

        $names = [];
        foreach ($this->fields($form) as $field) {
            if (isset($names[$field['name']])) {
                throw new \RuntimeException("Формата {$slug}: полето \"{$field['name']}\" е дефинирано два пъти.");
            }
            $names[$field['name']] = true;
        }

        return $form;
    }

    /** Плосък списък от всички полета на формата (без "note"), с ключ "part". */
    public function fields(array $form, ?array $partIds = null): array
    {
        $out = [];
        foreach ($form['parts'] as $pid => $part) {
            if ($partIds !== null && !in_array($pid, $partIds, true)) {
                continue;
            }
            foreach ($part['sections'] as $section) {
                foreach ($section['fields'] as $field) {
                    if ($field['type'] !== 'note') {
                        $out[] = $field;
                    }
                }
            }
        }
        return $out;
    }

    /** Всички получатели на формуляр (с резервни стойности). */
    public static function recipientsOf(array $form, array $part, array $default): array
    {
        return array_values(array_filter($part['recipients'] ?: $form['recipients'] ?: $default));
    }

    public function isOpen(array $form): bool
    {
        if (!$form['active']) {
            return false;
        }
        if (!empty($form['deadline'])) {
            return date('Y-m-d') <= $form['deadline'];
        }
        return true;
    }

    private function normalizeField(array $field, string $part): array
    {
        $field += ['type' => 'text', 'required' => false, 'label' => '', 'en' => '', 'help' => '', 'width' => 'full', 'show_if' => null];
        $field['part'] = $part;
        if (!in_array($field['type'], self::FIELD_TYPES, true)) {
            throw new \RuntimeException("Непознат тип поле: {$field['type']}");
        }
        if ($field['type'] !== 'note' && !preg_match('/^[a-z0-9_]+$/', (string)($field['name'] ?? ''))) {
            throw new \RuntimeException("Поле без валидно \"name\" (латиница, цифри, _): {$field['label']}");
        }
        if (isset($field['options'])) {
            $field['options'] = array_map(static function ($opt) {
                if (!is_array($opt)) {
                    $opt = ['value' => (string)$opt, 'label' => (string)$opt];
                }
                $opt['value'] = (string)($opt['value'] ?? $opt['label']);
                $opt['label'] = (string)($opt['label'] ?? $opt['value']);
                return $opt;
            }, $field['options']);
        }
        if ($field['type'] === 'file') {
            $field += ['multiple' => false, 'max_files' => null];
            $field['max_files'] = $field['multiple'] ? (int)($field['max_files'] ?? 5) : 1;
        }
        if ($field['type'] === 'qty_table') {
            $field += ['unit_header' => 'Мярка', 'price_header' => 'Ед. цена', 'max_qty' => 9999];
            $ids = [];
            foreach ($field['rows'] ?? [] as $i => $row) {
                if (isset($row['group'])) {
                    continue;
                }
                if (!preg_match('/^[a-z0-9_]+$/', (string)($row['id'] ?? '')) || isset($ids[$row['id']])) {
                    throw new \RuntimeException("Таблица {$field['name']}: ред {$i} няма уникално \"id\".");
                }
                $ids[$row['id']] = true;
                $field['rows'][$i] += ['unit' => 'бр.', 'price' => null, 'en' => ''];
            }
        }
        if ($field['type'] === 'repeater') {
            $field += ['min' => $field['required'] ? 1 : 0, 'max' => 20, 'item_label' => 'Запис', 'add_label' => '+ Добави'];
            $field['fields'] = array_map(function ($sub) use ($field, $part) {
                $sub = $this->normalizeField($sub, $part);
                if (in_array($sub['type'], ['file', 'repeater', 'qty_table'], true)) {
                    throw new \RuntimeException("Повтарящата се група {$field['name']} не може да съдържа поле от тип {$sub['type']}.");
                }
                return $sub;
            }, $field['fields'] ?? []);
        }
        return $field;
    }

    private function readJson(string $file): array
    {
        if (!is_file($file)) {
            throw new \RuntimeException("Липсва файл: {$file}");
        }
        $data = json_decode((string)file_get_contents($file), true);
        if (!is_array($data)) {
            throw new \RuntimeException("Невалиден JSON в {$file}: " . json_last_error_msg());
        }
        return $data;
    }
}
