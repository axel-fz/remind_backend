import { Global, Module } from "@nestjs/common";
import { DRIZZLE_CLIENT } from "./database.types.js";
import { databaseProvider } from "./database.provider.js";


@Global()
@Module ({
    providers: [databaseProvider],
    exports: [DRIZZLE_CLIENT]
})

export class DatabaseModule {}