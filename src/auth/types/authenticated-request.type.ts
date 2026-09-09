import { Request } from "express";
import { JwtPayload } from "./jwt-payload.type.js";


export type AuthenticatedRequest = Request & {
    user: JwtPayload
}