# Онлайн формуляри за заявки за участие – Международен Панаир Пловдив

Малко самостоятелно PHP приложение. Всяко изложение има своя форма на свой URL, например
`https://forms.fair.bg/forms/foodtech-2027`. Към този URL сочи бутон от страницата на изложението във fair.bg.

При изпращане на формата:
1. заявката **първо се записва** (база `storage/submissions.sqlite` + папка `storage/submissions/<номер>/` с `data.json` и файловете);
2. изпраща се имейл до получателя на формата с всички данни и прикачените файлове (Reply-To = имейлът на подателя);
3. по желание подателят получава потвърждение с копие на данните;
4. подателят вижда страница „Заявката е изпратена успешно“ с номер на заявката (напр. `FT27-00012`).

Ако имейлът не стигне, заявката остава в **админ панела** (`/admin`). Оттам може да се види, да се изтеглят файловете, да се изпрати имейлът повторно и да се направи експорт в Excel (CSV).

---

## 1. Инсталация (еднократно)

Изисквания: PHP 8.1+ с разширения `pdo_sqlite`, `fileinfo`, `mbstring`, `openssl`, плюс Composer.

```bash
composer install --no-dev
cp config/config.example.php config/config.php
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"   # → поставете в 'secret'
php bin/set-admin-password.php                    # → поставете хеша в 'admin' => ['password_hash' => ...]
```

В `config/config.php` попълнете:
- `app_url`: адресът, на който е качено приложението;
- `mail`: SMTP данните (`transport => 'smtp'`, host, port, username, password, `from_email`). **Тестовият режим `'log'` не изпраща имейли**, а ги записва в `storage/mail/*.eml`;
- `theme`: основните цветове на fair.bg и пътя до логото (сложете логото в `public/assets/`).

**Уеб сървър:** DocumentRoot трябва да сочи към папката `public/`. Ако хостингът не позволява това, качете цялата папка. Файлът `.htaccess` в корена пренасочва всичко към `public/` и блокира `config/`, `storage/` и `vendor/`.
Папката `storage/` трябва да е с права за запис от PHP.

За nginx:
```nginx
root /var/www/panair-forms/public;
client_max_body_size 64M;
location / { try_files $uri /index.php$is_args$args; }
location ~ \.php$ { include fastcgi_params; fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; fastcgi_pass unix:/run/php/php-fpm.sock; }
```

Лимитите за качване (`upload_max_filesize = 11M`, `post_max_size = 64M`) са зададени в `public/.user.ini` и `public/.htaccess`. Ако хостингът ги игнорира, задайте ги в php.ini.

**Локален тест:**
```bash
php -d upload_max_filesize=11M -d post_max_size=64M -S localhost:8000 -t public public/index.php
# отворете http://localhost:8000/forms/foodtech-2027
```

---

## 2. Как да добавя нова форма за ново изложение

1. Копирайте `config/forms/_template.json` (или форма на подобно изложение) като нов файл, напр.
   `config/forms/priroda-lov-ribolov-2027.json`.
   **Името на файла става адресът на формата:** `/forms/priroda-lov-ribolov-2027`.
   Използвайте само малки латински букви, цифри и тире.
2. Попълнете `title`, `dates`, `recipients` (получател), `reference_prefix` (кратък префикс за номера, напр. `PLR27`), `event_url` и, по желание, `deadline` (след тази дата формата се затваря).
3. В `sections` опишете полетата от официалния формуляр (PDF/Word):
   - `{ "use": "company" }`, `{ "use": "contact" }` и `{ "use": "files" }` вмъкват стандартните блокове (фирма, лице за контакт, файлове). Те се редактират на едно място в `config/forms/_sections/`;
   - останалите полета се описват така:

   ```json
   { "name": "area_m2", "label": "Заявена площ", "type": "number", "required": true, "min": 6, "unit": "м²", "width": "half" }
   ```

   | Ключ | Значение |
   |---|---|
   | `name` | уникално техническо име (латиница, без интервали) |
   | `label` | надписът, който вижда потребителят |
   | `type` | `text`, `email`, `tel`, `eik`, `number`, `date`, `textarea`, `select` (падащо меню), `radio` (един избор), `checkboxes` (много избори), `checkbox` (една отметка), `file`, `note` (само текст) |
   | `required` | `true` = задължително |
   | `options` | за `select`/`radio`/`checkboxes`: `["А", "Б"]` или `[{ "value": "a", "label": "Щанд 9 м²", "price": "900 €" }]` |
   | `width` | `full` (по подразбиране), `half` или `third`; на мобилен телефон полетата винаги са на цял ред |
   | `help`, `placeholder`, `unit`, `min`, `max`, `step`, `maxlength`, `rows` | по желание |
   | за `file` | `multiple`, `max_files`, `accept` (напр. `["pdf","docx"]`), `max_mb` |

4. Проверете за грешки:
   ```bash
   php bin/check-forms.php
   ```
5. Отворете новия адрес и изпратете тестова заявка.

`"draft": true` показва жълт банер „Чернова“ над формата. Махнете го, когато полетата са окончателни.
`"active": false` затваря формата (показва „приемането на заявки е приключило“).

---

## 3. Как да сменя имейла на получателя

**Вариант А – през админ панела (без достъп до файловете):**
1. Отворете `https://<адрес>/admin` и въведете паролата.
2. **Форми и получатели** → при съответното изложение въведете новия имейл в „Получатели“. Няколко адреса се разделят със запетая, а по желание може да добавите и копие (CC).
3. **Запази.** Промяната важи веднага за следващите заявки.

**Вариант Б – в конфигурационния файл:** в `config/forms/<форма>.json` сменете
```json
"recipients": ["novo@fair.bg"],
```
Внимание: ако получателят вече е сменян през админ панела, настройката от панела има предимство (пази се в `storage/settings.json`).

Имейлът, от който се изпращат писмата (`from_email`), и SMTP сървърът се задават в `config/config.php`.

---

## 4. Бутон за страниците на fair.bg

Готов код има в `embed/button.html`. Поставете го в HTML режима на редактора на страницата на изложението (в секция „Формуляри“) и сменете линка:

```html
<a href="https://forms.fair.bg/forms/foodtech-2027" target="_blank" rel="noopener"
   style="display:inline-block;padding:12px 28px;background:#d32f2f;color:#fff;font-weight:600;border-radius:6px;text-decoration:none;">
  Онлайн заявка за участие
</a>
```

Ако редакторът на CMS не позволява HTML, добавете обикновен линк към адреса на формата.

---

## Структура

```
config/config.php             настройки (SMTP, цветове, парола) – не се качва в git
config/forms/*.json           по един файл за всяка форма
config/forms/_sections/*.json общи блокове полета (фирма, контакт, файлове)
public/                       публична папка (index.php, CSS, JS, лого)
src/, templates/              код и HTML шаблони (страници, имейл, админ)
storage/                      заявки, файлове, база, настройки от админ панела (само за запис от PHP, недостъпна отвън)
bin/check-forms.php           проверка на формите
bin/set-admin-password.php    генериране на парола за админ панела
```

## Сигурност и защита от спам
- Валидация на всички полета на сървъра: задължителни полета, имейл, телефон, ЕИК с контролна цифра, числа, опции от списъка.
- Файлове: до 10 MB, само PDF/JPG/PNG/DOCX, проверява се и реалното съдържание (не само разширението).
- Скрито поле срещу ботове, подписан времеви маркер, лимит на заявки от един IP.
- `storage/` не е достъпна от уеб; файловете се теглят само от админ панела след вход.

## Архивиране
Архивирайте периодично папката `storage/`. В нея са всички заявки и прикачени файлове.
