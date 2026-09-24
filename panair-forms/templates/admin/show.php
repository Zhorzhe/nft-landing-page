<section class="card">
  <p><a href="<?= e($app->path('admin')) ?>">← Всички заявки</a></p>
  <h1><?= e($record['reference']) ?> <span class="muted">· <?= e($record['form_title']) ?></span></h1>
  <p class="muted">Получена на <?= e(date('d.m.Y H:i', strtotime($record['created_at']))) ?> · IP <?= e($record['ip']) ?></p>

  <div class="status-box">
    <p>Имейл до организатора:
      <span class="badge badge-<?= e($record['mail_status']) ?>"><?= e(['sent' => 'изпратен', 'failed' => 'ГРЕШКА', 'pending' => 'чака'][$record['mail_status']] ?? $record['mail_status']) ?></span>
      <?php if ($record['mail_sent_at']): ?><span class="muted"><?= e($record['mail_sent_at']) ?></span><?php endif ?>
    </p>
    <?php if ($record['mail_error']): ?><p class="error-msg"><?= e($record['mail_error']) ?></p><?php endif ?>
    <?php if ($record['confirmation_status']): ?><p class="muted">Потвърждение до подателя: <?= e($record['confirmation_status']) ?></p><?php endif ?>
    <?php if ($form): ?>
    <form method="post" action="<?= e($app->path('admin/submission/' . rawurlencode($record['reference']) . '/resend')) ?>">
      <input type="hidden" name="_csrf" value="<?= e($_SESSION['csrf'] ?? '') ?>">
      <button class="btn btn-secondary" type="submit">Изпрати имейла отново до: <?= e(implode(', ', $form['recipients'] ?: (array)$app->get('default_recipients', []))) ?></button>
    </form>
    <?php endif ?>
  </div>

  <?php if ($record['files']): ?>
    <h2>Прикачени файлове</h2>
    <ul>
      <?php foreach ($record['files'] as $f): ?>
        <li><a href="<?= e($app->path('admin/submission/' . rawurlencode($record['reference']) . '/file/' . rawurlencode($f['stored']))) ?>"><?= e($f['name']) ?></a> <span class="muted">(<?= e(format_bytes((int)$f['size'])) ?>)</span></li>
      <?php endforeach ?>
    </ul>
  <?php endif ?>

  <?php if ($rows): foreach ($rows as $section): ?>
    <h2><?= e($section['title']) ?></h2>
    <table class="table kv">
      <?php foreach ($section['items'] as $item): ?>
        <tr><th><?= e($item['label']) ?></th><td><?= $item['value'] !== '' ? nl2br(e($item['value'])) : '<span class="muted">—</span>' ?></td></tr>
      <?php endforeach ?>
    </table>
  <?php endforeach; else: ?>
    <p class="muted">Формата вече не съществува — сурови данни:</p>
    <pre><?= e(json_encode($record['values'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) ?></pre>
  <?php endif ?>
</section>
