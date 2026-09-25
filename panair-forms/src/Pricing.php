<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Ориентировъчна стойност на заявените услуги (без отстъпки, без ДДС).
 * Правилата се описват в "pricing" на всеки формуляр; таблиците с количества (qty_table)
 * се смятат автоматично. Същото изчисление се прави и в браузъра (public/assets/form.js).
 *
 * Типове правила:
 *   fixed  {amount}                         – фиксирана сума (напр. регистрационна такса)
 *   qty    {field, price | price_by{field,map}} – количество × цена (напр. м² × EUR/м²)
 *   flag   {field, amount}                  – при отметнато поле
 *   chars  {fields[], free, chunk, amount}  – за всеки започнати "chunk" знака след първите "free"
 *   count  {field, free, amount}            – за всеки елемент (номера, разделени със запетая) след първите "free"
 *   rows   {field, amount}                  – за всеки запис в повтаряща се група
 */
final class Pricing
{
    /**
     * @return array{parts: array<string, array{title:string, lines:list<array>, total:float}>, net:float, vat:float, gross:float, vat_rate:float}
     */
    public static function compute(array $form, array $values): array
    {
        $parts = [];
        $net = 0.0;
        foreach ((array)($values['_parts'] ?? array_keys($form['parts'])) as $pid) {
            $part = $form['parts'][$pid] ?? null;
            if (!$part) {
                continue;
            }
            $lines = [];
            foreach ($part['pricing'] as $rule) {
                $line = self::rule($rule, $values);
                if ($line !== null) {
                    $lines[] = $line;
                }
            }
            foreach ($part['sections'] as $section) {
                foreach ($section['fields'] as $f) {
                    if ($f['type'] !== 'qty_table') {
                        continue;
                    }
                    $qtys = (array)($values[$f['name']] ?? []);
                    foreach ($f['rows'] as $row) {
                        if (isset($row['group']) || empty($qtys[$row['id']])) {
                            continue;
                        }
                        $q = (float)$qtys[$row['id']];
                        $lines[] = [
                            'label' => $row['label'],
                            'qty' => $q,
                            'unit' => $row['unit'],
                            'price' => $row['price'],
                            'total' => $row['price'] === null ? null : round($q * $row['price'], 2),
                        ];
                    }
                }
            }
            if (!$lines) {
                continue;
            }
            $total = round(array_sum(array_map(fn($l) => (float)$l['total'], $lines)), 2);
            $parts[$pid] = ['title' => $part['title'], 'lines' => $lines, 'total' => $total];
            $net += $total;
        }
        $rate = (float)$form['vat_rate'];
        $vat = round($net * $rate / 100, 2);
        return ['parts' => $parts, 'net' => round($net, 2), 'vat' => $vat, 'gross' => round($net + $vat, 2), 'vat_rate' => $rate];
    }

    private static function rule(array $r, array $values): ?array
    {
        $label = (string)($r['label'] ?? '');
        switch ($r['type'] ?? '') {
            case 'fixed':
                return self::line($label, 1, $r['unit'] ?? 'бр.', (float)$r['amount']);
            case 'qty':
                $q = (float)str_replace(',', '.', (string)($values[$r['field']] ?? 0));
                if ($q <= 0) {
                    return null;
                }
                $price = $r['price'] ?? null;
                if (isset($r['price_by'])) {
                    $key = (string)($values[$r['price_by']['field']] ?? '');
                    if (!array_key_exists($key, $r['price_by']['map'])) {
                        return null;
                    }
                    $price = $r['price_by']['map'][$key];
                    if (isset($r['price_by']['labels'][$key])) {
                        $label .= ' – ' . $r['price_by']['labels'][$key];
                    }
                }
                return self::line($label, $q, $r['unit'] ?? 'м²', $price === null ? null : (float)$price);
            case 'flag':
                $v = $values[$r['field']] ?? '';
                return ($v !== '' && $v !== [] && $v !== null) ? self::line($label, 1, $r['unit'] ?? 'бр.', (float)$r['amount']) : null;
            case 'chars':
                $chars = 0;
                foreach ($r['fields'] as $name) {
                    $chars += mb_strlen(trim((string)($values[$name] ?? '')));
                }
                $units = (int)ceil(max(0, $chars - (int)($r['free'] ?? 0)) / max(1, (int)$r['chunk']));
                return $units > 0 ? self::line($label, $units, $r['unit'] ?? 'x ' . $r['chunk'] . ' знака', (float)$r['amount']) : null;
            case 'count':
                $n = count(self::items($values[$r['field']] ?? ''));
                $q = max(0, $n - (int)($r['free'] ?? 0));
                return $q > 0 ? self::line($label, $q, $r['unit'] ?? 'бр.', (float)$r['amount']) : null;
            case 'rows':
                $n = count((array)($values[$r['field']] ?? []));
                return $n > 0 ? self::line($label, $n, $r['unit'] ?? 'бр.', (float)$r['amount']) : null;
        }
        return null;
    }

    /** "12, 15; 21" → ["12","15","21"] */
    public static function items(mixed $v): array
    {
        if (is_array($v)) {
            return $v;
        }
        return array_values(array_filter(preg_split('/[\s,;]+/', trim((string)$v)) ?: [], 'strlen'));
    }

    private static function line(string $label, float $qty, string $unit, ?float $price): array
    {
        return ['label' => $label, 'qty' => $qty, 'unit' => $unit, 'price' => $price, 'total' => $price === null ? null : round($qty * $price, 2)];
    }

    public static function money(?float $v, string $cur = 'EUR'): string
    {
        return $v === null ? 'по договаряне' : number_format($v, 2, ',', ' ') . ' ' . ($cur === 'EUR' ? '€' : $cur);
    }

    public static function qty(float $q): string
    {
        return rtrim(rtrim(number_format($q, 2, ',', ' '), '0'), ',');
    }
}
