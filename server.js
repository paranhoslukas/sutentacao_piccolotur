const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const registros = {
  '1': {
    nome: 'Maria Silva',
    cpf: '123.456.789-00',
    endereco: 'Rua das Flores, 123 - Centro - São Paulo/SP',
    servico: 'Importação de NF-e e boletos',
    valor: 'R$ 1.250,00',
    data: '2025-02-09',
    cidade: 'São Paulo'
  },
  '2': {
    nome: 'João Pereira',
    cpf: '987.654.321-00',
    endereco: 'Av. Brasil, 456 - Copacabana - Rio de Janeiro/RJ',
    servico: 'Extração de códigos de barras',
    valor: 'R$ 780,00',
    data: '2025-02-10',
    cidade: 'Rio de Janeiro'
  }
};

const publicDir = path.join(__dirname, 'public');
const termoTemplatePath = path.join(publicDir, 'termo.html');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const renderTemplate = (template, record) => {
  const data = {
    ...record,
    dataFormatada: new Date(record.data).toLocaleDateString('pt-BR')
  };

  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return data[key];
    }
    return match;
  });
};

const serveStatic = (filePath, response) => {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Arquivo não encontrado.');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[ext] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  });
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname.startsWith('/termo/')) {
    const id = url.pathname.split('/')[2];
    const registro = registros[id];

    if (!registro) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Registro não encontrado.');
      return;
    }

    fs.readFile(termoTemplatePath, 'utf8', (err, template) => {
      if (err) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Erro ao carregar o template.');
        return;
      }

      const html = renderTemplate(template, registro);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
    });
    return;
  }

  const filePath = url.pathname === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, url.pathname);
  serveStatic(filePath, response);
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
