<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Проверка на ЕИК/БУЛСТАТ (9 или 13 цифри, с контролна цифра).
 * Приема и ДДС номер с префикс "BG", както и чуждестранни ДДС/регистрационни номера.
 */
final class Eik
{
    public static function isValid(string $value): bool
    {
        $v = strtoupper(preg_replace('/[\s.\-]/', '', $value));
        if (str_starts_with($v, 'BG')) {
            $v = substr($v, 2);
        }
        if (preg_match('/^\d{9}$/', $v)) {
            return self::check9($v);
        }
        if (preg_match('/^\d{13}$/', $v)) {
            return self::check9(substr($v, 0, 9)) && self::check13($v);
        }
        // ЕГН като ЕИК на едноличен търговец (10 цифри) или чуждестранен номер.
        if (preg_match('/^\d{10}$/', $v)) {
            return true;
        }
        return (bool)preg_match('/^[A-Z]{2}[0-9A-Z]{2,13}$/', $v);
    }

    private static function check9(string $v): bool
    {
        $d = array_map('intval', str_split($v));
        $sum = 0;
        for ($i = 0; $i < 8; $i++) {
            $sum += $d[$i] * ($i + 1);
        }
        $r = $sum % 11;
        if ($r === 10) {
            $sum = 0;
            for ($i = 0; $i < 8; $i++) {
                $sum += $d[$i] * ($i + 3);
            }
            $r = $sum % 11;
            if ($r === 10) {
                $r = 0;
            }
        }
        return $r === $d[8];
    }

    private static function check13(string $v): bool
    {
        $d = array_map('intval', str_split($v));
        $sum = $d[8] * 2 + $d[9] * 7 + $d[10] * 3 + $d[11] * 5;
        $r = $sum % 11;
        if ($r === 10) {
            $sum = $d[8] * 4 + $d[9] * 9 + $d[10] * 5 + $d[11] * 7;
            $r = $sum % 11;
            if ($r === 10) {
                $r = 0;
            }
        }
        return $r === $d[12];
    }
}
