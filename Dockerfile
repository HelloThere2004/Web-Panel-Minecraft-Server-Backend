FROM node:24-alpine

# Set the working directory inside the container
WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

# Expose the port that your application will run on
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
