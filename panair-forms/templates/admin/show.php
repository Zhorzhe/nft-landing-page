<?php use PanairForms\Pricing; ?>
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
    <?php if ($groups): ?>
      <ul class="muted recipients-list">
        <?php foreach ($groups as $g): ?>
          <li><?= e(implode(', ', $g['to'])) ?> ← <?= e(implode(', ', array_map(fn($pid) => $form['multipart'] && $form['parts'][$pid]['code'] !== '' ? 'Ф' . $form['parts'][$pid]['code'] : ($form['parts'][$pid]['title'] ?: 'заявката'), $g['parts']))) ?></li>
        <?php endforeach ?>
      </ul>
    <?php endif ?>
    <?php if ($form): ?>
    <form method="post" action="<?= e($app->path('admin/submission/' . rawurlencode($record['reference']) . '/resend')) ?>">
      <input type="hidden" name="_csrf" value="<?= e($_SESSION['csrf'] ?? '') ?>">
      <button class="btn btn-secondary" type="submit">Изпрати имейлите отново</button>
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

  <?php if ($blocks): foreach ($blocks as $block): ?>
    <?php if ($block['title'] !== ''): ?><h2 class="block-title"><?= e($block['title']) ?></h2><?php endif ?>
    <?php foreach ($block['sections'] as $section): ?>
      <?php if ($section['title'] !== ''): ?><h3><?= e($section['title']) ?></h3><?php endif ?>
      <div class="table-wrap">
      <table class="table kv">
        <?php foreach ($section['items'] as $item): ?>
          <tr><th><?= e($item['label']) ?></th><td><?= $item['value'] !== '' ? nl2br(e($item['value'])) : '<span class="muted">—</span>' ?></td></tr>
        <?php endforeach ?>
      </table>
      </div>
    <?php endforeach ?>
  <?php endforeach; else: ?>
    <p class="muted">Формата вече не съществува — сурови данни:</p>
    <pre><?= e(json_encode($record['values'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) ?></pre>
  <?php endif ?>

  <?php if ($pricing && $pricing['parts']): ?>
    <h2>Ориентировъчна стойност</h2>
    <div class="table-wrap">
    <table class="table">
      <thead><tr><th>Услуга</th><th class="num">Кол.</th><th class="num">Ед. цена</th><th class="num">Сума</th></tr></thead>
      <tbody>
      <?php foreach ($pricing['parts'] as $part): foreach ($part['lines'] as $l): ?>
        <tr><td><?= e($l['label']) ?></td><td class="num"><?= e(Pricing::qty($l['qty']) . ' ' . $l['unit']) ?></td><td class="num"><?= e(Pricing::money($l['price'])) ?></td><td class="num"><?= e(Pricing::money($l['total'])) ?></td></tr>
      <?php endforeach; endforeach ?>
      </tbody>
      <tfoot>
        <tr><th colspan="3" class="num">Общо без ДДС</th><td class="num"><?= e(Pricing::money($pricing['net'])) ?></td></tr>
        <tr><th colspan="3" class="num">ДДС <?= e($pricing['vat_rate']) ?>%</th><td class="num"><?= e(Pricing::money($pricing['vat'])) ?></td></tr>
        <tr><th colspan="3" class="num">Общо с ДДС</th><td class="num"><strong><?= e(Pricing::money($pricing['gross'])) ?></strong></td></tr>
      </tfoot>
    </table>
    </div>
  <?php endif ?>
</section>
