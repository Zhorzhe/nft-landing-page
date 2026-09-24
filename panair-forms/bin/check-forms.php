<?php
// Употреба: php bin/check-forms.php
// Проверява всички config/forms/*.json за грешки (невалиден JSON, дублирани полета, непознати типове).
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

$root = dirname(__DIR__);
$repo = new PanairForms\FormRepository($root . '/config/forms', new PanairForms\Settings($root . '/storage/settings.json'));
$ok = true;
foreach (glob($root . '/config/forms/*.json') as $file) {
    $slug = basename($file, '.json');
    if ($slug[0] === '_') {
        continue;
    }
    try {
        $form = $repo->get($slug);
        if ($form === null) {
            throw new RuntimeException('Невалидно име на файла (само малки латински букви, цифри и тире).');
        }
        $n = count($repo->fields($form));
        $to = implode(', ', $form['recipients']) ?: '(по подразбиране)';
        echo "OK   /forms/{$slug}  –  {$form['title']}  –  {$n} полета  –  получател: {$to}" . ($form['draft'] ? '  [ЧЕРНОВА]' : '') . "\n";
    } catch (Throwable $e) {
        $ok = false;
        echo "ГРЕШКА  {$slug}.json: {$e->getMessage()}\n";
    }
}
exit($ok ? 0 : 1);
