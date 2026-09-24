<?php
// Употреба: php bin/set-admin-password.php
// Генерира хеш на парола за admin.password_hash в config/config.php
fwrite(STDOUT, 'Нова парола за админ панела: ');
system('stty -echo 2>/dev/null');
$pw = trim((string)fgets(STDIN));
system('stty echo 2>/dev/null');
fwrite(STDOUT, "\n");
if (strlen($pw) < 10) {
    fwrite(STDERR, "Паролата трябва да е поне 10 символа.\n");
    exit(1);
}
echo "Поставете в config/config.php → 'admin' => ['password_hash' => '...']:\n\n";
echo password_hash($pw, PASSWORD_DEFAULT), "\n";
