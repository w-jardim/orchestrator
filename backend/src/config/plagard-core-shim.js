'use strict';

const jwt = require('jsonwebtoken');

const ROLES = {
  ADMIN_MASTER: 'ADMIN_MASTER',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
};

const ROLE_HIERARCHY = {
  ADMIN_MASTER: 0,
  ADMIN: 1,
  OPERATOR: 2,
  VIEWER: 3,
};

function signAccessToken(payload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRES || '15m';

  return jwt.sign(payload, secret, { expiresIn });
}

function verifyAccessToken(token) {
  const secret = process.env.JWT_ACCESS_SECRET;
  return jwt.verify(token, secret);
}

function hasMinimumRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }

  return userLevel <= requiredLevel;
}

module.exports = {
  logger: require('../utils/logger'),
  auth: {
    jwt: {
      signAccessToken,
      verifyAccessToken,
    },
  },
  policies: {
    ROLES,
    hasMinimumRole,
  },
  queue: {
    QUEUES: {
      DEPLOY: 'deploy',
      TASKS: 'tasks',
    },
    getQueue: () => ({
      getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
    }),
    getQueueConnection: () => ({
      status: 'ready',
      connect: async () => {},
      ping: async () => 'PONG',
    }),
    enqueueDeploy: () => Promise.resolve(),
  },
  integrations: {
    docker: (() => {
      function getDocker() {
        const Docker = require('dockerode');
        return new Docker();
      }

      return {
        listContainers: async (options) => {
          const docker = getDocker();
          return await docker.listContainers(options || { all: false });
        },

        startContainer: async (id) => {
          const docker = getDocker();
          const container = docker.getContainer(id);
          return await container.start();
        },

        stopContainer: async (id, options) => {
          const docker = getDocker();
          const container = docker.getContainer(id);
          return await container.stop(options || {});
        },

        restartContainer: async (id, options) => {
          const docker = getDocker();
          const container = docker.getContainer(id);
          return await container.restart(options || {});
        },

        removeContainer: async (id, options) => {
          const docker = getDocker();
          const container = docker.getContainer(id);
          return await container.remove(options || {});
        },

        getContainerLogs: async (id, options) => {
          const docker = getDocker();
          const container = docker.getContainer(id);
          const defaultOpts = { stdout: true, stderr: true, tail: 100, follow: false, ...options };
          const stream = await container.logs(defaultOpts);
          if (typeof stream === 'string') return stream;
          return stream.toString('utf8');
        },

        runContainer: async (image, cmd, options) => {
          const docker = getDocker();
          return await docker.run(image, cmd, process.stdout, options || {});
        },

        listImages: async (options) => {
          const docker = getDocker();
          return await docker.listImages(options || {});
        },

        inspectImage: async (id) => {
          const docker = getDocker();
          const image = docker.getImage(id);
          return await image.inspect();
        },

        pullImage: async (image) => {
          const docker = getDocker();
          return new Promise((resolve, reject) => {
            docker.pull(image, (err, stream) => {
              if (err) return reject(err);
              docker.modem.followProgress(stream, (err2, output) => {
                if (err2) return reject(err2);
                resolve(output);
              });
            });
          });
        },

        removeImage: async (id, options) => {
          const docker = getDocker();
          const image = docker.getImage(id);
          return await image.remove(options || {});
        },
      };
    })(),
  },
};
