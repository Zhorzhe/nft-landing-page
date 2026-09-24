<section class="card center">
  <div class="success-icon" aria-hidden="true">✓</div>
  <h1>Заявката е изпратена успешно</h1>
  <p>Благодарим Ви за заявката за участие в <strong><?= e($form['title']) ?></strong>.</p>
  <?php if ($reference !== ''): ?>
    <p>Номер на заявката: <strong class="ref"><?= e($reference) ?></strong></p>
  <?php endif ?>
  <?php if ($form['send_confirmation']): ?>
    <p class="muted">Копие на попълнените данни е изпратено на посочения от Вас имейл адрес.</p>
  <?php endif ?>
  <p class="muted">Наш представител ще се свърже с Вас за потвърждение и договор.</p>
  <?php if (!empty($form['event_url'])): ?>
    <p><a class="btn btn-secondary" href="<?= e($form['event_url']) ?>">Обратно към страницата на изложението</a></p>
  <?php endif ?>
</section>
