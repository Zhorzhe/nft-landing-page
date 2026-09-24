<section class="card center">
  <?php if (!empty($notFound)): ?>
    <h1>Страницата не е намерена</h1>
    <p>Проверете линка или се върнете към <a href="https://fair.bg">fair.bg</a>.</p>
  <?php else: ?>
    <h1>Възникна грешка</h1>
    <p>Моля, опитайте отново след малко. Ако проблемът продължава, свържете се с нас по телефона или имейл.</p>
    <?php if (!empty($message)): ?><pre class="debug"><?= e($message) ?></pre><?php endif ?>
  <?php endif ?>
</section>
