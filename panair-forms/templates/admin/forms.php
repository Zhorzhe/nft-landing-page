<section class="card">
  <h1>Форми и получатели</h1>
  <p class="muted">Тук сменяте на кой имейл се изпращат заявките. Промените важат веднага. Няколко адреса се разделят със запетая.</p>
  <?php foreach ($forms as $f): ?>
    <form method="post" class="form-settings">
      <input type="hidden" name="_csrf" value="<?= e($_SESSION['csrf'] ?? '') ?>">
      <input type="hidden" name="slug" value="<?= e($f['slug']) ?>">
      <div class="form-settings-head">
        <h2><?= e($f['title']) ?><?php if ($f['draft']): ?> <span class="badge badge-pending">чернова</span><?php endif ?></h2>
        <p class="muted">
          Линк: <a href="<?= e($app->path('forms/' . $f['slug'])) ?>" target="_blank"><?= e($app->url('forms/' . $f['slug'])) ?></a>
          · Заявки: <a href="<?= e($app->path('admin')) ?>?form=<?= e(rawurlencode($f['slug'])) ?>"><?= (int)($counts[$f['slug']] ?? 0) ?></a>
          <?php if (!empty($f['deadline'])): ?>· Срок: <?= e(date('d.m.Y', strtotime($f['deadline']))) ?><?php endif ?>
        </p>
      </div>
      <div class="grid">
        <?php if ($f['multipart']): ?>
          <div class="field full">
            <p class="hint">Всеки отдел получава своите формуляри заедно с Формуляр 1 (данните на изложителя). Ако полето е празно, се използва общият получател по-долу.</p>
            <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Формуляр</th><th>Получатели (До:)</th></tr></thead>
              <tbody>
              <?php foreach ($f['parts'] as $pid => $part): ?>
                <tr>
                  <td><?= $part['code'] !== '' ? '<strong>Ф' . e($part['code']) . '</strong> · ' : '' ?><?= e($part['title']) ?></td>
                  <td><input type="text" name="part_recipients[<?= e($pid) ?>]" value="<?= e(implode(', ', $part['recipients'])) ?>" aria-label="Получатели за <?= e($part['title']) ?>"></td>
                </tr>
              <?php endforeach ?>
              </tbody>
            </table>
            </div>
          </div>
          <div class="field half">
            <label class="label">Общ получател (ако за формуляр няма зададен)</label>
            <input type="text" name="recipients" value="<?= e(implode(', ', $f['recipients'])) ?>" placeholder="<?= e(implode(', ', $defaultRecipients)) ?>">
          </div>
        <?php else: ?>
          <div class="field half">
            <label class="label">Получатели (До:)</label>
            <input type="text" name="recipients" value="<?= e(implode(', ', $f['recipients'])) ?>" placeholder="expo@fair.bg">
          </div>
        <?php endif ?>
        <div class="field half">
          <label class="label">Копие (CC:) за всички писма</label>
          <input type="text" name="cc" value="<?= e(implode(', ', $f['cc'])) ?>" placeholder="по желание">
        </div>
        <div class="field half">
          <label class="choice single"><input type="checkbox" name="send_confirmation" value="1"<?= $f['send_confirmation'] ? ' checked' : '' ?>> <span>Изпращай потвърждение до подателя</span></label>
        </div>
        <div class="field half">
          <label class="choice single"><input type="checkbox" name="active" value="1"<?= $f['active'] ? ' checked' : '' ?>> <span>Формата е активна (приема заявки)</span></label>
        </div>
      </div>
      <div class="actions"><button class="btn btn-primary" type="submit">Запази</button></div>
    </form>
  <?php endforeach ?>
</section>
