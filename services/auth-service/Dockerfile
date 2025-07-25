FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get upgrade -y && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install


COPY . .
COPY ./src/keys/public.pem ./src/keys/

EXPOSE 3001
CMD ["npm", "start"]
