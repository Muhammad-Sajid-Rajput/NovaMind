// NovaMind — backend/core/config/swagger.js — Phase 3
// Swagger OpenAPI 3.0 document specification mapping all NovaMind API endpoints.

export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title:       "NovaMind AI API",
    version:     "1.0.0",
    description: "Production-ready, interactive Swagger API documentation for NovaMind AI chatbot platform.",
  },
  servers: [
    {
      url:         "http://localhost:5000/api",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type:         "http",
        scheme:       "bearer",
        bearerFormat: "JWT",
        description:  "Enter your JWT access token (returned after email verification or login) to authorize requests.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id:    { type: "string", example: "64a0f443b7470fcf147d3c52" },
          email: { type: "string", example: "user@novamind.com" },
          name:  { type: "string", example: "Verified NovaMind User" },
        },
      },
      Session: {
        type: "object",
        properties: {
          _id:       { type: "string", example: "66ae5b1c-c760-496a-a63e-f633f81e3a6c" },
          name:      { type: "string", example: "JavaScript Basics" },
          createdAt: { type: "string", example: "2026-07-04T12:00:00.000Z" },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new unverified user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email:    { type: "string", example: "newuser@example.com" },
                  password: { type: "string", example: "SecurePassword123" },
                  name:     { type: "string", example: "John Doe" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Account created. A 6-digit OTP has been sent via email.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    email:   { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid input or weak password." },
          409: { description: "Account already exists." },
        },
      },
    },
    "/auth/verify-email": {
      post: {
        summary: "Verify email with 6-digit OTP code",
        description: "Returns access token and sets long-lived refresh token in an HTTP-only cookie.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "code"],
                properties: {
                  email: { type: "string", example: "newuser@example.com" },
                  code:  { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Email verified successfully.",
            headers: {
              "Set-Cookie": {
                schema: { type: "string", example: "refreshToken=...; HttpOnly; Secure" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    user:        { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid or expired OTP." },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "User login",
        description: "Logs in a verified user. Returns access token and sets refresh token in an HTTP-only cookie.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email:    { type: "string", example: "verified@novamind.com" },
                  password: { type: "string", example: "Password123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Logged in successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    user:        { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: { description: "Invalid credentials." },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "User logout",
        description: "Clears user session and deletes the HTTP-only refresh token cookie.",
        tags: ["Authentication"],
        responses: {
          200: { description: "Logged out successfully." },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Silent access token renewal",
        description: "Reads refresh token from HTTP-only cookie and returns a fresh short-lived access token.",
        tags: ["Authentication"],
        responses: {
          200: {
            description: "Token refreshed.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Missing, expired, or invalid refresh token." },
        },
      },
    },
    "/sessions": {
      get: {
        summary: "List all chat sessions",
        tags: ["Sessions"],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "List of sessions retrieved.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Session" },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthenticated." },
        },
      },
      post: {
        summary: "Create a new chat session",
        tags: ["Sessions"],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Session created.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessionId: { type: "string", example: "66ae5b1c-c760-496a-a63e-f633f81e3a6c" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthenticated." },
        },
      },
    },
    "/sessions/{id}": {
      put: {
        summary: "Rename a session",
        tags: ["Sessions"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name:        "id",
            in:          "path",
            required:    true,
            schema:      { type: "string" },
            description: "Session ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "New Session Title" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Session renamed." },
          404: { description: "Session not found." },
        },
      },
      delete: {
        summary: "Delete a session",
        description: "Deletes the session and cascade-deletes all associated messages.",
        tags: ["Sessions"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name:        "id",
            in:          "path",
            required:    true,
            schema:      { type: "string" },
            description: "Session ID",
          },
        ],
        responses: {
          200: { description: "Session deleted." },
          404: { description: "Session not found." },
        },
      },
    },
    "/chat": {
      post: {
        summary: "Send message (Non-streaming / backup fallback)",
        tags: ["Chat"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message", "sessionId"],
                properties: {
                  message:   { type: "string", example: "Explain closures in JS" },
                  sessionId: { type: "string", example: "66ae5b1c-c760-496a-a63e-f633f81e3a6c" },
                  model:     { type: "string", example: "gemini-2.5-flash" },
                  language:  { type: "string", example: "English" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "AI response returned.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reply:       { type: "string" },
                    model:       { type: "string" },
                    sessionName: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/chat/vision": {
      post: {
        summary: "Send image analysis request (Vision)",
        description: "Accepts pre-uploaded Cloudinary secure URLs and forwards to Gemini Vision.",
        tags: ["Chat"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message", "sessionId", "imageUrl"],
                properties: {
                  message:   { type: "string", example: "Describe what is in this image" },
                  sessionId: { type: "string", example: "66ae5b1c-c760-496a-a63e-f633f81e3a6c" },
                  imageUrl:  { type: "string", example: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
                  model:     { type: "string", example: "gemini-2.5-flash" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Vision analysis returned.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reply:       { type: "string" },
                    model:       { type: "string" },
                    sessionName: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          400: { description: "Missing message or image URL." },
        },
      },
    },
    "/upload/signature": {
      get: {
        summary: "Get signed upload parameters for Cloudinary direct client uploads",
        tags: ["Uploads"],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Signature generated.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    signature: { type: "string" },
                    timestamp: { type: "integer" },
                    folder:    { type: "string" },
                    apiKey:    { type: "string" },
                    cloudName: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
