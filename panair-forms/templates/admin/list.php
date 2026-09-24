<section class="card">
  <div class="toolbar">
    <h1>Заявки <span class="muted">(<?= (int)$total ?>)</span></h1>
    <form method="get" class="inline">
      <select name="form" onchange="this.form.submit()">
        <option value="">Всички форми</option>
        <?php foreach ($forms as $f): ?>
          <option value="<?= e($f['slug']) ?>"<?= $current === $f['slug'] ? ' selected' : '' ?>><?= e($f['title']) ?></option>
        <?php endforeach ?>
      </select>
      <noscript><button class="btn">Филтър</button></noscript>
      <?php if ($current): ?><a class="btn btn-secondary" href="<?= e($app->path('admin/export')) ?>?form=<?= e(rawurlencode($current)) ?>">Експорт CSV (Excel)</a><?php endif ?>
    </form>
  </div>
  <?php if (!$rows): ?>
    <p class="muted">Няма заявки.</p>
  <?php else: ?>
  <div class="table-wrap">
  <table class="table">
    <thead><tr><th>Номер</th><th>Дата</th><th>Изложение</th><th>Фирма</th><th>Имейл</th><th>Файлове</th><th>Имейл до организатора</th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
      <tr>
        <td><a href="<?= e($app->path('admin/submission/' . rawurlencode($r['reference']))) ?>"><?= e($r['reference']) ?></a></td>
        <td><?= e(date('d.m.Y H:i', strtotime($r['created_at']))) ?></td>
        <td><?= e($r['form_title']) ?></td>
        <td><?= e($r['company']) ?></td>
        <td><?= e($r['email']) ?></td>
        <td><?= count($r['files']) ?></td>
        <td><span class="badge badge-<?= e($r['mail_status']) ?>"><?= e(['sent' => 'изпратен', 'failed' => 'ГРЕШКА', 'pending' => 'чака'][$r['mail_status']] ?? $r['mail_status']) ?></span></td>
      </tr>
    <?php endforeach ?>
    </tbody>
  </table>
  </div>
  <?php $pages = (int)ceil($total / 50); if ($pages > 1): ?>
    <p class="pager">
      <?php for ($i = 1; $i <= $pages; $i++): ?>
        <?php if ($i === $page): ?><strong><?= $i ?></strong><?php else: ?><a href="?<?= e(http_build_query(array_filter(['form' => $current, 'page' => $i]))) ?>"><?= $i ?></a><?php endif ?>
      <?php endfor ?>
    </p>
  <?php endif ?>
  <?php endif ?>
</section>
