FROM node:10

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8001
CMD [ "make", "build" ]
