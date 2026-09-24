<?php $primary = $app->get('theme.primary', '#0b3a6e'); ?>
<!doctype html>
<html lang="bg"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#1d2530;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
  <tr><td style="background:<?= e($primary) ?>;color:#ffffff;padding:18px 24px;">
    <div style="font-size:12px;letter-spacing:.05em;text-transform:uppercase;opacity:.85;"><?= e($form['subtitle']) ?></div>
    <div style="font-size:22px;font-weight:bold;margin-top:4px;"><?= e($form['title']) ?></div>
  </td></tr>
  <tr><td style="padding:20px 24px 4px;font-size:14px;line-height:1.5;">
    <p style="margin:0 0 10px;"><?= e($intro) ?></p>
    <p style="margin:0 0 4px;"><strong>Номер на заявката:</strong> <?= e($record['reference']) ?></p>
    <p style="margin:0 0 4px;"><strong>Дата и час:</strong> <?= e(date('d.m.Y H:i', strtotime($record['created_at']))) ?></p>
    <?php if ($adminUrl && $app->get('app_url')): ?><p style="margin:0;"><a href="<?= e($adminUrl) ?>" style="color:<?= e($primary) ?>;">Преглед в админ панела</a></p><?php endif ?>
  </td></tr>
  <?php foreach ($rows as $section): ?>
  <tr><td style="padding:16px 24px 0;">
    <?php if ($section['title'] !== ''): ?>
      <div style="font-size:15px;font-weight:bold;color:<?= e($primary) ?>;border-bottom:2px solid <?= e($primary) ?>;padding-bottom:4px;margin-bottom:6px;"><?= e($section['title']) ?></div>
    <?php endif ?>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
      <?php foreach ($section['items'] as $item): ?>
      <tr>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e6e9ee;color:#5a6472;width:42%;vertical-align:top;"><?= e($item['label']) ?></td>
        <td style="padding:6px 0;border-bottom:1px solid #e6e9ee;vertical-align:top;"><?= $item['value'] !== '' ? nl2br(e($item['value'])) : '<span style="color:#9aa3ae;">—</span>' ?></td>
      </tr>
      <?php endforeach ?>
    </table>
  </td></tr>
  <?php endforeach ?>
  <tr><td style="padding:20px 24px;font-size:12px;color:#7a8490;">
    <?= e($app->get('organization.name', 'Международен Панаир Пловдив')) ?><?php if ($app->get('organization.website')): ?> · <?= e($app->get('organization.website')) ?><?php endif ?>
  </td></tr>
</table>
</td></tr></table>
</body></html>
