'use strict';

const Dockerode = require('dockerode');

const SOCKET_PATH = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

let _docker = null;

function getDockerClient() {
  if (_docker) return _docker;
  _docker = new Dockerode({ socketPath: SOCKET_PATH });
  return _docker;
}

function buildPortConfig(ports = []) {
  return ports.reduce((acc, entry) => {
    const [hostPort, containerPort] = String(entry).split(':');
    const key = `${containerPort}/tcp`;

    acc.exposedPorts[key] = {};
    acc.portBindings[key] = [{ HostPort: String(hostPort) }];
    return acc;
  }, { exposedPorts: {}, portBindings: {} });
}

function buildEnvArray(env = {}) {
  return Object.entries(env).map(([key, value]) => `${key}=${value}`);
}

async function pullImage(image) {
  const docker = getDockerClient();

  const stream = await docker.pull(image);

  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, output) => {
      if (err) return reject(err);
      return resolve(output);
    });
  });
}

async function ensureImageAvailable(image) {
  const docker = getDockerClient();

  try {
    await docker.getImage(image).inspect();
  } catch (err) {
    if (err?.statusCode !== 404) throw err;
    await pullImage(image);
  }
}

async function listContainers({ all = false } = {}) {
  const docker = getDockerClient();
  const raw = await docker.listContainers({ all });
  return raw.map(formatSummary);
}

async function inspectContainer(id) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  const raw = await container.inspect();
  return formatDetail(raw);
}

async function startContainer(id) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.start();
}

async function stopContainer(id, { timeout = 10 } = {}) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.stop({ t: Math.min(timeout, 60) });
}

async function restartContainer(id, { timeout = 10 } = {}) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.restart({ t: Math.min(timeout, 60) });
}

async function removeContainer(id, { force = false } = {}) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.remove({ force });
}

async function runContainer({ name, image, ports = [], env = {} } = {}) {
  const docker = getDockerClient();
  const { exposedPorts, portBindings } = buildPortConfig(ports);

  await ensureImageAvailable(image);

  const container = await docker.createContainer({
    name,
    Image: image,
    Env: buildEnvArray(env),
    ExposedPorts: exposedPorts,
    HostConfig: {
      PortBindings: portBindings,
      RestartPolicy: { Name: 'unless-stopped' },
    },
  });

  await container.start();
  const raw = await container.inspect();
  return formatDetail(raw);
}

async function getContainerLogs(id, { tail = 100, timestamps = false } = {}) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);

  const safeTail = Math.min(Math.max(1, tail), 500);

  const buffer = await container.logs({
    stdout: true,
    stderr: true,
    follow: false,
    tail: safeTail,
    timestamps,
  });

  return parseLogs(buffer);
}

function formatSummary(raw) {
  return {
    id: raw.Id.slice(0, 12),
    fullId: raw.Id,
    names: (raw.Names || []).map((n) => n.replace(/^\//, '')),
    image: raw.Image,
    state: raw.State,
    status: raw.Status,
    created: new Date(raw.Created * 1000).toISOString(),
    ports: (raw.Ports || []).map((p) => ({
      ip: p.IP,
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort,
      type: p.Type,
    })),
  };
}

function formatDetail(raw) {
  return {
    id: raw.Id.slice(0, 12),
    fullId: raw.Id,
    name: (raw.Name || '').replace(/^\//, ''),
    image: raw.Config?.Image || null,
    state: {
      status: raw.State?.Status,
      running: raw.State?.Running,
      paused: raw.State?.Paused,
      restarting: raw.State?.Restarting,
      startedAt: raw.State?.StartedAt,
      finishedAt: raw.State?.FinishedAt,
      exitCode: raw.State?.ExitCode,
    },
    created: raw.Created,
    restartCount: raw.RestartCount || 0,
    mounts: (raw.Mounts || []).map((m) => ({
      type: m.Type,
      source: m.Source,
      destination: m.Destination,
      readOnly: !m.RW,
    })),
    ports: raw.NetworkSettings?.Ports || {},
    networks: Object.keys(raw.NetworkSettings?.Networks || {}),
    env: (raw.Config?.Env || []).map((e) => {
      const [key] = e.split('=');
      if (/pass|secret|token|key|pwd/i.test(key)) return `${key}=***`;
      return e;
    }),
  };
}

function parseLogs(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    const text = String(buffer);
    return text.split('\n').filter(Boolean).map((line) => ({ stream: 'stdout', text: line }));
  }

  if (buffer.length === 0) return [];

  const isMuxed =
    (buffer[0] === 1 || buffer[0] === 2) &&
    buffer[1] === 0 && buffer[2] === 0 && buffer[3] === 0;

  if (!isMuxed) {
    return buffer.toString('utf8').split('\n').filter(Boolean).map((line) => ({
      stream: 'stdout',
      text: line,
    }));
  }

  const lines = [];
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const streamType = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (size === 0) continue;
    if (offset + size > buffer.length) break;

    const chunk = buffer.slice(offset, offset + size).toString('utf8');
    chunk.split('\n').filter(Boolean).forEach((line) => {
      lines.push({ stream: streamType === 2 ? 'stderr' : 'stdout', text: line });
    });
    offset += size;
  }

  return lines;
}

module.exports = {
  listContainers,
  inspectContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  runContainer,
  getContainerLogs,
};
