# NestJS Applied: Authentication Masterclass

This course is structured directly from the architectural patterns and concepts applied in your `nest_auth` project. Each module focuses on a core NestJS concept and examines how it was implemented in your codebase to provide a practical learning experience.

## Module 1: The NestJS Foundation & Configuration
**Concept:** Application Bootstrap, Modules (`@Module`), and Global Configuration
* **App Bootstrap:** Explore `main.ts` to understand how `NestFactory.create()` initializes the app, enables CORS, and registers global middlewares like `cookie-parser`.
* **Root Module:** Analyze `AppModule` to see how feature modules (`AuthModule`, `UsersModule`, `DatabaseModule`) are wired together.
* **Configuration:** Study `@nestjs/config` usage in `AppModule` (`ConfigModule.forRoot`) and how `ConfigService` is injected to securely access environment variables like `PORT` and `FRONTEND_URL`.

## Module 2: Controllers & Request Handling
**Concept:** Controllers (`@Controller`), HTTP Decorators, and the Request/Response Object
* **Routing:** Examine `AuthController` to see how `@Controller('auth')` sets up the base route.
* **HTTP Methods:** Look at `@Post()`, `@Get()`, and `@HttpCode(HttpStatus.*)` for precise endpoint definitions.
* **Underlying Platform:** Understand when and why to use the underlying Express `Request` and `Response` objects (`@Req()`, `@Res()`) for low-level operations like setting cookies (`res.cookie`) and redirects (`res.redirect`) in the OAuth flow.

## Module 3: Data Validation & DTOs
**Concept:** Pipes (`ValidationPipe`) and Data Transfer Objects
* **Global Validation:** Check `main.ts` where `app.useGlobalPipes(new ValidationPipe({ whitelist: true }))` is applied to automatically strip out unwanted payload properties.
* **DTO Definition:** Analyze `RegisterDto` and `LoginDto` in the `src/auth/dto` folder. See how `class-validator` decorators like `@IsEmail()`, `@IsString()`, and `@MinLength()` enforce payload integrity before the data ever reaches your controller.

## Module 4: Services & Dependency Injection
**Concept:** Providers (`@Injectable`) and Inversion of Control
* **Business Logic Encapsulation:** Dive into `AuthService`, `GoogleAuthService`, and `GithubAuthService` to see how complex logic (like JWT signing and OAuth handshakes) is kept out of controllers.
* **Constructor Injection:** See how dependencies like `ConfigService` or `GoogleAuthService` are injected into `AuthController` and other services seamlessly by the NestJS IoC container.

## Module 5: Security & Route Protection
**Concept:** Guards (`CanActivate`)
* **Custom Guards:** Review `AccessTokenGuard` in `src/auth/guards`. Learn how it implements the `CanActivate` interface to intercept incoming requests, extract the JWT token, verify it, and attach the decoded payload to the request object.
* **Applying Guards:** See how `@UseGuards(AccessTokenGuard)` is used in `AuthController` to protect endpoints like `/auth/logout` and `/auth/me`.

## Module 6: Context Extraction
**Concept:** Custom Decorators (`createParamDecorator`)
* **Parameter Decorators:** Explore `CurrentUser` in `src/auth/decorators`. Understand how `createParamDecorator` allows you to elegantly extract the `user` payload from the Express request object.
* **Cleaner Controllers:** See the benefit in `AuthController`'s `getProfile` method, where you can simply use `@CurrentUser() user: JwtPayload` instead of manually digging through the `@Req()` object.

## Module 7: Advanced Modules & Third-Party Integration
**Concept:** Feature Modules and Integration
* **Feature Encapsulation:** Study `AuthModule` to understand how it encapsulates its own controllers, services, and exports.
* **OAuth Architecture:** Trace the complete Google and GitHub OAuth flows. Understand how NestJS coordinates state generation, redirection, and callback handling between the controllers and dedicated OAuth services.
