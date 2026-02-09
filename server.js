const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial TEXT,
      hostname TEXT,
      mac_lan TEXT,
      mac_wifi TEXT,
      nome TEXT,
      responsavel TEXT,
      ramal TEXT,
      celular_corporativo TEXT,
      modelo TEXT,
      pulsus_codigo TEXT,
      data_criacao TEXT DEFAULT (datetime('now'))
    )`
  );
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() === '.txt') {
      cb(null, true);
      return;
    }
    cb(new Error('Apenas arquivos .txt são permitidos.'));
  }
});

const fields = [
  'serial',
  'hostname',
  'mac_lan',
  'mac_wifi',
  'nome',
  'responsavel',
  'ramal',
  'celular_corporativo',
  'modelo',
  'pulsus_codigo',
  'data_criacao'
];

const parseTxtToFields = (content) => {
  const result = {};
  const lines = content.split(/\r?\n/);
  lines.forEach((line) => {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) {
      return;
    }
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    const normalizedKey = key
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');
    if (fields.includes(normalizedKey)) {
      result[normalizedKey] = value;
    }
  });
  return result;
};

const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function runCallback(err) {
    if (err) {
      reject(err);
      return;
    }
    resolve(this);
  });
});

const getAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row);
  });
});

const allAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(rows);
  });
});

app.post('/terms', async (req, res) => {
  const payload = req.body || {};
  const dataCriacao = payload.data_criacao || null;
  try {
    const result = await runAsync(
      `INSERT INTO terms (
        serial,
        hostname,
        mac_lan,
        mac_wifi,
        nome,
        responsavel,
        ramal,
        celular_corporativo,
        modelo,
        pulsus_codigo,
        data_criacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        payload.serial || null,
        payload.hostname || null,
        payload.mac_lan || null,
        payload.mac_wifi || null,
        payload.nome || null,
        payload.responsavel || null,
        payload.ramal || null,
        payload.celular_corporativo || null,
        payload.modelo || null,
        payload.pulsus_codigo || null,
        dataCriacao
      ]
    );
    const created = await getAsync('SELECT * FROM terms WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar registro.', error: error.message });
  }
});

app.get('/terms', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM terms ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar registros.', error: error.message });
  }
});

app.get('/terms/:id', async (req, res) => {
  try {
    const row = await getAsync('SELECT * FROM terms WHERE id = ?', [req.params.id]);
    if (!row) {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }
    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar registro.', error: error.message });
  }
});

app.put('/terms/:id', async (req, res) => {
  const payload = req.body || {};
  try {
    const existing = await getAsync('SELECT * FROM terms WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }
    await runAsync(
      `UPDATE terms SET
        serial = ?,
        hostname = ?,
        mac_lan = ?,
        mac_wifi = ?,
        nome = ?,
        responsavel = ?,
        ramal = ?,
        celular_corporativo = ?,
        modelo = ?,
        pulsus_codigo = ?,
        data_criacao = ?
      WHERE id = ?`,
      [
        payload.serial ?? existing.serial,
        payload.hostname ?? existing.hostname,
        payload.mac_lan ?? existing.mac_lan,
        payload.mac_wifi ?? existing.mac_wifi,
        payload.nome ?? existing.nome,
        payload.responsavel ?? existing.responsavel,
        payload.ramal ?? existing.ramal,
        payload.celular_corporativo ?? existing.celular_corporativo,
        payload.modelo ?? existing.modelo,
        payload.pulsus_codigo ?? existing.pulsus_codigo,
        payload.data_criacao ?? existing.data_criacao,
        req.params.id
      ]
    );
    const updated = await getAsync('SELECT * FROM terms WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar registro.', error: error.message });
  }
});

app.delete('/terms/:id', async (req, res) => {
  try {
    const existing = await getAsync('SELECT * FROM terms WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }
    await runAsync('DELETE FROM terms WHERE id = ?', [req.params.id]);
    res.json({ message: 'Registro removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover registro.', error: error.message });
  }
});

app.post('/terms/upload-txt', upload.single('file'), async (req, res) => {
  try {
    const content = await fs.promises.readFile(req.file.path, 'utf8');
    const parsed = parseTxtToFields(content);
    const targetId = req.body?.id;

    if (targetId) {
      const existing = await getAsync('SELECT * FROM terms WHERE id = ?', [targetId]);
      if (!existing) {
        res.status(404).json({ message: 'Draft não encontrado.' });
        return;
      }
      await runAsync(
        `UPDATE terms SET
          serial = ?,
          hostname = ?,
          mac_lan = ?,
          mac_wifi = ?,
          nome = ?,
          responsavel = ?,
          ramal = ?,
          celular_corporativo = ?,
          modelo = ?,
          pulsus_codigo = ?,
          data_criacao = ?
        WHERE id = ?`,
        [
          parsed.serial ?? existing.serial,
          parsed.hostname ?? existing.hostname,
          parsed.mac_lan ?? existing.mac_lan,
          parsed.mac_wifi ?? existing.mac_wifi,
          parsed.nome ?? existing.nome,
          parsed.responsavel ?? existing.responsavel,
          parsed.ramal ?? existing.ramal,
          parsed.celular_corporativo ?? existing.celular_corporativo,
          parsed.modelo ?? existing.modelo,
          parsed.pulsus_codigo ?? existing.pulsus_codigo,
          parsed.data_criacao ?? existing.data_criacao,
          targetId
        ]
      );
      const updated = await getAsync('SELECT * FROM terms WHERE id = ?', [targetId]);
      res.json({ mode: 'update', term: updated });
      return;
    }

    const result = await runAsync(
      `INSERT INTO terms (
        serial,
        hostname,
        mac_lan,
        mac_wifi,
        nome,
        responsavel,
        ramal,
        celular_corporativo,
        modelo,
        pulsus_codigo,
        data_criacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        parsed.serial || null,
        parsed.hostname || null,
        parsed.mac_lan || null,
        parsed.mac_wifi || null,
        parsed.nome || null,
        parsed.responsavel || null,
        parsed.ramal || null,
        parsed.celular_corporativo || null,
        parsed.modelo || null,
        parsed.pulsus_codigo || null,
        parsed.data_criacao || null
      ]
    );
    const created = await getAsync('SELECT * FROM terms WHERE id = ?', [result.lastID]);
    res.status(201).json({ mode: 'create', term: created });
  } catch (error) {
    res.status(400).json({ message: 'Erro ao processar TXT.', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
