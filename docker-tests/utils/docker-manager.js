/**
 * Docker Environment Manager
 * 
 * Manages Docker containers for testing, ensuring clean startup/shutdown cycles
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const TEST_CONFIG = require('../config/test-config');

class DockerManager {
  constructor() {
    this.isRunning = false;
    this.containerIds = [];
    this.logStream = null;
  }

  /**
   * Stop all existing containers and start fresh environment
   */
  async startFreshEnvironment() {
    console.log('🐳 Starting fresh Docker environment...');
    
    try {
      // Stop and remove any existing containers
      await this.stopAllContainers();
      await this.cleanup();
      
      // Start new environment
      await this.startDockerCompose();
      await this.waitForHealthy();
      
      this.isRunning = true;
      console.log('✅ Docker environment ready for testing');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start Docker environment:', error.message);
      throw error;
    }
  }

  /**
   * Stop all Docker containers
   */
  async stopAllContainers() {
    console.log('🛑 Stopping all Docker containers...');
    
    try {
      // Stop all running containers
      execSync('docker stop $(docker ps -aq) 2>/dev/null || true', { stdio: 'pipe' });
      
      // Remove stopped containers
      execSync('docker rm $(docker ps -aq) 2>/dev/null || true', { stdio: 'pipe' });
      
      console.log('✅ All containers stopped and removed');
    } catch (error) {
      // Ignore errors - containers might not exist
      console.log('ℹ️  No containers to stop');
    }
  }

  /**
   * Clean up Docker resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up Docker resources...');
    
    try {
      // Clean up networks, volumes, and build cache
      execSync('docker system prune -f --volumes', { stdio: 'pipe' });
      console.log('✅ Docker cleanup completed');
    } catch (error) {
      console.warn('⚠️  Docker cleanup had issues:', error.message);
    }
  }

  /**
   * Start Docker Compose services
   */
  async startDockerCompose() {
    console.log('🚀 Starting Docker Compose services...');
    
    const composeFile = TEST_CONFIG.docker.composeFile;
    const projectName = TEST_CONFIG.docker.projectName;
    
    if (!fs.existsSync(composeFile)) {
      throw new Error(`Docker Compose file not found: ${composeFile}`);
    }
    
    try {
      // Start services with build
      const cmd = `docker compose -f ${composeFile} -p ${projectName} up -d --build --force-recreate`;
      execSync(cmd, { stdio: 'inherit', cwd: path.dirname(composeFile) });
      
      // Wait for startup delay
      await this.sleep(TEST_CONFIG.docker.startupDelay);
      
      console.log('✅ Docker Compose services started');
    } catch (error) {
      throw new Error(`Failed to start Docker Compose: ${error.message}`);
    }
  }

  /**
   * Wait for all services to be healthy
   */
  async waitForHealthy() {
    console.log('🏥 Waiting for services to be healthy...');
    
    const timeout = TEST_CONFIG.docker.healthCheckTimeout;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const healthy = await this.checkAllServicesHealthy();
        if (healthy) {
          console.log('✅ All services are healthy');
          return true;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await this.sleep(5000); // Check every 5 seconds
      process.stdout.write('.');
    }
    
    throw new Error('Services failed to become healthy within timeout');
  }

  /**
   * Check if all services are healthy
   */
  async checkAllServicesHealthy() {
    const services = TEST_CONFIG.docker.services;
    const projectName = TEST_CONFIG.docker.projectName;
    
    try {
      // Check Docker container health
      const cmd = `docker compose -p ${projectName} ps --format json`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const containers = output.trim().split('\n').map(line => JSON.parse(line));
      
      for (const container of containers) {
        if (container.Health && container.Health !== 'healthy') {
          return false;
        }
        if (container.State !== 'running') {
          return false;
        }
      }
      
      // Additional HTTP health checks
      const healthChecks = [
        { name: 'API', url: `${TEST_CONFIG.endpoints.api.baseUrl}${TEST_CONFIG.endpoints.api.healthEndpoint}` },
        { name: 'Web', url: `${TEST_CONFIG.endpoints.web.baseUrl}${TEST_CONFIG.endpoints.web.healthEndpoint}` },
        { name: 'Nginx', url: `${TEST_CONFIG.endpoints.nginx.baseUrl}${TEST_CONFIG.endpoints.nginx.healthEndpoint}` },
      ];
      
      for (const check of healthChecks) {
        try {
          await axios.get(check.url, { timeout: 5000 });
        } catch (error) {
          console.log(`\n⚠️  ${check.name} health check failed`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(serviceName) {
    const projectName = TEST_CONFIG.docker.projectName;
    
    try {
      const cmd = `docker compose -p ${projectName} logs ${serviceName}`;
      const output = execSync(cmd, { encoding: 'utf8' });
      return output;
    } catch (error) {
      return `Error getting logs: ${error.message}`;
    }
  }

  /**
   * Execute command in container
   */
  async execInContainer(serviceName, command) {
    const projectName = TEST_CONFIG.docker.projectName;
    
    try {
      const cmd = `docker compose -p ${projectName} exec -T ${serviceName} ${command}`;
      const output = execSync(cmd, { encoding: 'utf8' });
      return output;
    } catch (error) {
      throw new Error(`Command failed in ${serviceName}: ${error.message}`);
    }
  }

  /**
   * Get container stats
   */
  async getContainerStats() {
    const projectName = TEST_CONFIG.docker.projectName;
    
    try {
      const cmd = `docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}" $(docker compose -p ${projectName} ps -q)`;
      const output = execSync(cmd, { encoding: 'utf8' });
      return output;
    } catch (error) {
      return `Error getting stats: ${error.message}`;
    }
  }

  /**
   * Stop the Docker environment
   */
  async stopEnvironment() {
    if (!this.isRunning) {
      return;
    }
    
    console.log('🛑 Stopping Docker environment...');
    
    const projectName = TEST_CONFIG.docker.projectName;
    
    try {
      execSync(`docker compose -p ${projectName} down -v`, { stdio: 'inherit' });
      this.isRunning = false;
      console.log('✅ Docker environment stopped');
    } catch (error) {
      console.error('❌ Error stopping Docker environment:', error.message);
    }
  }

  /**
   * Utility method to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DockerManager;