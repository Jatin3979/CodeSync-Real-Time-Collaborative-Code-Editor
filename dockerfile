from node:20-alpine

copy ./backend .

run npm install

CMD ["node", "index.js"]