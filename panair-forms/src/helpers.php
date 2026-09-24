<?php

declare(strict_types=1);

function e(mixed $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function format_bytes(int $bytes): string
{
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 1, ',', ' ') . ' MB';
    }
    return number_format(max(1, (int)round($bytes / 1024)), 0, ',', ' ') . ' KB';
}
