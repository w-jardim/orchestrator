'use strict';

const Dockerode = require('dockerode');

const SOCKET_PATH = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

let _docker = null;

function getDockerClient() {
  if (_docker) return _docker;
  _docker = new Dockerode({ socketPath: SOCKET_PATH });
  return _docker;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

async function listContainers({ all = false } = {}) {
  const docker = getDockerClient();
  const raw = await docker.listContainers({ all });
  return raw.map(formatSummary);
}

// ─── INSPECT ──────────────────────────────────────────────────────────────────

async function inspectContainer(id) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  const raw = await container.inspect();
  return formatDetail(raw);
}

// ─── START ────────────────────────────────────────────────────────────────────

async function startContainer(id) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.start();
}

// ─── STOP ─────────────────────────────────────────────────────────────────────

async function stopContainer(id, { timeout = 10 } = {}) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.stop({ t: Math.min(timeout, 60) });
}

// ─── RESTART ──────────────────────────────────────────────────────────────────

async function restartContainer(id, { timeout = 10 } = {}) {
  const docker = getDockerClient();
  const container = docker.getContainer(id);
  await container.restart({ t: Math.min(timeout, 60) });
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────

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

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

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
      // Mask sensitive env vars
      const [key] = e.split('=');
      if (/pass|secret|token|key|pwd/i.test(key)) return `${key}=***`;
      return e;
    }),
  };
}

// Docker multiplexes stdout/stderr into a framed stream (non-TTY containers).
// Each frame: [stream_type(1B), 0,0,0(3B), payload_size_BE(4B), payload...]
// stream_type: 1=stdout, 2=stderr. TTY containers emit raw bytes (no frames).
function parseLogs(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    const text = String(buffer);
    return text.split('\n').filter(Boolean).map((line) => ({ stream: 'stdout', text: line }));
  }

  if (buffer.length === 0) return [];

  // Detect multiplexed format: first byte must be 1 or 2, bytes 1-3 must be 0
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
  getContainerLogs,
};
