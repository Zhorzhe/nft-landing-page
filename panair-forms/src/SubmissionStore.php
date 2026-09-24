<?php

declare(strict_types=1);

namespace PanairForms;

/**
 * Лог на всички заявки: SQLite база (storage/submissions.sqlite) +
 * папка за всяка заявка (storage/submissions/<номер>/) с data.json и прикачените файлове.
 * Така заявката е запазена дори ако имейлът не стигне.
 */
final class SubmissionStore
{
    private \PDO $db;

    public function __construct(private readonly string $dir)
    {
        if (!is_dir($dir . '/submissions')) {
            mkdir($dir . '/submissions', 0775, true);
        }
        $this->db = new \PDO('sqlite:' . $dir . '/submissions.sqlite', null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);
        $this->db->exec('PRAGMA busy_timeout = 5000');
        $this->db->exec('CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE,
            form_slug TEXT NOT NULL,
            form_title TEXT NOT NULL,
            company TEXT,
            email TEXT,
            created_at TEXT NOT NULL,
            ip TEXT,
            user_agent TEXT,
            data_json TEXT NOT NULL,
            files_json TEXT NOT NULL,
            mail_status TEXT NOT NULL DEFAULT "pending",
            mail_error TEXT,
            mail_sent_at TEXT,
            confirmation_status TEXT
        )');
        $this->db->exec('CREATE INDEX IF NOT EXISTS idx_form ON submissions(form_slug, id)');
    }

    /**
     * @param array<string, list<array{name:string,tmp:string,size:int,type:string}>> $uploads
     * @return array записът на заявката
     */
    public function create(array $form, array $values, array $uploads, array $meta): array
    {
        $this->db->beginTransaction();
        $stmt = $this->db->prepare('INSERT INTO submissions (form_slug, form_title, company, email, created_at, ip, user_agent, data_json, files_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $form['slug'], $form['title'],
            (string)($values[$form['company_field']] ?? ''),
            (string)($values[$form['reply_to_field']] ?? ''),
            date('Y-m-d H:i:s'), $meta['ip'] ?? '', mb_substr($meta['user_agent'] ?? '', 0, 300),
            json_encode($values, JSON_UNESCAPED_UNICODE), '[]',
        ]);
        $id = (int)$this->db->lastInsertId();
        $reference = sprintf('%s-%05d', $form['reference_prefix'], $id);

        $folder = $this->dir . '/submissions/' . $reference;
        mkdir($folder, 0775, true);

        $files = [];
        foreach ($uploads as $field => $list) {
            foreach ($list as $i => $u) {
                $stored = sprintf('%s_%d_%s', $field, $i + 1, $u['name']);
                if (!move_uploaded_file($u['tmp'], $folder . '/' . $stored)) {
                    $this->db->rollBack();
                    throw new \RuntimeException('Неуспешно записване на файл ' . $u['name']);
                }
                $files[] = ['field' => $field, 'name' => $u['name'], 'stored' => $stored, 'size' => $u['size'], 'type' => $u['type']];
            }
        }

        $this->db->prepare('UPDATE submissions SET reference = ?, files_json = ? WHERE id = ?')
            ->execute([$reference, json_encode($files, JSON_UNESCAPED_UNICODE), $id]);
        $this->db->commit();

        $record = $this->find($reference);
        file_put_contents($folder . '/data.json', json_encode([
            'reference' => $reference,
            'form' => $form['slug'],
            'form_title' => $form['title'],
            'created_at' => $record['created_at'],
            'values' => $values,
            'files' => $files,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $record;
    }

    public function find(string $reference): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM submissions WHERE reference = ?');
        $stmt->execute([$reference]);
        $row = $stmt->fetch();
        return $row ? $this->hydrate($row) : null;
    }

    public function list(?string $formSlug = null, int $limit = 200, int $offset = 0): array
    {
        $sql = 'SELECT * FROM submissions' . ($formSlug ? ' WHERE form_slug = :f' : '') . ' ORDER BY id DESC LIMIT :l OFFSET :o';
        $stmt = $this->db->prepare($sql);
        if ($formSlug) {
            $stmt->bindValue(':f', $formSlug);
        }
        $stmt->bindValue(':l', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':o', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        return array_map([$this, 'hydrate'], $stmt->fetchAll());
    }

    public function count(?string $formSlug = null): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM submissions' . ($formSlug ? ' WHERE form_slug = ?' : ''));
        $stmt->execute($formSlug ? [$formSlug] : []);
        return (int)$stmt->fetchColumn();
    }

    public function markMail(string $reference, bool $ok, ?string $error = null): void
    {
        $this->db->prepare('UPDATE submissions SET mail_status = ?, mail_error = ?, mail_sent_at = ? WHERE reference = ?')
            ->execute([$ok ? 'sent' : 'failed', $error, $ok ? date('Y-m-d H:i:s') : null, $reference]);
    }

    public function markConfirmation(string $reference, string $status): void
    {
        $this->db->prepare('UPDATE submissions SET confirmation_status = ? WHERE reference = ?')->execute([$status, $reference]);
    }

    /** Брой заявки от даден IP през последните N минути (защита от спам). */
    public function recentFromIp(string $ip, int $minutes): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM submissions WHERE ip = ? AND created_at >= ?');
        $stmt->execute([$ip, date('Y-m-d H:i:s', time() - $minutes * 60)]);
        return (int)$stmt->fetchColumn();
    }

    /** @return array{path:string,name:string}|null */
    public function file(array $record, string $stored): ?array
    {
        foreach ($record['files'] as $f) {
            if ($f['stored'] === $stored) {
                $path = $this->dir . '/submissions/' . $record['reference'] . '/' . $f['stored'];
                return is_file($path) ? ['path' => $path, 'name' => $f['name']] : null;
            }
        }
        return null;
    }

    private function hydrate(array $row): array
    {
        $row['values'] = json_decode($row['data_json'], true) ?: [];
        $row['files'] = json_decode($row['files_json'], true) ?: [];
        return $row;
    }
}
