'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class GitCredentialsService {
  constructor() {
    this.sshDir = path.join(process.env.HOME || process.env.USERPROFILE, '.ssh');
    this.knownHostsPath = path.join(this.sshDir, 'known_hosts');
    this.configPath = path.join(this.sshDir, 'config');
  }

  ensureSshDir() {
    if (!fs.existsSync(this.sshDir)) {
      fs.mkdirSync(this.sshDir, { mode: 0o700, recursive: true });
    }
  }

  addSshKey(name, privateKey, publicKey) {
    this.ensureSshDir();

    const privateKeyPath = path.join(this.sshDir, `${name}_rsa`);
    const publicKeyPath = path.join(this.sshDir, `${name}_rsa.pub`);

    if (fs.existsSync(privateKeyPath)) {
      throw new Error(`SSH key "${name}" already exists`);
    }

    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

    return { privateKeyPath, publicKeyPath };
  }

  removeSshKey(name) {
    const privateKeyPath = path.join(this.sshDir, `${name}_rsa`);
    const publicKeyPath = path.join(this.sshDir, `${name}_rsa.pub`);

    if (fs.existsSync(privateKeyPath)) {
      fs.unlinkSync(privateKeyPath);
    }
    if (fs.existsSync(publicKeyPath)) {
      fs.unlinkSync(publicKeyPath);
    }
  }

  listSshKeys() {
    this.ensureSshDir();

    const keys = [];
    const files = fs.readdirSync(this.sshDir);

    for (const file of files) {
      if (file.endsWith('_rsa')) {
        const name = file.replace('_rsa', '');
        const privateKeyPath = path.join(this.sshDir, file);
        const publicKeyPath = path.join(this.sshDir, `${file}.pub`);

        keys.push({
          name,
          privateKeyPath,
          publicKeyPath,
          exists: fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath),
        });
      }
    }

    return keys;
  }

  getSshKeyFingerprint(name) {
    const publicKeyPath = path.join(this.sshDir, `${name}_rsa.pub`);

    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`SSH key "${name}" not found`);
    }

    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    const parts = publicKey.trim().split(' ');

    if (parts.length < 2) {
      throw new Error('Invalid public key format');
    }

    const keyData = Buffer.from(parts[1], 'base64');
    const fingerprint = crypto.createHash('md5').update(keyData).digest('hex');

    return fingerprint.match(/.{1,2}/g).join(':');
  }

  configureSshHost(hostname, user, identityFile, port = 22) {
    this.ensureSshDir();

    let config = '';
    if (fs.existsSync(this.configPath)) {
      config = fs.readFileSync(this.configPath, 'utf8');
    }

    const hostConfig = `
Host ${hostname}
    User ${user}
    IdentityFile ${identityFile}
    Port ${port}
    StrictHostKeyChecking accept-new
    UserKnownHostsFile ${this.knownHostsPath}
`;

    if (!config.includes(`Host ${hostname}`)) {
      config += hostConfig;
      fs.writeFileSync(this.configPath, config, { mode: 0o600 });
    }
  }

  addKnownHost(hostname, hostKey) {
    this.ensureSshDir();

    let knownHosts = '';
    if (fs.existsSync(this.knownHostsPath)) {
      knownHosts = fs.readFileSync(this.knownHostsPath, 'utf8');
    }

    const existingEntry = knownHosts.split('\n').some((line) => line.startsWith(`${hostname} `));

    if (!existingEntry) {
      knownHosts += `${hostname} ${hostKey}\n`;
      fs.writeFileSync(this.knownHostsPath, knownHosts, { mode: 0o644 });
    }
  }

  generateSshKeypair(name, comment = '') {
    const keyName = `${name}_rsa`;
    const keyPath = path.join(this.sshDir, keyName);

    if (fs.existsSync(keyPath)) {
      throw new Error(`SSH key "${name}" already exists`);
    }

    this.ensureSshDir();

    try {
      execSync(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -C "${comment}"`, {
        stdio: 'pipe',
      });

      const privateKey = fs.readFileSync(keyPath, 'utf8');
      const publicKey = fs.readFileSync(`${keyPath}.pub`, 'utf8');

      return { name, privateKey, publicKey };
    } catch (err) {
      throw new Error(`Failed to generate SSH key: ${err.message}`);
    }
  }

  testGitAuth(repositoryUrl) {
    try {
      execSync(`git ls-remote ${repositoryUrl}`, { stdio: 'pipe' });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  configureGitGlobal(name, email) {
    try {
      execSync(`git config --global user.name "${name}"`);
      execSync(`git config --global user.email "${email}"`);
      return { success: true };
    } catch (err) {
      throw new Error(`Failed to configure git: ${err.message}`);
    }
  }
}

module.exports = new GitCredentialsService();
