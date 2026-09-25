<?php
/** @var PanairForms\App $app */
$theme = $app->get('theme', []);
$org = $app->get('organization', []);
$logo = $theme['logo'] ?? '';
?><!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title><?= e($title ?? 'Онлайн заявка') ?> | <?= e($org['name'] ?? 'Международен панаир Пловдив') ?></title>
<link rel="stylesheet" href="<?= e($app->path('assets/style.css')) ?>?v=2">
<style>:root{--primary:<?= e($theme['primary'] ?? '#004687') ?>;--primary-dark:<?= e($theme['primary_dark'] ?? '#00335f') ?>;--accent:<?= e($theme['accent'] ?? '#f1a833') ?>}</style>
<?php if (!empty($theme['favicon'])): ?><link rel="icon" href="<?= e($theme['favicon']) ?>"><?php endif ?>
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="<?= e($org['website'] ?? 'https://www.fair.bg') ?>">
      <?php if ($logo !== ''): ?>
        <img src="<?= e(str_starts_with($logo, 'http') ? $logo : $app->path($logo)) ?>" alt="<?= e($org['name'] ?? 'Международен панаир Пловдив') ?>" width="330" height="40">
      <?php else: ?>
        <span class="brand-text"><?= e($org['name'] ?? 'Международен панаир Пловдив') ?></span>
      <?php endif ?>
    </a>
    <?php if (!empty($form['event_url'])): ?>
      <a class="header-link" href="<?= e($form['event_url']) ?>">← Към страницата на изложбата</a>
    <?php endif ?>
  </div>
</header>
<main class="wrap<?= isset($form) && empty($form['multipart']) ? ' narrow-page' : '' ?>">
<?= $content ?>
</main>
<footer class="site-footer wrap">
  <p><?= e($org['name'] ?? 'Международен панаир Пловдив') ?><?php if (!empty($org['address'])): ?> · <?= e($org['address']) ?><?php endif ?><?php if (!empty($org['phone'])): ?> · <?= e($org['phone']) ?><?php endif ?></p>
  <?php if (!empty($org['privacy_url'])): ?><p><a href="<?= e($org['privacy_url']) ?>">Политика за защита на личните данни</a></p><?php endif ?>
</footer>
<?php if (isset($form)): ?><script src="<?= e($app->path('assets/form.js')) ?>?v=2" defer></script><?php endif ?>
</body>
</html>
