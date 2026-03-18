FROM node:18-alpine

WORKDIR /app

# 优先复制依赖声明以利用缓存
COPY package*.json ./
RUN npm install --production

# 复制剩余源代码
COPY . .

# 暴露服务端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
