# TechPacker API - Deployment Guide

Hướng dẫn triển khai hoàn chỉnh cho TechPacker API trong môi trường production.

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- Redis 6.0+
- Nginx (reverse proxy)
- SSL Certificate
- PM2 (process manager)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Redis
sudo apt install redis-server -y
```

### 2. Application Deployment

```bash
# Clone repository
git clone <your-repo-url> /var/www/techpacker-api
cd /var/www/techpacker-api/server

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Create production environment file
cp .env.example .env.production
```

### 3. Environment Configuration

```bash
# Edit production environment
nano .env.production
```

```env
# Production Environment Variables
NODE_ENV=production
PORT=4001

# Database
MONGO_URI=mongodb://localhost:27017/techpacker_prod

# JWT (Generate secure secret)
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=warn
```

### 4. PM2 Configuration

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'techpacker-api',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4001
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 5. Nginx Configuration

```bash
# Create Nginx site configuration
sudo nano /etc/nginx/sites-available/techpacker-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy Configuration
    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### 6. MongoDB Security

```bash
# Enable MongoDB authentication
sudo nano /etc/mongod.conf
```

```yaml
# Add to mongod.conf
security:
  authorization: enabled

net:
  bindIp: 127.0.0.1
  port: 27017
```

```bash
# Create MongoDB admin user
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "secure_password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create application user
use techpacker_prod
db.createUser({
  user: "techpacker_user",
  pwd: "app_secure_password",
  roles: ["readWrite"]
})
```

### 7. Redis Security

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf
```

```conf
# Bind to localhost only
bind 127.0.0.1

# Set password
requirepass your_redis_password

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
```

### 8. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 4001  # Block direct access to Node.js
sudo ufw deny 27017  # Block direct access to MongoDB
sudo ufw deny 6379   # Block direct access to Redis
```

### 9. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 10. Start Services

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/techpacker-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🔍 Monitoring & Maintenance

### Log Management

```bash
# Create log rotation
sudo nano /etc/logrotate.d/techpacker-api
```

```conf
/var/www/techpacker-api/server/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload techpacker-api
    endscript
}
```

### Health Monitoring

```bash
# PM2 monitoring
pm2 monitor

# System monitoring script
nano /usr/local/bin/health-check.sh
```

```bash
#!/bin/bash
# Health check script

API_URL="https://api.yourdomain.com/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "API health check failed: $RESPONSE"
    pm2 restart techpacker-api
    # Send alert (email, Slack, etc.)
fi
```

### Backup Strategy

```bash
# MongoDB backup script
nano /usr/local/bin/backup-mongodb.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --host localhost --port 27017 --db techpacker_prod --out $BACKUP_DIR/backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

### Performance Optimization

```bash
# MongoDB indexes (run in mongo shell)
use techpacker_prod

# User indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })

# TechPack indexes
db.techpacks.createIndex({ "articleCode": 1 }, { unique: true })
db.techpacks.createIndex({ "designer": 1, "createdAt": -1 })
db.techpacks.createIndex({ "status": 1, "updatedAt": -1 })
db.techpacks.createIndex({ "season": 1, "brand": 1 })

# Activity indexes
db.activities.createIndex({ "userId": 1, "timestamp": -1 })
db.activities.createIndex({ "target.type": 1, "target.id": 1, "timestamp": -1 })
```

## 🚨 Security Checklist

- [ ] Strong JWT secret (256+ bits)
- [ ] MongoDB authentication enabled
- [ ] Redis password protection
- [ ] Firewall configured
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Regular security updates
- [ ] Log monitoring setup
- [ ] Backup strategy implemented

## 📊 Scaling Considerations

### Horizontal Scaling

```bash
# Load balancer configuration (Nginx)
upstream techpacker_backend {
    server 127.0.0.1:4001;
    server 127.0.0.1:4002;
    server 127.0.0.1:4003;
}

server {
    location / {
        proxy_pass http://techpacker_backend;
    }
}
```

### Database Scaling

```bash
# MongoDB replica set configuration
# Primary server
rs.initiate({
  _id: "techpacker-rs",
  members: [
    { _id: 0, host: "mongo1.example.com:27017" },
    { _id: 1, host: "mongo2.example.com:27017" },
    { _id: 2, host: "mongo3.example.com:27017" }
  ]
})
```

### Redis Clustering

```bash
# Redis cluster setup
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

## 🔧 Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=2048 dist/index.js
   ```

2. **MongoDB Connection Issues**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   # Check logs
   sudo tail -f /var/log/mongodb/mongod.log
   ```

3. **Redis Connection Issues**
   ```bash
   # Test Redis connection
   redis-cli ping
   # Check Redis logs
   sudo tail -f /var/log/redis/redis-server.log
   ```

### Performance Monitoring

```bash
# Install monitoring tools
npm install -g clinic
npm install -g autocannon

# Performance profiling
clinic doctor -- node dist/index.js
clinic flame -- node dist/index.js

# Load testing
autocannon -c 100 -d 30 https://api.yourdomain.com/health
```

---

**🎉 Deployment Complete!**

Your TechPacker API is now running in production with enterprise-grade security, monitoring, and scalability features.
