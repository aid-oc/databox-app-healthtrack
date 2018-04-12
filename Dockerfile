FROM node:alpine

RUN apk add --update make gcc g++ python curl git krb5-dev zeromq-dev && \
npm install zeromq --zmq-external --save && \
apk del make gcc g++ python curl git krb5-dev

ADD . .
RUN npm install
RUN npm install -g mocha@2.3.1

LABEL databox.type="app"

EXPOSE 8080

CMD ["npm","start"]