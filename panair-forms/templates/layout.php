<?php
/** @var PanairForms\App $app */
$theme = $app->get('theme', []);
$org = $app->get('organization', []);
?><!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title><?= e($title ?? 'Онлайн заявка') ?> | <?= e($org['name'] ?? 'Международен Панаир Пловдив') ?></title>
<link rel="stylesheet" href="<?= e($app->path('assets/style.css')) ?>?v=1">
<style>:root{--primary:<?= e($theme['primary'] ?? '#0b3a6e') ?>;--primary-dark:<?= e($theme['primary_dark'] ?? '#072849') ?>;--accent:<?= e($theme['accent'] ?? '#d32f2f') ?>}</style>
<?php if (!empty($theme['favicon'])): ?><link rel="icon" href="<?= e($theme['favicon']) ?>"><?php endif ?>
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="<?= e($org['website'] ?? 'https://fair.bg') ?>">
      <?php if (!empty($theme['logo'])): ?><img src="<?= e(str_starts_with($theme['logo'], 'http') ? $theme['logo'] : $app->path($theme['logo'])) ?>" alt="<?= e($org['name'] ?? '') ?>" height="44"><?php endif ?>
      <span><?= e($org['name'] ?? 'Международен Панаир Пловдив') ?></span>
    </a>
  </div>
</header>
<main class="wrap">
<?= $content ?>
</main>
<footer class="site-footer wrap">
  <p><?= e($org['name'] ?? 'Международен Панаир Пловдив') ?><?php if (!empty($org['address'])): ?> · <?= e($org['address']) ?><?php endif ?><?php if (!empty($org['phone'])): ?> · <?= e($org['phone']) ?><?php endif ?></p>
  <?php if (!empty($org['privacy_url'])): ?><p><a href="<?= e($org['privacy_url']) ?>">Политика за защита на личните данни</a></p><?php endif ?>
</footer>
<?php if (isset($form)): ?><script src="<?= e($app->path('assets/form.js')) ?>?v=1" defer></script><?php endif ?>
</body>
</html>
