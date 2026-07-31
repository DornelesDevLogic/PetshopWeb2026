/**
 * Gera um certificado SSL autoassinado para o IP local (10.1.4.194).
 * Usado apenas em desenvolvimento/testes PWA.
 *
 * Execução: npm run certs
 * Requer Node.js 15+ (crypto nativo com X.509).
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir  = join(__dirname, '..', 'certs');

if (!existsSync(certsDir)) mkdirSync(certsDir, { recursive: true });

const keyPath  = join(certsDir, 'key.pem');
const certPath = join(certsDir, 'cert.pem');

// IP e hostname da máquina de desenvolvimento
const LOCAL_IP = '10.1.4.194';

console.log('🔐 Gerando certificado SSL autoassinado...\n');

// openssl precisa estar disponível (vem com Git for Windows / WSL)
try {
  execSync(`openssl version`, { stdio: 'pipe' });
} catch {
  console.error('❌  openssl não encontrado.');
  console.error('   Instale o Git for Windows (vem com openssl) ou o OpenSSL diretamente.');
  process.exit(1);
}

const subj = `/C=BR/ST=RS/L=Local/O=PetShop Dev/CN=${LOCAL_IP}`;
const san  = `subjectAltName=IP:${LOCAL_IP},IP:127.0.0.1,DNS:localhost`;

execSync(
  `openssl req -x509 -newkey rsa:2048 -nodes `
  + `-keyout "${keyPath}" `
  + `-out "${certPath}" `
  + `-days 365 `
  + `-subj "${subj}" `
  + `-addext "${san}"`,
  { stdio: 'inherit' },
);

console.log('\n✅ Certificado gerado em:');
console.log(`   Chave:  ${keyPath}`);
console.log(`   Cert:   ${certPath}`);
console.log('\n📱 Próximos passos:');
console.log(`   1. npm run dev:https`);
console.log(`   2. Acesse https://${LOCAL_IP}:3002 no celular`);
console.log(`   3. Aceite o aviso de segurança (certificado autoassinado)`);
console.log(`   4. Cole https://${LOCAL_IP}:3002 no PWABuilder\n`);
