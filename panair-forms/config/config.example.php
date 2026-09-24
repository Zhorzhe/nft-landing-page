<?php
/*
 * Копирайте този файл като config/config.php и попълнете стойностите.
 * config/config.php НЕ се качва в git (съдържа пароли).
 */
return [
    // Публичният адрес, на който е качено приложението (без / накрая).
    'app_url' => 'https://forms.fair.bg',
    // Ако приложението е в подпапка (напр. https://fair.bg/online-forms), задайте '/online-forms'.
    'base_path' => '',

    // Дълъг случаен низ – генерирайте с: php -r "echo bin2hex(random_bytes(32));"
    'secret' => 'CHANGE-ME',

    'timezone' => 'Europe/Sofia',
    'debug' => false,
    'show_index' => true,          // "/" показва списък с активните форми
    'min_fill_seconds' => 3,       // защита от ботове: минимално време за попълване
    'rate_limit_per_10min' => 10,  // макс. заявки от един IP за 10 минути

    'organization' => [
        'name' => 'Международен Панаир Пловдив',
        'website' => 'https://fair.bg',
        'address' => 'бул. „Цар Борис III Обединител“ 37, 4003 Пловдив',
        'phone' => '',
        'email' => '',
        'privacy_url' => '',
    ],

    // Цветове и лого (ще бъдат уточнени с официалните цветове на fair.bg).
    'theme' => [
        'primary' => '#0b3a6e',
        'primary_dark' => '#072849',
        'accent' => '#d32f2f',
        'logo' => 'assets/logo.svg',   // път в public/ или пълен URL
        'favicon' => '',
    ],

    // Получател по подразбиране, ако за дадена форма не е зададен такъв.
    // Получателите за всяка форма се сменят в админ панела (/admin/forms)
    // или в "recipients" на съответния config/forms/<форма>.json.
    'default_recipients' => ['office@fair.bg'],

    'mail' => [
        // 'smtp' – реално изпращане през SMTP сървър (препоръчително)
        // 'mail' – през PHP mail() на хостинга
        // 'log'  – ТЕСТОВ режим: имейлите се записват в storage/mail/*.eml, не се изпращат
        'transport' => 'log',
        'host' => 'smtp.example.com',
        'port' => 587,
        'encryption' => 'tls',       // 'tls' (порт 587), 'ssl' (порт 465) или 'none'
        'username' => '',
        'password' => '',            // може и чрез променлива на средата PANAIR_SMTP_PASSWORD
        'from_email' => 'noreply@fair.bg',
        'from_name' => 'Международен Панаир Пловдив – онлайн заявки',
        // Над този общ размер файловете не се прикачват към имейла (остават в админ панела).
        'max_attachments_total_mb' => 20,
    ],

    'upload' => [
        'max_file_mb' => 10,
        'allowed' => ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
    ],

    'admin' => [
        // Генерирайте с: php bin/set-admin-password.php
        'password_hash' => '',
    ],
];
