// env.d.ts

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    CUSTOMER: string;
    PRODUCT: string;
    URL: string;
    TOKEN_URL: string;
    EMAIL_RECEIVER: string | undefined;
    EMAIL_PASSWORD: string | undefined;
    EMAIL_USER: string | undefined;
  }
}
