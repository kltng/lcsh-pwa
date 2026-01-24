"use client";

import { useState, useEffect } from "react";
import { useAppStore, type ApiKey } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { getProviders, getModelsByProvider, type ExtendedProviderInfo, type ExtendedModelInfo } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const {
    provider,
    modelId,
    apiKeys,
    systemPromptRules,
    setProvider,
    setModelId,
    setSystemPromptRules,
    resetSystemPromptRules,
    addApiKey,
    removeApiKey,
    setDefaultApiKey,
    getApiKeyForProvider,
  } = useAppStore();

  const [providers, setProviders] = useState<ExtendedProviderInfo[]>([]);
  const [models, setModels] = useState<ExtendedModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [providerApiKeys, setProviderApiKeys] = useState<ApiKey[]>([]);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      loadProviders();
    }
  }, []);

  useEffect(() => {
    if (provider) {
      loadModels(provider);
      // Load API keys for this provider
      const keys = apiKeys.filter((k) => k.provider === provider);
      setProviderApiKeys(keys);
    } else {
      setModels([]);
      setModelId(null);
      setProviderApiKeys([]);
    }
  }, [provider, apiKeys]);

  async function loadProviders() {
    try {
      setLoading(true);
      setError(null);
      const providerList = await getProviders();
      setProviders(providerList);
      if (providerList.length === 0) {
        setError("No providers found. Please check your internet connection.");
      }
    } catch (error) {
      console.error("Error loading providers:", error);
      setError(error instanceof Error ? error.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  async function loadModels(providerId: string) {
    try {
      setLoadingModels(true);
      setError(null);
      const modelList = await getModelsByProvider(providerId);
      setModels(modelList);
      if (modelList.length === 0) {
        setError("No models found for this provider.");
      }
    } catch (error) {
      console.error("Error loading models:", error);
      setError(error instanceof Error ? error.message : "Failed to load models");
    } finally {
      setLoadingModels(false);
    }
  }

  function handleAddKey() {
    if (!provider || !newApiKey.trim()) return;

    addApiKey({
      provider,
      key: newApiKey.trim(),
      label: newKeyLabel.trim() || undefined,
    });

    setNewApiKey("");
    setNewKeyLabel("");
    const keys = useAppStore.getState().apiKeys.filter((k) => k.provider === provider);
    setProviderApiKeys(keys);
  }

  function handleRemoveKey(keyId: string) {
    removeApiKey(keyId);
    const keys = useAppStore.getState().apiKeys.filter((k) => k.provider === provider);
    setProviderApiKeys(keys);
  }

  function handleSetDefault(keyId: string) {
    setDefaultApiKey(keyId);
    const keys = useAppStore.getState().apiKeys.filter((k) => k.provider === provider);
    setProviderApiKeys(keys);
  }

  async function testConnection() {
    if (!provider || !modelId) {
      setTestResult({
        success: false,
        message: "Please select a provider and model",
      });
      return;
    }

    // Use API key from apiKeys array only (legacy apiKey removed from UI)
    const testApiKey = getApiKeyForProvider(provider);

    if (!testApiKey && provider !== "lmstudio") {
      setTestResult({
        success: false,
        message: "Please add an API key for this provider (optional for LM Studio)",
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      console.log("Testing connection with:", { provider, modelId });

      // Simple connection test - just verify API key and model work
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId,
          provider,
          apiKey: testApiKey,
          apiKeys: apiKeys.filter((k) => k.provider === provider),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      console.log("Test connection successful:", data);

      setTestResult({
        success: true,
        message: "Connection successful! Your API key and model are working correctly.",
      });
    } catch (error) {
      console.error("Test connection failed:", error);
      let errorMessage = "Connection failed. Please check your API key and model selection.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // Provide more helpful error messages
        if (error.message.includes("not found")) {
          errorMessage = `Model not found: ${modelId}. Please select a different model.`;
        } else if (error.message.includes("401") || error.message.includes("Invalid API key")) {
          errorMessage = "Invalid API key. Please check your API key and try again.";
        } else if (error.message.includes("403") || error.message.includes("permission")) {
          errorMessage = "API key does not have permission to access this model.";
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
          errorMessage = "Rate limit exceeded. Please try again later.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection.";
        }
      }

      setTestResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your AI model provider and model for LCSH recommendations
        </p>
      </div>

      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AI Model Configuration</CardTitle>
            <CardDescription>
              Select your preferred AI model provider and model. Your API key is stored locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={provider || ""}
                onValueChange={(value) => {
                  setProvider(value);
                  setModelId(null);
                }}
                disabled={loading}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder={loading ? "Loading providers..." : "Select a provider"} />
                </SelectTrigger>
                <SelectContent>
                  {providers.length === 0 && !loading && (
                    <SelectItem value="none" disabled>No providers available</SelectItem>
                  )}
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading providers...
                </p>
              )}
            </div>

            {provider && (
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select
                  value={modelId || ""}
                  onValueChange={setModelId}
                  disabled={loadingModels || !provider}
                >
                  <SelectTrigger id="model">
                    <SelectValue placeholder={loadingModels ? "Loading models..." : "Select a model"} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.length === 0 && !loadingModels && (
                      <SelectItem value="none" disabled>No models available</SelectItem>
                    )}
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingModels && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading models...
                  </p>
                )}
              </div>
            )}

            {provider && (
              <Card>
                <CardHeader>
                  <CardTitle>API Keys for {providers.find((p) => p.id === provider)?.name}</CardTitle>
                  <CardDescription>
                    Manage multiple API keys for this provider. The default key will be used automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new key form */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter API key"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      type="password"
                      className="flex-1"
                    />
                    <Input
                      placeholder="Label (optional)"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddKey} disabled={!newApiKey.trim()}>
                      Add
                    </Button>
                  </div>

                  {/* List existing keys */}
                  {providerApiKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No API keys added yet. Add one above to get started.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {providerApiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center gap-2 p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {key.label || `Key ${key.id.slice(-4)}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {key.key.slice(0, 8)}...{key.key.slice(-4)}
                            </div>
                          </div>
                          {key.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          {!key.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(key.id)}
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveKey(key.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Button onClick={testConnection} disabled={testing || !provider || !modelId || (!getApiKeyForProvider(provider) && provider !== "lmstudio")}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              Customize the instructions given to the AI model for generating LCSH recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt Rules</Label>
              <Textarea
                id="systemPrompt"
                value={systemPromptRules}
                onChange={(e) => setSystemPromptRules(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
            <Button variant="outline" onClick={resetSystemPromptRules}>
              Reset to Default
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
