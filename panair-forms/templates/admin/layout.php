<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title><?= e($title) ?> | Админ – онлайн формуляри</title>
<link rel="stylesheet" href="<?= e($app->path('assets/style.css')) ?>?v=1">
<style>:root{--primary:<?= e($app->get('theme.primary', '#0b3a6e')) ?>;--primary-dark:<?= e($app->get('theme.primary_dark', '#072849')) ?>;--accent:<?= e($app->get('theme.accent', '#d32f2f')) ?>}</style>
</head>
<body class="admin">
<header class="site-header">
  <div class="wrap wide admin-nav">
    <strong>Онлайн формуляри · Админ</strong>
    <?php if ($nav): ?>
      <nav>
        <a href="<?= e($app->path('admin')) ?>">Заявки</a>
        <a href="<?= e($app->path('admin/forms')) ?>">Форми и получатели</a>
        <a href="<?= e($app->path('admin/logout')) ?>">Изход</a>
      </nav>
    <?php endif ?>
  </div>
</header>
<main class="wrap wide">
  <?php if ($flash): ?><div class="alert <?= str_starts_with($flash, 'Грешка') ? 'alert-error' : 'alert-ok' ?>"><?= e($flash) ?></div><?php endif ?>
  <?= $content ?>
</main>
</body>
</html>
