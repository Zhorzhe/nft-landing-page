<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Условно показване ("show_if" на поле/секция, "auto_if" на формуляр).
 * Примери: {"field":"nationality","equals":"foreign"}, {"field":"x","in":["a","b"]},
 * {"field":"x","filled":true}, {"field":"x","checked":true}, {"any":[...]}, {"all":[...]}.
 * Същата логика е реализирана и в public/assets/form.js.
 */
final class Conditions
{
    public static function match(?array $cond, array $raw): bool
    {
        if (!$cond) {
            return true;
        }
        if (isset($cond['all'])) {
            foreach ($cond['all'] as $c) {
                if (!self::match($c, $raw)) {
                    return false;
                }
            }
            return true;
        }
        if (isset($cond['any'])) {
            foreach ($cond['any'] as $c) {
                if (self::match($c, $raw)) {
                    return true;
                }
            }
            return false;
        }
        $v = $raw[$cond['field'] ?? ''] ?? '';
        $vals = array_values(array_filter(array_map(
            fn($x) => is_scalar($x) ? trim((string)$x) : '',
            is_array($v) ? $v : [$v]
        ), 'strlen'));
        if (array_key_exists('equals', $cond)) {
            return in_array((string)$cond['equals'], $vals, true);
        }
        if (isset($cond['in'])) {
            return (bool)array_intersect(array_map('strval', $cond['in']), $vals);
        }
        if (isset($cond['not_in'])) {
            return !array_intersect(array_map('strval', $cond['not_in']), $vals);
        }
        if (!empty($cond['filled']) || !empty($cond['checked'])) {
            return $vals !== [] && $vals !== ['0'];
        }
        if (!empty($cond['empty']) || !empty($cond['unchecked'])) {
            return $vals === [] || $vals === ['0'];
        }
        return true;
    }

    /** Кои формуляри от страницата са избрани: задължителните, автоматичните и отметнатите. */
    public static function selectedParts(array $form, array $raw): array
    {
        $chosen = array_map('strval', (array)($raw['_parts'] ?? []));
        $out = [];
        foreach ($form['parts'] as $pid => $part) {
            if ($part['required']) {
                $out[] = $pid;
            } elseif ($part['auto_if']) {
                if (self::match($part['auto_if'], $raw)) {
                    $out[] = $pid;
                }
            } elseif (in_array($pid, $chosen, true)) {
                $out[] = $pid;
            }
        }
        return $out;
    }
}
