<?php
/**
 * @var array $form
 * @var array $values
 * @var array $errors
 */
$val = fn(string $n) => $values[$n] ?? null;
$accept = function (array $f) use ($allowedExt): string {
    $ext = $f['accept'] ?? $allowedExt;
    return implode(',', array_map(fn($x) => '.' . $x, $ext));
};
?>
<section class="card">
  <header class="form-head">
    <p class="eyebrow"><?= e($form['subtitle']) ?></p>
    <h1><?= e($form['title']) ?></h1>
    <?php if (!empty($form['dates']) || !empty($form['venue'])): ?>
      <p class="meta"><?= e(implode(' · ', array_filter([$form['dates'] ?? '', $form['venue'] ?? '']))) ?></p>
    <?php endif ?>
    <?php if (!empty($form['intro'])): ?><div class="intro"><?= $form['intro_html'] ?? nl2br(e($form['intro'])) ?></div><?php endif ?>
    <?php if (!empty($form['deadline'])): ?><p class="muted">Срок за подаване: <?= e(date('d.m.Y', strtotime($form['deadline']))) ?></p><?php endif ?>
  </header>

  <?php if ($form['draft']): ?>
    <div class="alert alert-warn">Чернова: полетата на тази форма са примерни и предстои да бъдат заменени с тези от официалния формуляр.</div>
  <?php endif ?>

  <?php if ($errors): ?>
    <div class="alert alert-error" role="alert" tabindex="-1" id="form-errors">
      <?= isset($errors['_form']) ? e($errors['_form']) : 'Моля, коригирайте отбелязаните полета.' ?>
      <?php if (array_filter(array_keys($errors), fn($k) => $k !== '_form') && array_filter($form['sections'], fn($s) => array_filter($s['fields'], fn($f) => $f['type'] === 'file'))): ?>
        <br><small>От съображения за сигурност прикачените файлове трябва да бъдат избрани отново.</small>
      <?php endif ?>
    </div>
  <?php endif ?>

  <form method="post" enctype="multipart/form-data" class="app-form" data-max-file-mb="<?= (int)$maxFileMb ?>" novalidate>
    <input type="hidden" name="_token" value="<?= e($token) ?>">
    <div class="hp" aria-hidden="true"><label>Уебсайт <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <p class="muted required-note"><span class="req">*</span> Задължителни полета</p>

    <?php foreach ($form['sections'] as $si => $section): ?>
      <fieldset class="section">
        <?php if (!empty($section['title'])): ?><legend><?= e($section['title']) ?></legend><?php endif ?>
        <?php if (!empty($section['description'])): ?><p class="section-desc"><?= nl2br(e($section['description'])) ?></p><?php endif ?>
        <div class="grid">
        <?php foreach ($section['fields'] as $f):
            if ($f['type'] === 'note'): ?>
              <div class="field full note"><?= $f['html'] ?? nl2br(e($f['label'])) ?></div>
            <?php continue; endif;
            $n = $f['name'];
            $id = 'f_' . $n;
            $err = $errors[$n] ?? null;
            $req = $f['required'] ? ' required' : '';
            $describedBy = trim(($f['help'] ? $id . '_help ' : '') . ($err ? $id . '_err' : ''));
            $aria = ($describedBy ? ' aria-describedby="' . e($describedBy) . '"' : '') . ($err ? ' aria-invalid="true"' : '');
            $cls = 'field ' . ($f['width'] === 'half' ? 'half' : ($f['width'] === 'third' ? 'third' : 'full')) . ($err ? ' has-error' : '');
            $star = $f['required'] ? ' <span class="req">*</span>' : '';
            $ph = isset($f['placeholder']) ? ' placeholder="' . e($f['placeholder']) . '"' : '';
        ?>
          <div class="<?= $cls ?>" data-field="<?= e($n) ?>">
          <?php if (in_array($f['type'], ['radio', 'checkboxes'], true)): ?>
            <fieldset class="choice-group"<?= $aria ?> data-type="<?= e($f['type']) ?>"<?= $req ? ' data-required="1"' : '' ?>>
              <legend class="label"><?= e($f['label']) ?><?= $star ?></legend>
              <?php foreach ($f['options'] as $i => $o):
                  $checked = $f['type'] === 'radio' ? ((string)$val($n) === $o['value']) : in_array($o['value'], (array)$val($n), true); ?>
                <label class="choice">
                  <input type="<?= $f['type'] === 'radio' ? 'radio' : 'checkbox' ?>" name="<?= e($n) ?><?= $f['type'] === 'checkboxes' ? '[]' : '' ?>" value="<?= e($o['value']) ?>"<?= $checked ? ' checked' : '' ?><?= $f['type'] === 'radio' ? $req : '' ?>>
                  <span><?= e($o['label']) ?><?php if (isset($o['price'])): ?> <span class="price"><?= e($o['price']) ?></span><?php endif ?><?php if (!empty($o['description'])): ?><small class="opt-desc"><?= e($o['description']) ?></small><?php endif ?></span>
                </label>
              <?php endforeach ?>
            </fieldset>
          <?php elseif ($f['type'] === 'checkbox'): ?>
            <label class="choice single">
              <input type="checkbox" id="<?= $id ?>" name="<?= e($n) ?>" value="1"<?= $val($n) ? ' checked' : '' ?><?= $req . $aria ?>>
              <span><?= $f['label_html'] ?? e($f['label']) ?><?= $star ?></span>
            </label>
          <?php else: ?>
            <label class="label" for="<?= $id ?>"><?= e($f['label']) ?><?= $star ?></label>
            <?php if ($f['type'] === 'textarea'): ?>
              <textarea id="<?= $id ?>" name="<?= e($n) ?>" rows="<?= (int)($f['rows'] ?? 4) ?>" maxlength="<?= (int)($f['maxlength'] ?? 5000) ?>"<?= $req . $aria . $ph ?>><?= e($val($n)) ?></textarea>
            <?php elseif ($f['type'] === 'select'): ?>
              <select id="<?= $id ?>" name="<?= e($n) ?>"<?= $req . $aria ?>>
                <option value=""><?= e($f['placeholder'] ?? '— Изберете —') ?></option>
                <?php foreach ($f['options'] as $o): ?>
                  <option value="<?= e($o['value']) ?>"<?= (string)$val($n) === $o['value'] ? ' selected' : '' ?>><?= e($o['label']) ?><?= isset($o['price']) ? ' — ' . e($o['price']) : '' ?></option>
                <?php endforeach ?>
              </select>
            <?php elseif ($f['type'] === 'file'): ?>
              <input type="file" id="<?= $id ?>" name="<?= e($n) ?><?= $f['multiple'] ? '[]' : '' ?>"<?= $f['multiple'] ? ' multiple data-max-files="' . (int)$f['max_files'] . '"' : '' ?> accept="<?= e($accept($f)) ?>"<?= $req . $aria ?><?= isset($f['max_mb']) ? ' data-max-mb="' . e($f['max_mb']) . '"' : '' ?>>
              <p class="hint">Формати: <?= e(strtoupper(implode(', ', $f['accept'] ?? $allowedExt))) ?> · до <?= e($f['max_mb'] ?? $maxFileMb) ?> MB на файл<?= $f['multiple'] ? ' · до ' . (int)$f['max_files'] . ' файла' : '' ?></p>
            <?php else:
                $type = ['eik' => 'text', 'number' => 'number', 'tel' => 'tel', 'email' => 'email', 'date' => 'date'][$f['type']] ?? 'text';
                $extra = '';
                foreach (['min', 'max', 'step'] as $a) {
                    if (isset($f[$a])) { $extra .= ' ' . $a . '="' . e($f[$a]) . '"'; }
                }
                if ($f['type'] === 'number' && !isset($f['step'])) { $extra .= ' step="any"'; }
                $auto = $f['autocomplete'] ?? ['email' => 'email', 'tel' => 'tel'][$f['type']] ?? null;
                if ($auto) { $extra .= ' autocomplete="' . e($auto) . '"'; }
                if ($f['type'] === 'eik' || $f['type'] === 'number') { $extra .= ' inputmode="' . ($f['type'] === 'eik' ? 'text' : 'decimal') . '"'; }
                if (!empty($f['pattern'])) { $extra .= ' pattern="' . e($f['pattern']) . '"'; }
            ?>
              <div class="input-wrap<?= isset($f['unit']) ? ' has-unit' : '' ?>">
                <input type="<?= $type ?>" id="<?= $id ?>" name="<?= e($n) ?>" value="<?= e($val($n)) ?>" data-type="<?= e($f['type']) ?>" maxlength="<?= (int)($f['maxlength'] ?? 300) ?>"<?= $req . $aria . $ph . $extra ?>>
                <?php if (isset($f['unit'])): ?><span class="unit"><?= e($f['unit']) ?></span><?php endif ?>
              </div>
            <?php endif ?>
          <?php endif ?>
            <?php if ($f['help']): ?><p class="hint" id="<?= $id ?>_help"><?= e($f['help']) ?></p><?php endif ?>
            <p class="error-msg" id="<?= $id ?>_err" role="alert"><?= $err ? e($err) : '' ?></p>
          </div>
        <?php endforeach ?>
        </div>
      </fieldset>
    <?php endforeach ?>

    <div class="actions">
      <button type="submit" class="btn btn-primary">Изпрати заявката</button>
      <p class="muted sending-note" hidden>Изпращане… Моля, изчакайте (при големи файлове може да отнеме до минута).</p>
    </div>
  </form>
</section>
