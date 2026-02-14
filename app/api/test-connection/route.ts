import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getModelsByProvider, getModelSDKConfig } from "@/lib/models";
import { getProviderHardcodedBaseURL, getProviderGroup } from "@/lib/provider-groups";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modelId,
      apiKey,
      apiKeys,
      providerKeyId,
      provider,
      baseURL,
    } = body;

    if (!modelId || !provider) {
      return NextResponse.json(
        { error: "modelId and provider are required" },
        { status: 400 }
      );
    }

    // Get model info
    const providerModels = await getModelsByProvider(provider);
    const modelInfo = providerModels.find((m) => m.id === modelId);

    if (!modelInfo) {
      return NextResponse.json(
        { error: `Model ${modelId} not found for provider ${provider}` },
        { status: 404 }
      );
    }

    // Get API key for provider
    let finalApiKey: string = "";

    // Server-side: check env var first
    if (typeof window === "undefined") {
      if (modelInfo.apiKeyEnv) {
        const envVarName = modelInfo.apiKeyEnv.toUpperCase();
        if (process.env[envVarName]) {
          finalApiKey = process.env[envVarName]!;
        }
      }
    }

    // If no env var, try apiKeys array
    if (!finalApiKey && Array.isArray(apiKeys)) {
      const key = apiKeys.find((k: any) =>
        providerKeyId
          ? k.id === providerKeyId
          : k.provider === provider && k.isDefault
      );
      if (key) {
        finalApiKey = key.key;
      }
    }

    // Fallback to deprecated apiKey
    if (!finalApiKey && apiKey) {
      finalApiKey = apiKey;
    }

    const requiresApiKey = provider !== "lmstudio" && provider !== "ollama";
    if (!finalApiKey && requiresApiKey) {
      return NextResponse.json(
        {
          error: `No API key found for provider ${provider}. Please add one in Settings.`,
        },
        { status: 400 }
      );
    }

    const sdkConfig = getModelSDKConfig(modelInfo);
    const modelName = sdkConfig.modelId;

    const providerGroup = getProviderGroup(provider);
    const hardcodedBaseURL = getProviderHardcodedBaseURL(provider);
    const effectiveBaseURL = baseURL || hardcodedBaseURL || sdkConfig.baseURL || "";

    let model: any;
    if (sdkConfig.provider === "openai") {
      const openaiClient = createOpenAI({ apiKey: finalApiKey });
      model = openaiClient(modelName);
    } else if (sdkConfig.provider === "google") {
      const googleClient = createGoogleGenerativeAI({ apiKey: finalApiKey });
      model = googleClient(modelName);
    } else if (sdkConfig.provider === "anthropic") {
      const anthropicClient = createAnthropic({ apiKey: finalApiKey });
      model = anthropicClient(modelName);
    } else {
      const openaiCompatible = createOpenAICompatible({
        name: provider,
        baseURL: effectiveBaseURL,
        apiKey: finalApiKey || "dummy",
      });
      model = openaiCompatible(modelName);
    }

    // Simple test: just ask the model to say "OK"
    const result = await generateText({
      model,
      prompt: "Say 'OK' if you can read this.",
      maxTokens: 10,
      temperature: 0,
    } as any);

    return NextResponse.json({
      success: true,
      message: "Connection successful!",
      response: result.text,
    });
  } catch (error) {
    console.error("Connection test failed:", error);

    let errorMessage = "Connection failed";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes("not found") || error.message.includes("404")) {
        statusCode = 404;
      } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        statusCode = 401;
        errorMessage = "Invalid API key";
      } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
        statusCode = 403;
        errorMessage = "API key does not have permission";
      } else if (error.message.includes("429") || error.message.includes("rate limit")) {
        statusCode = 429;
        errorMessage = "Rate limit exceeded";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        statusCode = 503;
        errorMessage = "Network error";
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
