<section class="card narrow">
  <h1>Вход</h1>
  <?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif ?>
  <form method="post" class="app-form">
    <div class="field full">
      <label class="label" for="password">Парола</label>
      <input type="password" id="password" name="password" autocomplete="current-password" required autofocus>
    </div>
    <div class="actions"><button class="btn btn-primary" type="submit">Вход</button></div>
  </form>
</section>
