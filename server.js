const express = require("express");
const multer = require("multer");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const REQUIRED_FIELDS = ["serial", "hostname", "mac_lan", "mac_wifi"];

const parseInventoryText = (text) => {
  const data = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(
      /^(serial|hostname|mac_lan|mac_wifi)\s*[:=]\s*(.+)$/i
    );
    if (match) {
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      if (value) {
        data[key] = value;
      }
    }
  }

  return data;
};

app.post("/upload-inventory", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message:
        "Nenhum arquivo enviado. Envie um arquivo TXT no campo 'file'.",
      errors: {
        file: "Arquivo TXT é obrigatório.",
      },
    });
  }

  const content = req.file.buffer.toString("utf-8");
  const data = parseInventoryText(content);
  const errors = {};

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      errors[field] = `O campo '${field}' é obrigatório.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message:
        "Não foi possível processar o inventário. Verifique os campos obrigatórios.",
      errors,
    });
  }

  return res.json({
    message: "Inventário processado com sucesso.",
    data,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor ativo na porta ${PORT}`);
});
