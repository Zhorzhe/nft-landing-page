<?php

declare(strict_types=1);

namespace PanairForms;

use PHPMailer\PHPMailer\PHPMailer;

/**
 * Изпраща заявката до организатора (с прикачени файлове) и потвърждение до подателя.
 */
final class Mailer
{
    public function __construct(private readonly App $app)
    {
    }

    /** Имейл до организатора. Връща null при успех или текст на грешката. */
    public function sendToOrganizer(array $form, array $record): ?string
    {
        $recipients = array_values(array_filter($form['recipients'] ?: (array)$this->app->get('default_recipients', [])));
        if (!$recipients) {
            return 'Няма зададен получател за тази форма.';
        }

        $mail = $this->create();
        foreach ($recipients as $to) {
            $mail->addAddress($to);
        }
        foreach ($form['cc'] ?? [] as $cc) {
            $mail->addCC($cc);
        }
        $replyTo = (string)($record['values'][$form['reply_to_field']] ?? '');
        if (filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $mail->addReplyTo($replyTo, (string)($record['values']['contact_person'] ?? ''));
        }

        $company = trim((string)$record['company']);
        $mail->Subject = sprintf('Заявка за участие – %s – %s (%s)', $form['title'], $company !== '' ? $company : 'без име', $record['reference']);

        $limit = (int)($this->app->get('mail.max_attachments_total_mb', 20) * 1048576);
        $total = 0;
        $skipped = [];
        $dir = $this->app->storagePath('submissions/' . $record['reference']);
        foreach ($record['files'] as $f) {
            if ($total + $f['size'] > $limit) {
                $skipped[] = $f['name'];
                continue;
            }
            $mail->addAttachment($dir . '/' . $f['stored'], $f['name']);
            $total += $f['size'];
        }

        $intro = 'Получена е нова заявка за участие чрез онлайн формуляра.';
        if ($skipped) {
            $intro .= ' Поради ограничение в размера на имейла следните файлове НЕ са прикачени и могат да бъдат изтеглени от админ панела: ' . implode(', ', $skipped) . '.';
        }
        $mail->Body = $this->app->render('email', [
            'form' => $form, 'record' => $record, 'intro' => $intro,
            'rows' => $this->rows($form, $record),
            'adminUrl' => $this->app->url('admin/submission/' . rawurlencode($record['reference'])),
        ]);
        $mail->AltBody = $this->plainText($form, $record, $intro);

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
        $recipients = $form['recipients'] ?: (array)$this->app->get('default_recipients', []);
        if ($recipients) {
            $mail->addReplyTo($recipients[0]);
        }
        $mail->Subject = sprintf('Потвърждение: заявка за участие в %s (%s)', $form['title'], $record['reference']);
        $intro = 'Благодарим Ви! Получихме Вашата заявка за участие. По-долу е копие на изпратените данни. Наш представител ще се свърже с Вас.';
        $mail->Body = $this->app->render('email', [
            'form' => $form, 'record' => $record, 'intro' => $intro,
            'rows' => $this->rows($form, $record), 'adminUrl' => null,
        ]);
        $mail->AltBody = $this->plainText($form, $record, $intro);
        return $this->send($mail);
    }

    /**
     * Данните, групирани по секции, с човешки четими стойности.
     * @return list<array{title:string, items:list<array{label:string,value:string}>}>
     */
    public function rows(array $form, array $record): array
    {
        $out = [];
        foreach ($form['sections'] as $section) {
            $items = [];
            foreach ($section['fields'] as $f) {
                if ($f['type'] === 'note') {
                    continue;
                }
                $items[] = ['label' => strip_tags($f['short_label'] ?? $f['label']), 'value' => self::display($f, $record['values'][$f['name']] ?? '')];
            }
            if ($items) {
                $out[] = ['title' => (string)($section['title'] ?? ''), 'items' => $items];
            }
        }
        return $out;
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
        return match ($f['type']) {
            'select', 'radio' => $value === '' ? '' : $labelOf((string)$value),
            'checkboxes' => implode('; ', array_map($labelOf, (array)$value)),
            'file' => implode(', ', (array)$value),
            'number' => $value === '' ? '' : $value . (isset($f['unit']) ? ' ' . $f['unit'] : ''),
            'date' => $value === '' ? '' : date('d.m.Y', strtotime((string)$value)),
            default => (string)$value,
        };
    }

    private function plainText(array $form, array $record, string $intro): string
    {
        $lines = [$form['title'] . ' – ' . $form['subtitle'], 'Номер на заявката: ' . $record['reference'], 'Дата: ' . $record['created_at'], '', $intro, ''];
        foreach ($this->rows($form, $record) as $section) {
            if ($section['title'] !== '') {
                $lines[] = '== ' . $section['title'] . ' ==';
            }
            foreach ($section['items'] as $item) {
                $lines[] = $item['label'] . ': ' . ($item['value'] !== '' ? $item['value'] : '—');
            }
            $lines[] = '';
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
