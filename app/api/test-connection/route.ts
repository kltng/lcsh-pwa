import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getModelsByProvider, getModelSDKConfig, type ExtendedModelInfo } from "@/lib/models";
import { getProviderHardcodedBaseURL, LOCAL_PROVIDERS } from "@/lib/provider-groups";

// Local providers that serve dynamic models - don't validate against registry
const LOCAL_PROVIDER_IDS = LOCAL_PROVIDERS.map(p => p.id);

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

    // Check if this is a local provider (lmstudio, ollama)
    const isLocalProvider = LOCAL_PROVIDER_IDS.includes(provider);

    let modelInfo: ExtendedModelInfo | null = null;

    if (isLocalProvider) {
      // For local providers, create a synthetic modelInfo using the provided modelId
      // Local providers serve dynamic models that aren't in our registry
      const hardcodedBaseURL = getProviderHardcodedBaseURL(provider);
      modelInfo = {
        id: modelId,
        name: modelId,
        provider: provider,
        providerName: provider === 'lmstudio' ? 'LM Studio' : 'Ollama',
        baseURL: hardcodedBaseURL || baseURL,
      };
    } else {
      // For cloud providers, validate model exists in registry
      const providerModels = await getModelsByProvider(provider);
      modelInfo = providerModels.find((m) => m.id === modelId) || null;

      if (!modelInfo) {
        return NextResponse.json(
          { error: `Model ${modelId} not found for provider ${provider}` },
          { status: 404 }
        );
      }
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

    // Determine SDK configuration
    let sdkProvider: "openai" | "google" | "anthropic" | "openai-compatible";
    let modelName: string;
    let effectiveBaseURL: string;

    if (isLocalProvider) {
      // Local providers always use OpenAI-compatible SDK with their base URL
      sdkProvider = "openai-compatible";
      modelName = modelId;
      const hardcodedBaseURL = getProviderHardcodedBaseURL(provider);
      effectiveBaseURL = baseURL || hardcodedBaseURL || "";
    } else {
      // Cloud providers use SDK config from registry
      const sdkConfig = getModelSDKConfig(modelInfo!);
      sdkProvider = sdkConfig.provider;
      modelName = sdkConfig.modelId;
      const hardcodedBaseURL = getProviderHardcodedBaseURL(provider);
      effectiveBaseURL = baseURL || hardcodedBaseURL || sdkConfig.baseURL || "";
    }

    let model: any;
    if (sdkProvider === "openai") {
      const openaiClient = createOpenAI({ apiKey: finalApiKey });
      model = openaiClient(modelName);
    } else if (sdkProvider === "google") {
      const googleClient = createGoogleGenerativeAI({ apiKey: finalApiKey });
      model = googleClient(modelName);
    } else if (sdkProvider === "anthropic") {
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
