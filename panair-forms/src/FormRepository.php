<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Зарежда дефинициите на формите от config/forms/<slug>.json.
 * Всеки файл = една форма = един URL (/forms/<slug>).
 */
final class FormRepository
{
    public const FIELD_TYPES = [
        'text', 'email', 'tel', 'eik', 'number', 'date', 'textarea',
        'select', 'radio', 'checkboxes', 'checkbox', 'file', 'note',
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
        ];

        // Промени от админ панела имат предимство пред JSON файла.
        foreach ($this->settings->form($slug) as $key => $value) {
            if (in_array($key, ['recipients', 'cc', 'send_confirmation', 'active'], true)) {
                $form[$key] = $value;
            }
        }

        $sections = [];
        foreach ($form['sections'] as $section) {
            if (isset($section['use'])) {
                $section = array_merge(
                    $this->readJson($this->dir . '/_sections/' . basename($section['use']) . '.json'),
                    array_diff_key($section, ['use' => 1])
                );
            }
            $section['fields'] = array_map([$this, 'normalizeField'], $section['fields'] ?? []);
            $sections[] = $section;
        }
        $form['sections'] = $sections;

        if (!empty($form['declaration'])) {
            $form['sections'][] = [
                'title' => $form['declaration_title'] ?? 'Декларация',
                'fields' => [$this->normalizeField([
                    'name' => 'declaration',
                    'type' => 'checkbox',
                    'label' => $form['declaration'],
                    'short_label' => 'Съгласие с декларацията',
                    'required' => true,
                ])],
            ];
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

    /** Плосък списък от всички полета на формата (без "note"). */
    public function fields(array $form): array
    {
        $out = [];
        foreach ($form['sections'] as $section) {
            foreach ($section['fields'] as $field) {
                if ($field['type'] !== 'note') {
                    $out[] = $field;
                }
            }
        }
        return $out;
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

    private function normalizeField(array $field): array
    {
        $field += ['type' => 'text', 'required' => false, 'label' => '', 'help' => '', 'width' => 'full'];
        if (!in_array($field['type'], self::FIELD_TYPES, true)) {
            throw new \RuntimeException("Непознат тип поле: {$field['type']}");
        }
        if ($field['type'] !== 'note' && empty($field['name'])) {
            throw new \RuntimeException("Поле без \"name\": {$field['label']}");
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
