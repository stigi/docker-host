FROM node:lts-alpine3.18
WORKDIR /usr/app
COPY package.json .
RUN npm install --quiet
COPY . .
