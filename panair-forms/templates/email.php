<?php
use PanairForms\Pricing;

$primary = $app->get('theme.primary', '#0b3a6e');
$accent = $app->get('theme.accent', '#f1a833');
?>
<!doctype html>
<html lang="bg"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f4f8;font-family:Arial,Helvetica,sans-serif;color:#1d2530;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f8;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
  <tr><td style="background:<?= e($primary) ?>;color:#ffffff;padding:18px 24px;border-bottom:4px solid <?= e($accent) ?>;">
    <div style="font-size:12px;letter-spacing:.05em;text-transform:uppercase;opacity:.85;"><?= e($form['subtitle']) ?></div>
    <div style="font-size:22px;font-weight:bold;margin-top:4px;"><?= e($form['title']) ?></div>
    <?php if (!empty($form['dates'])): ?><div style="font-size:13px;margin-top:2px;opacity:.9;"><?= e($form['dates']) ?></div><?php endif ?>
  </td></tr>
  <tr><td style="padding:20px 24px 4px;font-size:14px;line-height:1.5;">
    <p style="margin:0 0 10px;"><?= e($intro) ?></p>
    <p style="margin:0 0 4px;"><strong>Номер на заявката:</strong> <?= e($record['reference']) ?></p>
    <p style="margin:0 0 4px;"><strong>Дата и час:</strong> <?= e(date('d.m.Y H:i', strtotime($record['created_at']))) ?></p>
    <?php if ($adminUrl && $app->get('app_url')): ?><p style="margin:0;"><a href="<?= e($adminUrl) ?>" style="color:<?= e($primary) ?>;">Преглед в админ панела</a></p><?php endif ?>
  </td></tr>
  <?php foreach ($blocks as $block): ?>
    <?php if ($block['title'] !== ''): ?>
    <tr><td style="padding:22px 24px 0;">
      <div style="background:<?= e($primary) ?>;color:#fff;font-size:15px;font-weight:bold;padding:8px 12px;border-radius:4px;"><?= e($block['title']) ?></div>
    </td></tr>
    <?php endif ?>
    <?php foreach ($block['sections'] as $section): ?>
    <tr><td style="padding:14px 24px 0;">
      <?php if ($section['title'] !== ''): ?>
        <div style="font-size:14px;font-weight:bold;color:<?= e($primary) ?>;border-bottom:2px solid <?= e($primary) ?>;padding-bottom:4px;margin-bottom:6px;"><?= e($section['title']) ?></div>
      <?php endif ?>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
        <?php foreach ($section['items'] as $item): ?>
        <tr>
          <td style="padding:6px 8px 6px 0;border-bottom:1px solid #e6e9ee;color:#5a6472;width:40%;vertical-align:top;"><?= e($item['label']) ?></td>
          <td style="padding:6px 0;border-bottom:1px solid #e6e9ee;vertical-align:top;"><?= $item['value'] !== '' ? nl2br(e($item['value'])) : '<span style="color:#9aa3ae;">—</span>' ?></td>
        </tr>
        <?php endforeach ?>
      </table>
    </td></tr>
    <?php endforeach ?>
  <?php endforeach ?>
  <?php if ($pricing['parts']): ?>
  <tr><td style="padding:22px 24px 0;">
    <div style="font-size:15px;font-weight:bold;color:<?= e($primary) ?>;border-bottom:2px solid <?= e($accent) ?>;padding-bottom:4px;margin-bottom:6px;">Ориентировъчна стойност<?= $fullNet !== null ? ' на формулярите в това писмо' : '' ?> (без отстъпки)</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;">
      <tr style="color:#5a6472;"><td style="padding:4px 0;">Услуга</td><td style="padding:4px;text-align:right;">Кол.</td><td style="padding:4px;text-align:right;">Ед. цена</td><td style="padding:4px 0;text-align:right;">Сума</td></tr>
      <?php foreach ($pricing['parts'] as $part): foreach ($part['lines'] as $l): ?>
      <tr>
        <td style="padding:5px 0;border-top:1px solid #e6e9ee;"><?= e($l['label']) ?></td>
        <td style="padding:5px 4px;border-top:1px solid #e6e9ee;text-align:right;white-space:nowrap;"><?= e(Pricing::qty($l['qty']) . ' ' . $l['unit']) ?></td>
        <td style="padding:5px 4px;border-top:1px solid #e6e9ee;text-align:right;white-space:nowrap;"><?= e(Pricing::money($l['price'])) ?></td>
        <td style="padding:5px 0;border-top:1px solid #e6e9ee;text-align:right;white-space:nowrap;"><?= e(Pricing::money($l['total'])) ?></td>
      </tr>
      <?php endforeach; endforeach ?>
      <tr><td colspan="3" style="padding:8px 0 2px;border-top:2px solid #1d2530;text-align:right;">Общо без ДДС</td><td style="padding:8px 0 2px;border-top:2px solid #1d2530;text-align:right;white-space:nowrap;"><?= e(Pricing::money($pricing['net'])) ?></td></tr>
      <tr><td colspan="3" style="padding:2px 0;text-align:right;">ДДС <?= e($pricing['vat_rate']) ?>%</td><td style="padding:2px 0;text-align:right;white-space:nowrap;"><?= e(Pricing::money($pricing['vat'])) ?></td></tr>
      <tr><td colspan="3" style="padding:2px 0;text-align:right;font-weight:bold;">Общо с ДДС</td><td style="padding:2px 0;text-align:right;font-weight:bold;white-space:nowrap;"><?= e(Pricing::money($pricing['gross'])) ?></td></tr>
    </table>
    <?php if ($fullNet !== null): ?><p style="font-size:13px;margin:8px 0 0;">Стойност на цялата заявка (всички формуляри), без ДДС: <strong><?= e(Pricing::money($fullNet)) ?></strong></p><?php endif ?>
    <p style="font-size:12px;color:#7a8490;margin:6px 0 0;">Сумата е ориентировъчна. Отстъпките се прилагат при издаване на проформа-фактурата.</p>
  </td></tr>
  <?php endif ?>
  <tr><td style="padding:20px 24px;font-size:12px;color:#7a8490;">
    <?= e($app->get('organization.name', 'Международен Панаир Пловдив')) ?><?php if ($app->get('organization.website')): ?> · <?= e($app->get('organization.website')) ?><?php endif ?>
  </td></tr>
</table>
</td></tr></table>
</body></html>
