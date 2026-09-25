<?php
/**
 * @var array $form
 * @var array $values
 * @var array $errors
 * @var PanairForms\App $app
 */
use PanairForms\Conditions;
use PanairForms\FieldRenderer;

$renderer = new FieldRenderer($values, $errors, (int)$maxFileMb, $allowedExt);
$selected = Conditions::selectedParts($form, $values);
$multi = $form['multipart'];
$fmtDate = fn(string $d) => date('d.m.Y', strtotime($d));
$pricingData = [];
foreach ($form['parts'] as $pid => $p) {
    $pricingData[$pid] = ['code' => $p['code'], 'title' => $p['title'], 'rules' => $p['pricing']];
}
?>
<div class="form-page<?= $multi ? ' is-multi' : '' ?>">
  <header class="event-head">
    <?php if (!empty($form['event_logo'])): ?>
      <img class="event-logo" src="<?= e($app->path($form['event_logo'])) ?>" alt="" width="96" height="96">
    <?php endif ?>
    <div class="event-titles">
      <p class="eyebrow"><?= e($form['subtitle']) ?></p>
      <h1><?= e($form['title']) ?></h1>
      <?php if (!empty($form['tagline'])): ?><p class="tagline"><?= e($form['tagline']) ?></p><?php endif ?>
      <?php if (!empty($form['dates']) || !empty($form['venue'])): ?>
        <p class="meta"><?php if (!empty($form['dates'])): ?><strong><?= e($form['dates']) ?></strong><?php endif ?><?= !empty($form['dates']) && !empty($form['venue']) ? ' · ' : '' ?><?= e($form['venue'] ?? '') ?></p>
      <?php endif ?>
    </div>
  </header>

  <?php if (!empty($form['intro'])): ?><div class="intro"><?= $form['intro_html'] ?? nl2br(e($form['intro'])) ?></div><?php endif ?>

  <?php if ($form['documents']): ?>
    <ul class="doc-links">
      <?php foreach ($form['documents'] as $doc): ?>
        <li><a href="<?= e(str_starts_with($doc['url'], 'http') ? $doc['url'] : $app->path($doc['url'])) ?>" target="_blank" rel="noopener"><?= e($doc['label']) ?></a></li>
      <?php endforeach ?>
    </ul>
  <?php endif ?>

  <?php if ($form['draft']): ?>
    <div class="alert alert-warn">Чернова: полетата на тази форма са примерни и предстои да бъдат заменени с тези от официалния формуляр.</div>
  <?php endif ?>

  <?php if ($errors): ?>
    <div class="alert alert-error" role="alert" tabindex="-1" id="form-errors">
      <?= isset($errors['_form']) ? e($errors['_form']) : 'Моля, коригирайте отбелязаните полета.' ?>
      <?php if (array_diff(array_keys($errors), ['_form'])): ?>
        <br><small>Ако сте прикачили файлове, изберете ги отново.</small>
      <?php endif ?>
    </div>
  <?php endif ?>

  <form method="post" enctype="multipart/form-data" class="app-form" data-max-file-mb="<?= (int)$maxFileMb ?>" data-vat="<?= e($form['vat_rate']) ?>" novalidate>
    <input type="hidden" name="_token" value="<?= e($token) ?>">
    <div class="hp" aria-hidden="true"><label>Уебсайт <input type="text" name="website_url" tabindex="-1" autocomplete="off"></label></div>
    <script type="application/json" id="pricing-rules"><?= json_encode($pricingData, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>

    <div class="form-layout">
      <div class="form-main">
        <p class="muted required-note"><span class="req">*</span> Задължителни полета</p>

        <?php foreach ($form['parts'] as $pid => $part):
            $isOn = in_array($pid, $selected, true);
            $mode = $part['required'] ? 'required' : ($part['auto_if'] ? 'auto' : 'optional');
        ?>
          <section class="part part-<?= $mode ?><?= $isOn ? ' is-on' : '' ?>" id="part-<?= e($pid) ?>" data-part="<?= e($pid) ?>" data-mode="<?= $mode ?>"<?= $part['auto_if'] ? ' data-auto-if="' . e(json_encode($part['auto_if'], JSON_UNESCAPED_UNICODE)) . '"' : '' ?>>
            <?php if ($multi): ?>
              <header class="part-head">
                <?php if ($part['code'] !== ''): ?>
                  <div class="part-code"><span>Формуляр</span><b><?= e($part['code']) ?></b></div>
                <?php endif ?>
                <div class="part-titles">
                  <h2><?= e($part['title']) ?></h2>
                  <?php if ($part['en'] !== ''): ?><p class="en" lang="en"><?= e($part['en']) ?></p><?php endif ?>
                  <p class="part-meta">
                    <?php if ($mode === 'required'): ?><span class="chip chip-req">Задължителен</span><?php endif ?>
                    <?php if ($mode === 'auto'): ?><span class="chip"><?= e($part['auto_note'] ?? 'Попълва се автоматично') ?></span><?php endif ?>
                    <?php if ($part['deadline'] !== ''): ?><span class="chip chip-date">Срок: <?= e($fmtDate($part['deadline'])) ?></span><?php endif ?>
                    <?php if (!empty($part['summary'])): ?><span class="part-summary"><?= e($part['summary']) ?></span><?php endif ?>
                  </p>
                </div>
                <?php if ($mode === 'optional'): ?>
                  <label class="part-toggle">
                    <input type="checkbox" name="_parts[]" value="<?= e($pid) ?>"<?= $isOn ? ' checked' : '' ?> aria-controls="part-body-<?= e($pid) ?>">
                    <span class="toggle-on">Попълвам</span>
                  </label>
                <?php endif ?>
              </header>
            <?php endif ?>

            <div class="part-body" id="part-body-<?= e($pid) ?>"<?= $isOn ? '' : ' hidden' ?>>
              <?php if ($part['description'] !== ''): ?><div class="part-desc"><?= nl2br(e($part['description'])) ?></div><?php endif ?>
              <?php foreach ($part['sections'] as $section): ?>
                <fieldset class="section"<?= $section['show_if'] ? ' data-show-if="' . e(json_encode($section['show_if'], JSON_UNESCAPED_UNICODE)) . '"' : '' ?>>
                  <?php if ($section['title'] !== ''): ?>
                    <legend><?= e($section['title']) ?><?php if ($section['en'] !== ''): ?> <span class="en" lang="en"><?= e($section['en']) ?></span><?php endif ?></legend>
                  <?php endif ?>
                  <?php if ($section['description'] !== ''): ?><p class="section-desc"><?= nl2br(e($section['description'])) ?></p><?php endif ?>
                  <div class="grid">
                    <?php foreach ($section['fields'] as $f): ?><?= $renderer->render($f) ?><?php endforeach ?>
                  </div>
                </fieldset>
              <?php endforeach ?>
            </div>
          </section>
        <?php endforeach ?>
      </div>

      <aside class="form-aside" aria-label="Обобщение на заявката">
        <div class="summary" id="summary">
          <?php if ($multi): ?>
            <h2 class="summary-title">Вашата заявка</h2>
            <ul class="summary-parts">
              <?php foreach ($form['parts'] as $pid => $part): ?>
                <li data-summary-part="<?= e($pid) ?>"<?= in_array($pid, $selected, true) ? '' : ' hidden' ?>>
                  <a href="#part-<?= e($pid) ?>"><?= $part['code'] !== '' ? 'Ф' . e($part['code']) . ' · ' : '' ?><?= e($part['short'] ?? $part['title']) ?></a>
                </li>
              <?php endforeach ?>
            </ul>
            <div class="price-box" aria-live="polite">
              <h3>Ориентировъчна стойност</h3>
              <div class="price-lines" data-price-lines><p class="muted">Попълнете площ или изберете услуги.</p></div>
              <dl class="price-totals">
                <div><dt>Общо без ДДС</dt><dd data-price-net>0,00 €</dd></div>
                <div><dt>ДДС <?= e($form['vat_rate']) ?>%</dt><dd data-price-vat>0,00 €</dd></div>
                <div class="grand"><dt>Общо с ДДС</dt><dd data-price-gross>0,00 €</dd></div>
              </dl>
              <p class="price-note"><?= e($form['price_note'] ?? 'Сумата е ориентировъчна. Отстъпките се прилагат при издаване на проформа-фактурата.') ?></p>
            </div>
          <?php endif ?>
          <div class="actions">
            <button type="submit" class="btn btn-primary"><?= e($form['submit_label'] ?? 'Изпрати заявката') ?></button>
            <p class="muted sending-note" hidden>Изпращане… Моля, изчакайте (при големи файлове може да отнеме до минута).</p>
          </div>
        </div>
      </aside>
    </div>
    <?php if ($multi): ?>
      <div class="mobile-total" aria-hidden="true"><span>Общо без ДДС: <b data-mobile-total>0,00 €</b></span><a href="#summary">Изпрати ↓</a></div>
    <?php endif ?>
  </form>
</div>
