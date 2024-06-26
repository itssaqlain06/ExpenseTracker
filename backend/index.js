import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv'
import path from 'path';
import passport from 'passport';
import session from 'express-session'; //Allow us to create session
import ConnectMongo from 'connect-mongodb-session'; //Allow us to store session in mongodb account

import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
//ApolloServerPluginDrainHttpServer is a plugin for Apollo Server that ensures all in-flight HTTP requests are allowed to complete before shutting down the server

import { buildContext } from 'graphql-passport';
import { ApolloServer } from "@apollo/server";

import mergeTypeDefs from "./typeDefs/index.js";
import mergedResolvers from "./resolvers/index.js";
import { connectDB } from './db/connectDB.js';
import { configPassport } from './passport/passport.config.js';

dotenv.config();
configPassport();

const app = express();

const __dirname = path.resolve(); // root level location

const httpServer = http.createServer(app);

const mongoDBStore = ConnectMongo(session)

const store = new mongoDBStore({
    uri: process.env.MONGO_URI,
    collection: 'sessions'
})
store.on("error", (err) => console.log(err))

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false, //This option specifie whether to save the session to the store on each request
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, //Expires in 7 days
            httpOnly: true //When httpOnly is set to true, the cookie cannot be accessed via client-side scripts such as JavaScript.
        },
        store: store //The `store: store` configuration in the `session` middleware assigns a session store instance to manage the persistence of session data in Express.js.
    })
)

app.use(passport.initialize())
app.use(passport.session());

const server = new ApolloServer({
    typeDefs: mergeTypeDefs,
    resolvers: mergedResolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
})

await server.start();

app.use(
    '/graphql',
    cors({
        origin: 'http://localhost:3000',
        credentials: true,//This mean we could send cookies alongside the request
    }),
    express.json(),
    expressMiddleware(server, {
        context: async ({ req, res }) => buildContext({ req, res }), //Context is an object that shared across all the resolvers
    }),
);

app.use(express.static(path.join(__dirname, "frontend/dist")))

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dist", "index.html"))
})

// Modified server startup
await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
await connectDB();

console.log(`🚀 Server ready at http://localhost:4000/`);