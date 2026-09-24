<section class="card">
  <h1>Онлайн заявки за участие</h1>
  <?php if (!$forms): ?>
    <p>В момента няма отворени формуляри.</p>
  <?php else: ?>
    <ul class="form-list">
      <?php foreach ($forms as $f): ?>
        <li><a href="<?= e($app->path('forms/' . $f['slug'])) ?>"><strong><?= e($f['title']) ?></strong><?php if (!empty($f['dates'])): ?> <span class="muted">· <?= e($f['dates']) ?></span><?php endif ?></a></li>
      <?php endforeach ?>
    </ul>
  <?php endif ?>
</section>
