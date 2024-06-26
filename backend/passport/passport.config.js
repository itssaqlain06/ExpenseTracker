import passport from "passport"
import bcrypt from "bcryptjs"

import User from "../models/user.model.js"
import { GraphQLLocalStrategy } from 'graphql-passport';

export const configPassport = async () => {
    //SerializeUser function is called when a user successfully logs in, It's responsible for determining what user data should be stored in the session
    passport.serializeUser((User, done) => {
        console.log("Serializing the user!")
        done(null, User._id)
    });

    //The deserializeUser function is called after serialization request. It's responsible for retrieving the full user object from the database based on the user ID stored in the session.
    passport.deserializeUser(async (id, done) => {
        console.log("Deserializing the user!")
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    })

    //It is used for authenticating users in a GraphQL environment, It's used in your GraphQL resolver or middleware to handle authentication for login requests.
    passport.use(
        new GraphQLLocalStrategy(async (username, password, done) => {
            try {
                const user = await User.findOne({ username });
                if (!user) {
                    throw new Error("Invalid username or password")
                }
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    throw new Error("Invalid username or password")
                }
                return done(null, user)
            } catch (error) {
                done(error)
            }
        })
    )
}
// This script will execute when we send login or sign up request