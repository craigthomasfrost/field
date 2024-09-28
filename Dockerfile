FROM node:22.9.0-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .
