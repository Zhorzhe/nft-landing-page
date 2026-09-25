<?php

declare(strict_types=1);

namespace PanairForms;

use PHPMailer\PHPMailer\PHPMailer;

/**
 * Изпраща заявката до организатора (с прикачени файлове) и потвърждение до подателя.
 *
 * Когато страницата събира няколко формуляра, всеки отдел получава своите формуляри
 * плюс задължителните (Формуляр 1 с данните на изложителя). Адресите с еднакъв набор
 * формуляри получават едно общо писмо.
 */
final class Mailer
{
    public function __construct(private readonly App $app)
    {
    }

    /**
     * Групи получатели: [['to' => [...адреси], 'parts' => [...id на формуляри]], ...]
     */
    public function recipientGroups(array $form, array $record): array
    {
        $selected = (array)($record['values']['_parts'] ?? array_keys($form['parts']));
        $default = (array)$this->app->get('default_recipients', []);
        $required = array_values(array_filter($selected, fn($pid) => !empty($form['parts'][$pid]['required'])));

        $byAddress = [];
        foreach ($selected as $pid) {
            if (!isset($form['parts'][$pid])) {
                continue;
            }
            foreach (FormRepository::recipientsOf($form, $form['parts'][$pid], $default) as $addr) {
                $byAddress[strtolower($addr)][] = $pid;
            }
        }
        $groups = [];
        foreach ($byAddress as $addr => $parts) {
            $parts = array_values(array_unique(array_merge($required, $parts)));
            $parts = array_values(array_intersect($selected, $parts)); // запазва реда от страницата
            $key = implode(',', $parts);
            $groups[$key]['to'][] = $addr;
            $groups[$key]['parts'] = $parts;
        }
        return array_values($groups);
    }

    /** Имейл(и) до организатора. Връща null при успех или текст на грешката. */
    public function sendToOrganizer(array $form, array $record): ?string
    {
        $groups = $this->recipientGroups($form, $record);
        if (!$groups) {
            return 'Няма зададен получател за тази форма.';
        }
        $errors = [];
        foreach ($groups as $g) {
            $err = $this->sendGroup($form, $record, $g['to'], $g['parts']);
            if ($err !== null) {
                $errors[] = implode(', ', $g['to']) . ': ' . $err;
            }
        }
        return $errors ? implode(' | ', $errors) : null;
    }

    private function sendGroup(array $form, array $record, array $to, array $parts): ?string
    {
        $mail = $this->create();
        foreach ($to as $addr) {
            $mail->addAddress($addr);
        }
        foreach ($form['cc'] ?? [] as $cc) {
            $mail->addCC($cc);
        }
        $replyTo = (string)($record['values'][$form['reply_to_field']] ?? '');
        if (filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $mail->addReplyTo($replyTo, (string)($record['values']['contact_person'] ?? ''));
        }

        $company = trim((string)$record['company']);
        $codes = $this->codes($form, $parts);
        $mail->Subject = sprintf('Заявка – %s – %s%s (%s)', $form['title'], $company !== '' ? $company : 'без име', $codes ? ' – ' . $codes : '', $record['reference']);

        // Прикачват се само файловете от формулярите, предназначени за тези получатели.
        $partFields = [];
        foreach ($this->app->forms()->fields($form, $parts) as $f) {
            $partFields[$f['name']] = true;
        }
        $limit = (int)($this->app->get('mail.max_attachments_total_mb', 20) * 1048576);
        $total = 0;
        $skipped = [];
        $dir = $this->app->storagePath('submissions/' . $record['reference']);
        foreach ($record['files'] as $f) {
            if (!isset($partFields[$f['field']])) {
                continue;
            }
            if ($total + $f['size'] > $limit) {
                $skipped[] = $f['name'];
                continue;
            }
            $mail->addAttachment($dir . '/' . $f['stored'], $f['name']);
            $total += $f['size'];
        }

        $intro = 'Получена е нова заявка чрез онлайн формуляра' . ($codes ? ' (' . $codes . ')' : '') . '.';
        if (count($record['values']['_parts'] ?? []) > count($parts)) {
            $intro .= ' Изложителят е попълнил и други формуляри, които са изпратени до съответните отдели: ' . $this->codes($form, array_diff($record['values']['_parts'], $parts)) . '.';
        }
        if ($skipped) {
            $intro .= ' Поради ограничение в размера на имейла следните файлове НЕ са прикачени и могат да бъдат изтеглени от админ панела: ' . implode(', ', $skipped) . '.';
        }
        $vars = [
            'form' => $form, 'record' => $record, 'intro' => $intro,
            'blocks' => $this->blocks($form, $record, $parts),
            'pricing' => $this->pricing($form, $record, $parts),
            'fullNet' => count($record['values']['_parts'] ?? []) > count($parts) ? Pricing::compute($form, $record['values'])['net'] : null,
            'adminUrl' => $this->app->url('admin/submission/' . rawurlencode($record['reference'])),
        ];
        $mail->Body = $this->app->render('email', $vars);
        $mail->AltBody = $this->plainText($vars);

        return $this->send($mail);
    }

    /** Потвърждение с копие на данните до подателя (без прикачените файлове). */
    public function sendConfirmation(array $form, array $record): ?string
    {
        $to = (string)($record['values'][$form['reply_to_field']] ?? '');
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return 'Няма валиден имейл на подателя.';
        }
        $mail = $this->create();
        $mail->addAddress($to);
        $first = $this->recipientGroups($form, $record)[0]['to'][0] ?? null;
        if ($first) {
            $mail->addReplyTo($first);
        }
        $mail->Subject = sprintf('Потвърждение: заявка за %s (%s)', $form['title'], $record['reference']);
        $intro = 'Благодарим Ви! Получихме Вашата заявка. По-долу е копие на изпратените данни. Наш представител ще се свърже с Вас за потвърждение и проформа-фактура.';
        $parts = (array)($record['values']['_parts'] ?? array_keys($form['parts']));
        $vars = [
            'form' => $form, 'record' => $record, 'intro' => $intro,
            'blocks' => $this->blocks($form, $record, $parts),
            'pricing' => $this->pricing($form, $record, $parts),
            'fullNet' => null,
            'adminUrl' => null,
        ];
        $mail->Body = $this->app->render('email', $vars);
        $mail->AltBody = $this->plainText($vars);
        return $this->send($mail);
    }

    /**
     * Данните, групирани по формуляри и секции, с човешки четими стойности.
     * @return list<array{title:string, sections:list<array{title:string, items:list<array{label:string,value:string}>}>}>
     */
    public function blocks(array $form, array $record, ?array $parts = null): array
    {
        $values = $record['values'];
        $parts ??= (array)($values['_parts'] ?? array_keys($form['parts']));
        $out = [];
        foreach ($parts as $pid) {
            $part = $form['parts'][$pid] ?? null;
            if (!$part) {
                continue;
            }
            $sections = [];
            foreach ($part['sections'] as $section) {
                $items = [];
                foreach ($section['fields'] as $f) {
                    if ($f['type'] === 'note' || !array_key_exists($f['name'], $values)) {
                        continue; // скрито поле (show_if) или непопълнен формуляр
                    }
                    $items[] = ['label' => strip_tags($f['short_label'] ?? $f['label']), 'value' => self::display($f, $values[$f['name']])];
                }
                if ($items) {
                    $sections[] = ['title' => (string)$section['title'], 'items' => $items];
                }
            }
            $title = $form['multipart'] ? trim(($part['code'] !== '' ? 'Формуляр ' . $part['code'] . ' – ' : '') . $part['title']) : '';
            $out[] = ['title' => $title, 'sections' => $sections];
        }
        return $out;
    }

    /** Ценово обобщение само за посочените формуляри. */
    public function pricing(array $form, array $record, array $parts): array
    {
        $values = $record['values'];
        $values['_parts'] = $parts;
        return Pricing::compute($form, $values);
    }

    public static function display(array $f, mixed $value): string
    {
        $labelOf = static function (string $v) use ($f): string {
            foreach ($f['options'] ?? [] as $o) {
                if ($o['value'] === $v) {
                    return $o['label'] . (isset($o['price']) ? ' (' . $o['price'] . ')' : '');
                }
            }
            return $v;
        };
        switch ($f['type']) {
            case 'select':
            case 'radio':
                return $value === '' ? '' : $labelOf((string)$value);
            case 'checkboxes':
                return implode('; ', array_map($labelOf, (array)$value));
            case 'file':
                return implode(', ', (array)$value);
            case 'number':
                return $value === '' ? '' : str_replace('.', ',', (string)$value) . (isset($f['unit']) ? ' ' . $f['unit'] : '');
            case 'date':
                return $value === '' ? '' : date('d.m.Y', strtotime((string)$value));
            case 'qty_table':
                $lines = [];
                foreach ($f['rows'] as $row) {
                    if (!isset($row['group']) && !empty($value[$row['id']])) {
                        $q = (float)$value[$row['id']];
                        $lines[] = $row['label'] . ' — ' . Pricing::qty($q) . ' ' . $row['unit']
                            . ($row['price'] !== null ? ' × ' . Pricing::money((float)$row['price']) . ' = ' . Pricing::money($q * $row['price']) : ' (по договаряне)');
                    }
                }
                return implode("\n", $lines);
            case 'repeater':
                $rows = [];
                foreach (array_values((array)$value) as $i => $row) {
                    $lines = [$f['item_label'] . ' ' . ($i + 1) . ':'];
                    foreach ($f['fields'] as $sub) {
                        if ($sub['type'] === 'note' || !array_key_exists($sub['name'], $row)) {
                            continue;
                        }
                        $v = self::display($sub, $row[$sub['name']]);
                        if ($v !== '') {
                            $lines[] = '  ' . strip_tags($sub['short_label'] ?? $sub['label']) . ': ' . $v;
                        }
                    }
                    $rows[] = implode("\n", $lines);
                }
                return implode("\n\n", $rows);
            default:
                return is_array($value) ? implode(', ', $value) : (string)$value;
        }
    }

    private function codes(array $form, array $parts): string
    {
        if (!$form['multipart']) {
            return '';
        }
        $codes = [];
        foreach ($parts as $pid) {
            $p = $form['parts'][$pid] ?? null;
            if ($p) {
                $codes[] = $p['code'] !== '' ? 'Ф' . $p['code'] : ($p['short'] ?? $p['title']);
            }
        }
        return implode(', ', $codes);
    }

    private function plainText(array $vars): string
    {
        $form = $vars['form'];
        $record = $vars['record'];
        $lines = [$form['title'] . ' – ' . $form['subtitle'], 'Номер на заявката: ' . $record['reference'], 'Дата: ' . $record['created_at'], '', $vars['intro'], ''];
        foreach ($vars['blocks'] as $block) {
            if ($block['title'] !== '') {
                $lines[] = '######## ' . mb_strtoupper($block['title']) . ' ########';
            }
            foreach ($block['sections'] as $section) {
                if ($section['title'] !== '') {
                    $lines[] = '== ' . $section['title'] . ' ==';
                }
                foreach ($section['items'] as $item) {
                    $lines[] = $item['label'] . ': ' . ($item['value'] !== '' ? $item['value'] : '—');
                }
                $lines[] = '';
            }
        }
        $p = $vars['pricing'];
        if ($p['parts']) {
            $lines[] = '== Ориентировъчна стойност' . ($vars['fullNet'] !== null ? ' на формулярите в това писмо' : '') . ' (без отстъпки) ==';
            foreach ($p['parts'] as $part) {
                foreach ($part['lines'] as $l) {
                    $lines[] = $l['label'] . ': ' . Pricing::qty($l['qty']) . ' ' . $l['unit'] . ' × ' . Pricing::money($l['price']) . ' = ' . Pricing::money($l['total']);
                }
            }
            $lines[] = 'Общо без ДДС: ' . Pricing::money($p['net']);
            $lines[] = 'ДДС ' . $p['vat_rate'] . '%: ' . Pricing::money($p['vat']);
            $lines[] = 'Общо с ДДС: ' . Pricing::money($p['gross']);
            if ($vars['fullNet'] !== null) {
                $lines[] = 'Стойност на цялата заявка (всички формуляри), без ДДС: ' . Pricing::money($vars['fullNet']);
            }
        }
        return implode("\n", $lines);
    }

    private function create(): PHPMailer
    {
        $m = new PHPMailer(true);
        $m->CharSet = PHPMailer::CHARSET_UTF8;
        $m->Encoding = PHPMailer::ENCODING_BASE64;
        $m->isHTML(true);
        $m->setFrom((string)$this->app->get('mail.from_email'), (string)$this->app->get('mail.from_name', ''));

        switch ($this->app->get('mail.transport', 'smtp')) {
            case 'smtp':
                $m->isSMTP();
                $m->Host = (string)$this->app->get('mail.host');
                $m->Port = (int)$this->app->get('mail.port', 587);
                $enc = $this->app->get('mail.encryption', 'tls');
                $m->SMTPSecure = $enc === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : ($enc === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : '');
                $m->SMTPAutoTLS = $enc !== 'none';
                if ($this->app->get('mail.username')) {
                    $m->SMTPAuth = true;
                    $m->Username = (string)$this->app->get('mail.username');
                    $m->Password = (string)(getenv('PANAIR_SMTP_PASSWORD') ?: $this->app->get('mail.password'));
                }
                $m->Timeout = 20;
                break;
            case 'mail':
                $m->isMail();
                break;
            case 'log':
                // Тестов режим: имейлите се записват като .eml файлове в storage/mail/ вместо да се изпращат.
                break;
            default:
                throw new \RuntimeException('Непознат mail.transport');
        }
        return $m;
    }

    private function send(PHPMailer $mail): ?string
    {
        try {
            if ($this->app->get('mail.transport') === 'log') {
                $mail->preSend();
                $dir = $this->app->storagePath('mail');
                if (!is_dir($dir)) {
                    mkdir($dir, 0775, true);
                }
                file_put_contents(sprintf('%s/%s_%s.eml', $dir, date('Ymd-His'), bin2hex(random_bytes(3))), $mail->getSentMIMEMessage());
                return null;
            }
            $mail->send();
            return null;
        } catch (\Throwable $e) {
            return $mail->ErrorInfo ?: $e->getMessage();
        }
    }
}
