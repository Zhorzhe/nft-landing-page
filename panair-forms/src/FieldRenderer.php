<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * HTML за полетата на формата. Използва се от templates/form.php.
 */
final class FieldRenderer
{
    public function __construct(
        private readonly array $values,
        private readonly array $errors,
        private readonly int $maxFileMb,
        private readonly array $allowedExt,
    ) {
    }

    /**
     * @param string     $prefix    име на групата за полета в повтаряща се група, напр. "f1b_companies[0]"
     * @param array|null $row       стойностите на реда (за повтаряща се група)
     * @param string     $errPrefix префикс на ключа за грешки, напр. "f1b_companies.0."
     */
    public function render(array $f, string $prefix = '', ?array $row = null, string $errPrefix = ''): string
    {
        $showIf = $f['show_if'] ? ' data-show-if="' . e(json_encode($f['show_if'], JSON_UNESCAPED_UNICODE)) . '"' : '';
        $scope = $prefix !== '' ? ' data-scope="' . e($prefix) . '"' : '';

        if ($f['type'] === 'note') {
            return '<div class="field full note' . (!empty($f['tone']) ? ' note-' . e($f['tone']) : '') . '"' . $showIf . $scope . '>'
                . ($f['html'] ?? nl2br(e($f['label']))) . '</div>';
        }

        $n = $f['name'];
        $inputName = $prefix !== '' ? $prefix . '[' . $n . ']' : $n;
        $id = 'f_' . trim(preg_replace('/[^a-z0-9]+/i', '_', $inputName), '_');
        $value = $row !== null ? ($row[$n] ?? null) : ($this->values[$n] ?? null);
        if ($value === null && array_key_exists('default', $f)) {
            $value = $f['default'];
        }
        $err = $this->errors[$errPrefix . $n] ?? null;
        $req = $f['required'] ? ' required' : '';
        $describedBy = trim(($f['help'] ? $id . '_help ' : '') . $id . '_err');
        $aria = ' aria-describedby="' . e($describedBy) . '"' . ($err ? ' aria-invalid="true"' : '');
        $width = in_array($f['width'], ['half', 'third', 'two-thirds'], true) ? $f['width'] : 'full';
        if (in_array($f['type'], ['qty_table', 'repeater'], true)) {
            $width = 'full';
        }
        $cls = 'field ' . $width . ($err ? ' has-error' : '');
        $star = $f['required'] ? ' <span class="req" aria-hidden="true">*</span>' : '';
        $en = $f['en'] !== '' ? ' <span class="en" lang="en">' . e($f['en']) . '</span>' : '';
        $ph = isset($f['placeholder']) ? ' placeholder="' . e($f['placeholder']) . '"' : '';

        $h = '<div class="' . $cls . '" data-field="' . e($inputName) . '" data-type="' . e($f['type']) . '"' . ($f['required'] ? ' data-required="1"' : '') . $showIf . $scope . '>';

        switch ($f['type']) {
            case 'radio':
            case 'checkboxes':
                $h .= '<fieldset class="choice-group' . (!empty($f['inline']) ? ' inline' : '') . '"' . $aria . ($req ? ' data-required="1"' : '') . '>';
                $h .= '<legend class="label">' . e($f['label']) . $star . $en . '</legend>';
                foreach ($f['options'] as $o) {
                    $checked = $f['type'] === 'radio' ? ((string)$value === $o['value']) : in_array($o['value'], (array)$value, true);
                    $h .= '<label class="choice"><input type="' . ($f['type'] === 'radio' ? 'radio' : 'checkbox') . '" name="' . e($inputName) . ($f['type'] === 'checkboxes' ? '[]' : '') . '" value="' . e($o['value']) . '"' . ($checked ? ' checked' : '') . '>';
                    $h .= '<span class="choice-text">' . e($o['label']);
                    if (!empty($o['en'])) {
                        $h .= ' <span class="en" lang="en">' . e($o['en']) . '</span>';
                    }
                    if (isset($o['price'])) {
                        $h .= ' <span class="price">' . e($o['price']) . '</span>';
                    }
                    if (!empty($o['description'])) {
                        $h .= '<small class="opt-desc">' . e($o['description']) . '</small>';
                    }
                    $h .= '</span></label>';
                }
                $h .= '</fieldset>';
                break;

            case 'checkbox':
                $toggle = !empty($f['toggles_part']) ? ' data-toggles-part="' . e($f['toggles_part']) . '"' : '';
                $h .= '<label class="choice single"><input type="checkbox" id="' . $id . '" name="' . e($inputName) . '" value="1"' . ($value ? ' checked' : '') . $req . $aria . $toggle . '>';
                $h .= '<span class="choice-text">' . ($f['label_html'] ?? e($f['label'])) . $star . $en;
                if (isset($f['price'])) {
                    $h .= ' <span class="price">' . e($f['price']) . '</span>';
                }
                $h .= '</span></label>';
                break;

            case 'qty_table':
                $h .= $this->label($f, $id, $star, $en, false);
                $h .= $this->qtyTable($f, $inputName, (array)$value);
                break;

            case 'repeater':
                $h .= $this->label($f, $id, $star, $en, false);
                $h .= $this->repeater($f, $inputName, is_array($value) ? $value : []);
                break;

            default:
                $h .= $this->label($f, $id, $star, $en, true);
                if ($f['type'] === 'textarea') {
                    $max = (int)($f['maxlength'] ?? 5000);
                    $h .= '<textarea id="' . $id . '" name="' . e($inputName) . '" rows="' . (int)($f['rows'] ?? 4) . '" maxlength="' . $max . '"' . $req . $aria . $ph . (!empty($f['counter']) ? ' data-counter="1"' : '') . '>' . e($value) . '</textarea>';
                } elseif ($f['type'] === 'select') {
                    $h .= '<select id="' . $id . '" name="' . e($inputName) . '"' . $req . $aria . '>';
                    $h .= '<option value="">' . e($f['placeholder'] ?? '— Изберете —') . '</option>';
                    foreach ($f['options'] as $o) {
                        $h .= '<option value="' . e($o['value']) . '"' . ((string)$value === $o['value'] ? ' selected' : '') . '>' . e($o['label']) . (isset($o['price']) ? ' — ' . e($o['price']) : '') . '</option>';
                    }
                    $h .= '</select>';
                } elseif ($f['type'] === 'file') {
                    $ext = $f['accept'] ?? $this->allowedExt;
                    $mb = $f['max_mb'] ?? $this->maxFileMb;
                    $h .= '<input type="file" id="' . $id . '" name="' . e($inputName) . ($f['multiple'] ? '[]' : '') . '"' . ($f['multiple'] ? ' multiple data-max-files="' . (int)$f['max_files'] . '"' : '')
                        . ' accept="' . e(implode(',', array_map(fn($x) => '.' . $x, $ext))) . '"' . $req . $aria . ' data-max-mb="' . e($mb) . '">';
                    $h .= '<p class="hint">Формати: ' . e(strtoupper(implode(', ', $ext))) . ' · до ' . e($mb) . ' MB на файл' . ($f['multiple'] ? ' · до ' . (int)$f['max_files'] . ' файла' : '') . '</p>';
                } else {
                    $type = ['eik' => 'text', 'number' => 'text', 'tel' => 'tel', 'email' => 'email', 'date' => 'date'][$f['type']] ?? 'text';
                    $extra = '';
                    foreach (['min', 'max'] as $a) {
                        if (isset($f[$a])) {
                            $extra .= ' data-' . $a . '="' . e($f[$a]) . '"';
                        }
                    }
                    if (isset($f['min_by'])) {
                        $extra .= ' data-min-by="' . e(json_encode($f['min_by'], JSON_UNESCAPED_UNICODE)) . '"';
                    }
                    $auto = $f['autocomplete'] ?? (['email' => 'email', 'tel' => 'tel'][$f['type']] ?? null);
                    if ($auto) {
                        $extra .= ' autocomplete="' . e($auto) . '"';
                    }
                    if ($f['type'] === 'number') {
                        $extra .= ' inputmode="decimal"';
                    }
                    if (!empty($f['pattern'])) {
                        $extra .= ' pattern="' . e($f['pattern']) . '" data-pattern-message="' . e($f['pattern_message'] ?? 'Невалиден формат.') . '"';
                    }
                    if (!empty($f['counter'])) {
                        $extra .= ' data-counter="1"';
                    }
                    $h .= '<div class="input-wrap' . (isset($f['unit']) ? ' has-unit' : '') . '">';
                    $h .= '<input type="' . $type . '" id="' . $id . '" name="' . e($inputName) . '" value="' . e($value) . '" data-type="' . e($f['type']) . '" maxlength="' . (int)($f['maxlength'] ?? 300) . '"' . $req . $aria . $ph . $extra . '>';
                    if (isset($f['unit'])) {
                        $h .= '<span class="unit">' . e($f['unit']) . '</span>';
                    }
                    $h .= '</div>';
                }
        }

        if ($f['help']) {
            $h .= '<p class="hint" id="' . $id . '_help">' . e($f['help']) . '</p>';
        }
        $h .= '<p class="error-msg" id="' . $id . '_err" role="alert">' . ($err ? e($err) : '') . '</p>';
        return $h . '</div>';
    }

    private function label(array $f, string $id, string $star, string $en, bool $for): string
    {
        if ($f['label'] === '') {
            return '';
        }
        return '<' . ($for ? 'label for="' . $id . '"' : 'p') . ' class="label">' . e($f['label']) . $star . $en . '</' . ($for ? 'label' : 'p') . '>';
    }

    private function qtyTable(array $f, string $name, array $qtys): string
    {
        $h = '<div class="qty-wrap"><table class="qty-table" data-qty-table="' . e($name) . '">';
        $h .= '<thead><tr><th scope="col">Услуга</th><th scope="col" class="c-unit">' . e($f['unit_header']) . '</th><th scope="col" class="c-num">' . e($f['price_header']) . '</th><th scope="col" class="c-qty">Количество</th><th scope="col" class="c-num">Сума</th></tr></thead><tbody>';
        foreach ($f['rows'] as $row) {
            if (isset($row['group'])) {
                $h .= '<tr class="qty-group"><th colspan="5" scope="colgroup">' . e($row['group']) . (!empty($row['en']) ? ' <span class="en" lang="en">' . e($row['en']) . '</span>' : '') . '</th></tr>';
                continue;
            }
            $id = 'q_' . preg_replace('/[^a-z0-9]+/i', '_', $name . '_' . $row['id']);
            $q = $qtys[$row['id']] ?? '';
            $price = $row['price'];
            $h .= '<tr' . ($q !== '' ? ' class="is-ordered"' : '') . '>';
            $h .= '<th scope="row" class="c-label"><label for="' . $id . '">' . e($row['label']) . (!empty($row['en']) ? ' <span class="en" lang="en">' . e($row['en']) . '</span>' : '') . (!empty($row['note']) ? '<small class="opt-desc">' . e($row['note']) . '</small>' : '') . '</label></th>';
            $h .= '<td class="c-unit" data-label="Мярка">' . e($row['unit']) . '</td>';
            $h .= '<td class="c-num" data-label="Ед. цена">' . ($price === null ? 'по договаряне' : e(Pricing::money((float)$price))) . '</td>';
            $h .= '<td class="c-qty" data-label="Количество"><input type="text" inputmode="decimal" id="' . $id . '" name="' . e($name) . '[' . e($row['id']) . ']" value="' . e($q) . '" data-price="' . e($price ?? '') . '" maxlength="6" autocomplete="off" aria-label="Количество: ' . e($row['label']) . '"></td>';
            $h .= '<td class="c-num row-total" data-label="Сума">' . ($q !== '' && $price !== null ? e(Pricing::money((float)$q * (float)$price)) : '') . '</td>';
            $h .= '</tr>';
        }
        return $h . '</tbody></table></div>';
    }

    private function repeater(array $f, string $name, array $rows): string
    {
        $min = max(1, (int)$f['min']);
        while (count($rows) < $min) {
            $rows[] = [];
        }
        $h = '<div class="repeater" data-repeater="' . e($name) . '" data-max="' . (int)$f['max'] . '" data-min="' . (int)$f['min'] . '">';
        $h .= '<div class="repeater-rows">';
        foreach (array_values($rows) as $i => $row) {
            $h .= $this->repeaterRow($f, $name, (string)$i, $row, $i + 1);
        }
        $h .= '</div>';
        $h .= '<template>' . $this->repeaterRow($f, $name, '__INDEX__', [], 0) . '</template>';
        $h .= '<button type="button" class="btn btn-secondary btn-add" data-add-row>' . e($f['add_label']) . '</button>';
        return $h . '</div>';
    }

    private function repeaterRow(array $f, string $name, string $index, array $row, int $number): string
    {
        $prefix = $name . '[' . $index . ']';
        $h = '<fieldset class="repeater-row"><legend><span class="row-title">' . e($f['item_label']) . ' <span class="row-no">' . ($number ?: '') . '</span></span>'
            . '<button type="button" class="link-btn" data-remove-row>Премахни</button></legend><div class="grid">';
        foreach ($f['fields'] as $sub) {
            $h .= $this->render($sub, $prefix, $row, $f['name'] . '.' . $index . '.');
        }
        return $h . '</div></fieldset>';
    }
}
