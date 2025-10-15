const { exec, spawn } = require('child_process');
const net = require('net');

const TARGET_PORT = 4001;

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false); // Port is free
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
}

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    // Try to find and kill process using the port
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve();
        return;
      }
      
      const lines = stdout.split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parts[4];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
      });
      
      if (pids.size === 0) {
        resolve();
        return;
      }
      
      console.log(`Found processes using port ${port}:`, Array.from(pids));
      
      let killed = 0;
      pids.forEach(pid => {
        exec(`taskkill /F /PID ${pid}`, (killError) => {
          killed++;
          if (killed === pids.size) {
            console.log(`Killed ${killed} process(es) using port ${port}`);
            setTimeout(resolve, 1000); // Wait a bit for cleanup
          }
        });
      });
    });
  });
}

async function startServer() {
  console.log(`Starting TechPacker API server on port ${TARGET_PORT}...`);
  
  // Check if port is in use
  const portInUse = await checkPortInUse(TARGET_PORT);
  
  if (portInUse) {
    console.log(`Port ${TARGET_PORT} is in use. Attempting to free it...`);
    await killProcessOnPort(TARGET_PORT);
    
    // Check again after killing processes
    const stillInUse = await checkPortInUse(TARGET_PORT);
    if (stillInUse) {
      console.error(`Unable to free port ${TARGET_PORT}. Please manually stop any processes using this port.`);
      process.exit(1);
    }
  }
  
  console.log(`Port ${TARGET_PORT} is now available. Starting server...`);
  
  // Start the development server
  const serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    serverProcess.kill('SIGTERM');
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
