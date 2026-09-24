<section class="card center">
  <h1><?= e($form['title']) ?></h1>
  <p>Приемането на онлайн заявки за това изложение е приключило.</p>
  <?php $org = $app->get('organization', []); if (!empty($org['email']) || !empty($org['phone'])): ?>
    <p class="muted">За информация: <?= e(trim(($org['phone'] ?? '') . ' ' . ($org['email'] ?? ''))) ?></p>
  <?php endif ?>
</section>
